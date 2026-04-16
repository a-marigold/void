import { parseSync } from 'oxc-parser';
import type {
    Node,
    IdentifierName as Identifier,
    VariableDeclarator,
    ArrowFunctionExpression,
    MemberExpression,
    Expression,
} from 'oxc-parser';

import { traverse, SKIP } from 'polyast';

import * as nodes from './nodes';

import { TraceMap } from '@jridgewell/trace-mapping';
import type { TransformResult, ErrorContext, Scope, VisitedReactives } from './types';
import { oxcParserOptions, ScopeIdType, MEMBER_EXPRESSION_PROPERTY_KEY } from './constants';

import type { PreprocessResult, LabelType } from '../preprocessor';

import { compileErrors, getLineIndexes } from '../../errors';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    createReactiveReading,
    createSignalAssignment,
    createSignalUpdate,
    unwrapUpdateExpression,
    findInScopes,
    addPatternToScope,
    replaceNode,
    createNodeCompileError,
} from './utils';

/**
 *
 * #### Parses preprocessed code via `@babel/parser` and transforms signals, effects, computations and components to `void-js` runtime API functions.
 *
 * @param preprocessed Result of preprocessor.
 *
 * @returns Transformed `ast` argument.
 */

export const transform = (preprocessed: PreprocessResult): TransformResult => {
    const errors = preprocessed.errors;

    const labels = preprocessed.labels;

    const runtimeApiNames = preprocessed.runtimeApiNames;

    const errorContext: ErrorContext = {
        errors,

        traceMap: new TraceMap(preprocessed.sourceMap),

        lineIndexes: getLineIndexes(preprocessed.code),
    };

    const globalScope: Scope = new Map();

    const componentScope: Scope = new Map();

    /**
     * Stack with scopes. The last scope is the scope of current block or function.
     */

    const scopeStack: Scope[] = [globalScope];

    /**
     *
     * {@link VisitedReactives}.
     */
    const visitedReactives: VisitedReactives = new WeakSet();

    /**
     * Used to delete `void-js` labels initialization (the first `VariableDeclaration`) from {@link preprocessed.code}.
     */
    let isFirstVarDeclaration: boolean = true;

    /**
     * Used to identifiy is there at least one component.
     */
    let isComponentAppeared = false;

    /**
     *
     * The last `void-js` {@link UnassignableLabelType} syntax label appeared in `preprocessed.code`.
     */

    let lastLabel: LabelType | '' = '';

    const parsed = parseSync('', preprocessed.code, oxcParserOptions);
    traverse<Node>(
        parsed.program,
        (node, parent, key) => {
            const nodeType = node.type;

            if (
                nodeType === 'Identifier' &&
                (key !== MEMBER_EXPRESSION_PROPERTY_KEY || (parent as MemberExpression).computed)
            ) {
                if (visitedReactives.has(node)) {
                    return SKIP;
                }

                const idName = node.name;

                const label = labels[idName];
                if (label) {
                    lastLabel = label;
                    return nodes.emptyStatement();
                }

                const scopeIdType = findInScopes(idName, scopeStack);
                if (scopeIdType) {
                    replaceNode(
                        createReactiveReading(
                            idName,
                            scopeIdType === ScopeIdType.Signal
                                ? runtimeApiNames.getValue
                                : runtimeApiNames.compute,
                        ),
                        parent as Node,
                        key,
                    );
                }

                return SKIP;
            }

            if (nodeType === 'AssignmentExpression') {
                const left = node.left;

                if (left.type === 'Identifier') {
                    const idName = left.name;

                    if (findInScopes(idName, scopeStack) === ScopeIdType.Signal) {
                        const signalAssignment = createSignalAssignment(
                            visitedReactives,
                            node.operator,

                            left.name,

                            node.right,
                            runtimeApiNames,
                        );

                        return signalAssignment;
                    }
                }

                return;
            }

            if (nodeType === 'VariableDeclaration') {
                if (isFirstVarDeclaration) {
                    // the first `VariableDeclaration` in preprocessed code is always an initialization of labels

                    replaceNode(nodes.emptyStatement(), parent as Node, key);

                    isFirstVarDeclaration = false;

                    return SKIP;
                }

                const lastScope = scopeStack[scopeStack.length - 1];

                if (lastLabel) {
                    if (lastScope !== globalScope && lastScope !== componentScope) {
                        errors.push(
                            createNodeCompileError(
                                errorContext,
                                compileErrors.INVALID_REACTIVE_SCOPE,
                                node.start,
                                node.end,
                            ),
                        );
                    }

                    if (lastLabel === 'signal') {
                        const declarators: VariableDeclarator[] = [];

                        const origDeclarators = node.declarations;
                        for (let decIndex = 0; decIndex < origDeclarators.length; decIndex++) {
                            const origDeclarator = origDeclarators[decIndex];

                            const signalDeclarator = createSignalDeclarator(
                                errorContext,

                                origDeclarator.id,
                                origDeclarator.init,
                                runtimeApiNames,
                            );

                            if (signalDeclarator) {
                                const signalId = signalDeclarator.id as Identifier;

                                declarators.push(signalDeclarator);

                                lastScope.set(signalId.name, ScopeIdType.Signal);

                                visitedReactives.add(signalId);
                            }
                        }

                        lastLabel = '';

                        return nodes.variableDeclaration('const', declarators);
                    }

                    if (lastLabel === 'computation') {
                        const declarators: VariableDeclarator[] = [];

                        const origDeclarators = node.declarations;

                        for (let decIndex = 0; decIndex < origDeclarators.length; decIndex++) {
                            const origDeclarator = origDeclarators[decIndex];

                            const computationDeclarator = createComputationDeclarator(
                                errorContext,
                                origDeclarator.id,
                                origDeclarator.init,
                                runtimeApiNames,
                            );

                            if (computationDeclarator) {
                                const computationIdentifier =
                                    computationDeclarator.id as Identifier;

                                declarators.push(computationDeclarator);

                                lastScope.set(computationIdentifier.name, ScopeIdType.Computation);

                                visitedReactives.add(computationIdentifier);
                            }
                        }

                        lastLabel = '';

                        return nodes.variableDeclaration('const', declarators);
                    }

                    if (lastLabel === 'component') {
                        if (isComponentAppeared) {
                            errors.push(
                                createNodeCompileError(
                                    errorContext,
                                    compileErrors.MULTIPLE_COMPONENTS,
                                    node.start,
                                    node.end,
                                ),
                            );

                            lastLabel = '';

                            return;
                        }

                        const body = (node.declarations[0].init as ArrowFunctionExpression).body;

                        if (body.type !== 'BlockStatement') {
                            errors.push(
                                createNodeCompileError(
                                    errorContext,
                                    compileErrors.COMPONENT_CONSICE_BODY,
                                    body.start,
                                    body.end,
                                ),
                            );
                        }

                        isComponentAppeared = true;

                        lastLabel = '';

                        return;
                    }
                }

                const declarators = node.declarations;

                for (let decIndex = 0; decIndex < declarators.length; decIndex++) {
                    addPatternToScope(declarators[decIndex].id, lastScope, ScopeIdType.Default);
                }

                return;
            }

            if (lastLabel === 'effect') {
                lastLabel = '';
                return nodes.callExpression(
                    nodes.identifier(runtimeApiNames.createEffect),
                    [nodes.resetNode(node) as Expression],
                    null,
                );
            }

            if (nodeType === 'UpdateExpression') {
                const argument = unwrapUpdateExpression(node.argument);

                if (
                    argument.type === 'Identifier' &&
                    findInScopes(argument.name, scopeStack) === ScopeIdType.Signal
                ) {
                    replaceNode(
                        createSignalUpdate(
                            argument.name,
                            node.operator,
                            node.prefix,
                            runtimeApiNames,
                        ),
                        parent as Node,

                        key,
                    );
                }

                return SKIP;
            }

            if (nodeType === 'BlockStatement') {
                if (lastLabel === 'component') {
                    scopeStack.push(componentScope);

                    return;
                }

                scopeStack.push(new Map());

                return;
            }

            if (nodeType === 'ImportDeclaration') {
                return SKIP;
            }
        },

        (node) => {
            if (node.type === 'BlockStatement') {
                scopeStack.pop();

                return;
            }
        },
    );

    return { result: parsed, errors };
};
