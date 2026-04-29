import { parseSync } from 'oxc-parser';
import type {
    Node,
    IdentifierName as Identifier,
    ArrowFunctionExpression,
    MemberExpression,
    Expression,
    VariableDeclaration,
    VariableDeclarator,
    ExportNamedDeclaration,
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
    createMemoDeclarator,
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
 * #### Parses preprocessed code and transforms signals, effects, memos and components to `void-js` runtime.
 *
 * @param preprocessed Result of preprocessor.
 *
 * @returns Transformed `ast` argument.
 *
 *
 *
 *
 *
 *
 *
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

    //  TODO: Fuck and delete it

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
                                : runtimeApiNames.computeMemo,
                        ),
                        parent as Node,
                        key,
                    );
                }

                return SKIP;
            }

            if (nodeType === 'BlockStatement') {
                scopeStack.push(lastLabel === 'component' ? componentScope : new Map());

                return;
            }

            if (lastLabel) {
                const lastScope = scopeStack[scopeStack.length - 1];

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

                    const origDeclarators = (node as VariableDeclaration).declarations;
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

                if (lastLabel === 'memo') {
                    const declarators: VariableDeclarator[] = [];

                    const origDeclarators = (node as VariableDeclaration).declarations;

                    for (let decIndex = 0; decIndex < origDeclarators.length; decIndex++) {
                        const origDeclarator = origDeclarators[decIndex];

                        const memoDeclarator = createMemoDeclarator(
                            errorContext,

                            origDeclarator.id,

                            origDeclarator.init,

                            runtimeApiNames,
                        );
                        if (memoDeclarator) {
                            const memoIdentifier = memoDeclarator.id as Identifier;

                            declarators.push(memoDeclarator);
                            lastScope.set(memoIdentifier.name, ScopeIdType.Memo);

                            visitedReactives.add(memoIdentifier);
                        }
                    }
                    lastLabel = '';

                    return nodes.variableDeclaration('const', declarators);
                }

                if (lastLabel === 'effect') {
                    lastLabel = '';
                    return nodes.callExpression(
                        nodes.identifier(runtimeApiNames.createEffect),

                        [
                            nodes.resetNode(
                                node.type === 'ExpressionStatement'
                                    ? node.expression
                                    : (node as Expression),
                            ),
                        ],

                        null,
                    );
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

                        return SKIP;
                    }

                    isComponentAppeared = true;

                    const body = (
                        ((node as ExportNamedDeclaration).declaration as VariableDeclaration)
                            .declarations[0].init as ArrowFunctionExpression
                    ).body;

                    if (body.type !== 'BlockStatement') {
                        errors.push(
                            createNodeCompileError(
                                errorContext,
                                compileErrors.COMPONENT_CONSICE_BODY,
                                body.start,
                                body.end,
                            ),
                        );

                        lastLabel = '';

                        return SKIP;
                    }

                    lastLabel = '';

                    return;
                }
            }

            if (nodeType === 'AssignmentExpression') {
                const left = node.left;

                if (left.type === 'Identifier') {
                    const idName = left.name;

                    if (findInScopes(idName, scopeStack) === ScopeIdType.Signal) {
                        return createSignalAssignment(
                            visitedReactives,
                            node.operator,

                            left.name,

                            node.right,
                            runtimeApiNames,
                        );
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

                const declarators = node.declarations;

                for (let decIndex = 0; decIndex < declarators.length; decIndex++) {
                    addPatternToScope(declarators[decIndex].id, lastScope, ScopeIdType.Default);
                }

                return;
            }

            if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.JSX_OUTSIDE_COMPONENT,
                        node.start,
                        node.end,
                    ),
                );

                return nodes.emptyStatement();
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

            if (nodeType === 'ImportDeclaration') {
                // it is useless to traverse
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
