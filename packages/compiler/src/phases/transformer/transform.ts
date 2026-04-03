import { parseSync } from 'oxc-parser';
import type {
    Node,
    IdentifierName as Identifier,
    VariableDeclarator,
    ArrowFunctionExpression,
} from 'oxc-parser';

import { traverse, SKIP } from 'polyast';

import * as nodes from './nodes';

import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { TransformResult, Scope } from './types';
import { oxcParserOptions, scopeIdTypes } from './constants';

import type { PreprocessResult, UnassignableLabelType } from '../preprocessor';

import { compileErrors } from '../../errors';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    // replaceSignalUpdates,
    // replaceSignalReading,
    // replaceComputationReading,
    findInScopes,
    addPatternToScope,
    replaceNode,
    createNodeCompileError,
} from './utils';

/**
 *
 *
 * #### Parses preprocessed code via `@babel/parser` and transforms signals, effects, computations and components to `void-js` runtime API functions.
 *
 * @param preprocessed Result of preprocessor.
 * @param ast {@link https://github.com/estree/estree|Estree} AST with JSX and typescript additions, derived from `preprocessed.code`.
 *
 *
 *
 * @returns Transformed `ast` argument.
 *
 *
 *
 *
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

    const scopeStack: Scope[] = [new Map()];

    /**
     * Used to delete `void-js` labels initialization (the first VariableDeclaration) from {@link preprocessed.code}.
     */
    let isFirstVarDeclaration: boolean = true;

    /**
     * The last `void-js` {@link UnassignableLabelType} syntax label appeared in `preprocessed.code`
     */

    let lastLabel: UnassignableLabelType | '' = '';

    const ast = parseSync('', preprocessed.code, oxcParserOptions);

    traverse<Node>(
        ast.program,
        (node, parent, key) => {
            const nodeType = node.type;

            if (nodeType === 'BlockStatement') {
                scopeStack.push(new Map());
            }

            if (nodeType === 'Identifier') {
                const idName = node.name;

                const label = unassignableLabels[idName];

                if (label) {
                    lastLabel = label;

                    return nodes.emptyStatement();
                }

                const idType = findInScopes(idName, scopeStack);

                if (idType === scopeIdTypes.signal) {
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
            }

            if (nodeType === 'AssignmentExpression') {
                const leftNode = node.left;

                if (
                    leftNode.type === 'Identifier' &&
                    assignableLabels[leftNode.name] === 'effect'
                ) {
                    return nodes.callExpression(
                        nodes.identifier(runtimeApiNames.createEffect),

                        [node.right],
                    );
                }

                return;
            }
        },

        (node) => {
            if (node.type === 'BlockStatement') {
                scopeStack.pop();
            }
        },
    );

    return { ast, errors };
};
