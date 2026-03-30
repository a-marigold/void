import { traverse } from 'polyast';

import type {
    SourceLocation,
    Node,
    VariableDeclarator,
    ArrowFunctionExpression,
} from 'estree';

import * as nodes from '../../utils/estreeNodes';

import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { Reactives, TransformResult } from './types';
import type { PreprocessResult, UnassignableLabelType } from '../preprocessor';

import { compileErrors } from '../../errors';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    // replaceSignalUpdates,
    // replaceSignalReading,
    // replaceComputationReading,
    createCompileErrorFromNode,
} from './utils';

import { emptyStatement } from '../../utils/estreeNodes';

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
 */

export const transform = (
    preprocessed: PreprocessResult,
    ast: Node,
): TransformResult => {
    /**
     *
     *
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
     *
     * Represents how many times `VariableDeclartion` appeared in AST.
     *
     * Used to delete `void-js` keyword labels initialization on the first line of {@link preprocessed.code}.
     */

    let variableDeclarationCount: number = 0;

    const reactives: Reactives = new Set();

    /**
     *
     * Last function of component appeared in `preprocessed.code`.
     */
    let componentFn: null = null;

    /**
     *
     * The last `void-js` {@link UnassignabelLabelType} syntax label appeared in `preprocessed.code`.
     *
     */

    let lastLabel: UnassignableLabelType | '' = '';

    traverse(
        ast,
        (node) => {
            const nodeType = node.type;

            if (nodeType === 'Identifier') {
                const label = unassignableLabels.get(node.name);

                if (label) {
                    lastLabel = label;

                    return emptyStatement();
                }

                return;
            }

            if (nodeType === 'VariableDeclaration') {
                variableDeclarationCount++;

                if (variableDeclarationCount === 1) {
                    // the first `VariableDeclaration` in preprocessed code is always an initialization of labels
                    return emptyStatement();
                }

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
                    }

                    return nodes.variableDeclaration('const', declarators);
                } else if (lastLabel === 'computation') {
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
                    }

                    lastLabel = '';

                    return nodes.variableDeclaration('const', declarators);
                }
                if (lastLabel === 'component') {
                    const declarator = node.declarations[0];

                    const body = (declarator.init as ArrowFunctionExpression)
                        .body;

                    if (body.type !== 'BlockStatement') {
                        const bodyLoc = body.loc as SourceLocation;

                        errors.push(
                            createCompileErrorFromNode(
                                traceMap,
                                compileErrors.COMPONENT_CONSICE_BODY,

                                bodyLoc.start,

                                bodyLoc.end,
                            ),
                        );

                        lastLabel = '';

                        return;
                    }

                    lastLabel = '';

                    return;
                }
            }

            // if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
            //     if (
            //         path.getFunctionParent()?.node !== componentFn ||
            //         !path.findParent(
            //             (parentPath) => parentPath.type === 'ReturnStatement',
            //         )
            //     ) {
            //         const jsxLoc = node.loc as SourceLocation;

            //         errors.push(
            //             createCompileErrorFromNode(
            //                 traceMap,

            //                 compileErrors.JSX_OUTSIDE_COMPONENT,

            //                 jsxLoc.start,

            //                 jsxLoc.end,
            //             ),
            //         );

            //         return emptyStatement();
            //     }

            //     return;
            // }

            if (nodeType === 'AssignmentExpression') {
                const leftNode = node.left;

                if (
                    leftNode.type === 'Identifier' &&
                    assignableLabels.get(leftNode.name) === 'effect'
                ) {
                    return nodes.callExpression(
                        nodes.identifier(
                            runtimeApiNames.get('createEffect') as string,
                        ),
                        [node.right],
                    );
                }

                return;
            }
        },
        null,
    );

    return { ast, errors };
};
