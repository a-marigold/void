import { traverse, SKIP } from 'polyast';

import type {
    SourceLocation,
    Node,
    Identifier,
    VariableDeclarator,
    ArrowFunctionExpression,
} from 'estree';

import * as nodes from '../../utils/estreeNodes';

import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { TransformResult, Scope } from './types';

import type { PreprocessResult, UnassignableLabelType } from '../preprocessor';

import { compileErrors } from '../../errors';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    // replaceSignalUpdates,
    // replaceSignalReading,
    // replaceComputationReading,
    addPatternToScope,
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
     * The last `void-js` {@link UnassignabelLabelType} syntax label appeared in `preprocessed.code`
     */
    let lastLabel: UnassignableLabelType | '' = '';

    traverse(
        ast,
        (node, parent, key) => {
            const nodeType = node.type;

            if (nodeType === 'Identifier') {
                const label = unassignableLabels.get(node.name);

                if (label) {
                    lastLabel = label;

                    return emptyStatement();
                }

                return;
            }

            if (nodeType === 'BlockStatement') {
                scopeStack.push(new Map());
            }

            if (nodeType === 'VariableDeclaration') {
                if (isFirstVarDeclaration) {
                    // the first `VariableDeclaration` in preprocessed code is always an initialization of labels
                    isFirstVarDeclaration = false;

                    if (parent) {
                        (parent as Record<string, unknown>)[key] =
                            emptyStatement();
                    }
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
        (node) => {
            if (node.type === 'BlockStatement') {
                scopeStack.pop();
            }
        },
    );

    return { ast, errors };
};
