import { parseSync } from 'oxc-parser';
import type {
    Node,
    IdentifierName as Identifier,
    VariableDeclarator,
    ArrowFunctionExpression,
    MemberExpression,
} from 'oxc-parser';

import { traverse, SKIP } from 'polyast';

import * as nodes from './nodes';

import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';
import type { TransformResult, Scope } from './types';
import {
    oxcParserOptions,
    scopeIdTypes,
    MEMBER_EXPRESSION_PROPERTY_KEY,
} from './constants';

import type { PreprocessResult, UnassignableLabelType } from '../preprocessor';

import { compileErrors } from '../../errors';

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
 *
 */

export const transform = (preprocessed: PreprocessResult): TransformResult => {
    /**
     * `TraceMap` from {@link preprocessed.sourceMap}.
     *
     * Used for errors with correct source code positions.
     */
    const traceMap = new TraceMap(preprocessed.sourceMap as EncodedSourceMap);

    const errors = preprocessed.errors;
    const assignableLabels = preprocessed.assignableLabels;
    const unassignableLabels = preprocessed.unassignableLabels;
    const runtimeApiNames = preprocessed.runtimeApiNames;

    /**
     * Stack with scopes. The last scope is the scope of current block or function.
     */
    const scopeStack: Scope[] = [new Map()];

    /**
     * `WeakSet` with visited reactive identifiers to prevent circular transforming to getters of them.
     */
    const visitedReactives = new WeakSet<Node>();

    /**
     * Used to delete `void-js` labels initialization (the first `VariableDeclaration`) from {@link preprocessed.code}.
     */
    let isFirstVarDeclaration: boolean = true;

    /**
     *
     * The last `void-js` {@link UnassignableLabelType} syntax label appeared in `preprocessed.code`s
     */
    let lastLabel: UnassignableLabelType | '' = '';

    const ast = parseSync('', preprocessed.code, oxcParserOptions);

    traverse<Node>(
        ast.program,
        (node, parent, key) => {
            const nodeType = node.type;

            if (nodeType === 'BlockStatement') {
                scopeStack.push(new Map());

                return;
            }

            if (
                nodeType === 'Identifier' &&
                (key !== MEMBER_EXPRESSION_PROPERTY_KEY ||
                    (parent as MemberExpression).computed)
            ) {
                if (visitedReactives.has(node)) {
                    return SKIP;
                }

                const idName = node.name;

                const label = unassignableLabels[idName];
                if (label) {
                    lastLabel = label;
                    return nodes.emptyStatement();
                }

                const scopeIdType = findInScopes(idName, scopeStack);

                if (scopeIdType === scopeIdTypes.signal) {
                    const signalReading = createReactiveReading(
                        idName,

                        runtimeApiNames.getValue,
                    );

                    replaceNode(signalReading, parent as Node, key);
                } else if (scopeIdType === scopeIdTypes.computation) {
                    const computationReading = createReactiveReading(
                        idName,
                        runtimeApiNames.compute,
                    );

                    replaceNode(computationReading, parent as Node, key);
                }

                return SKIP;
            }

            if (nodeType === 'AssignmentExpression') {
                const left = node.left;

                if (left.type === 'Identifier') {
                    const idName = left.name;

                    if (findInScopes(idName, scopeStack)) {
                        const signalAssignment = createSignalAssignment(
                            node.operator,
                            left.name,
                            node.right,
                            runtimeApiNames,
                        );

                        visitedReactives.add(signalAssignment.arguments[0]);

                        return signalAssignment;
                    }

                    if (assignableLabels[idName] === 'effect') {
                        return nodes.callExpression(
                            nodes.identifier(runtimeApiNames.createEffect),

                            [node.right],
                        );
                    }
                }

                return;
            }

            if (nodeType === 'VariableDeclaration') {
                if (isFirstVarDeclaration) {
                    // the first `VariableDeclaration` in preprocessed code is always an initialization of labels

                    isFirstVarDeclaration = false;

                    replaceNode(nodes.emptyStatement(), parent as Node, key);

                    return SKIP;
                }

                const lastScope = scopeStack[scopeStack.length - 1];

                if (lastLabel === 'signal') {
                    const declarators: VariableDeclarator[] = [];
                    const nodeDeclarators = node.declarations;

                    for (
                        let decIndex = 0;
                        decIndex < nodeDeclarators.length;
                        decIndex++
                    ) {
                        const currentDeclarator = nodeDeclarators[decIndex];

                        const signalDeclarator = createSignalDeclarator(
                            traceMap,
                            errors,
                            currentDeclarator.id,
                            currentDeclarator.init,
                            runtimeApiNames,
                        );

                        if (signalDeclarator) {
                            lastScope.set(
                                (signalDeclarator.id as Identifier).name,
                                1,
                            );
                        }
                    }

                    lastLabel = '';

                    return nodes.variableDeclaration('const', declarators);
                }

                if (lastLabel === 'computation') {
                    const declarators: VariableDeclarator[] = [];

                    const nodeDeclarators = node.declarations;

                    for (
                        let decIndex = 0;
                        decIndex < nodeDeclarators.length;
                        decIndex++
                    ) {
                        const currentDeclarator = nodeDeclarators[decIndex];

                        const computationDeclarator =
                            createComputationDeclarator(
                                traceMap,
                                errors,

                                currentDeclarator.id,
                                currentDeclarator.init,
                                runtimeApiNames,
                            );

                        if (computationDeclarator) {
                            lastScope.set(
                                (computationDeclarator.id as Identifier).name,
                                1,
                            );
                        }
                    }

                    lastLabel = '';

                    return nodes.variableDeclaration('const', declarators);
                }

                if (lastLabel === 'component') {
                    const declarator = node.declarations[0];

                    const body = (declarator.init as ArrowFunctionExpression)
                        .body;

                    if (body.type !== 'BlockStatement') {
                        errors.push(
                            createNodeCompileError(
                                traceMap,

                                compileErrors.COMPONENT_CONSICE_BODY,

                                body.start,
                                body.end,
                            ),
                        );

                        lastLabel = '';

                        return;
                    }

                    lastLabel = '';

                    return;
                }

                const declarators = node.declarations;
                for (
                    let decIndex = 0;
                    decIndex < declarators.length;
                    decIndex++
                ) {
                    addPatternToScope(declarators[decIndex].id, lastScope, 0);
                }

                return;
            }

            if (nodeType === 'UpdateExpression') {
                const argument = unwrapUpdateExpression(node.argument);

                if (
                    argument.type === 'Identifier' &&
                    findInScopes(argument.name, scopeStack)
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

                    return SKIP;
                }
            }
        },

        (node) => {
            if (node.type === 'BlockStatement') {
                scopeStack.pop();

                return;
            }
        },
    );

    return { ast, errors };
};
