import { parse } from '@babel/parser';
import type { ParseError } from '@babel/parser';

import traverse from '@babel/traverse';

import type { Binding } from '@babel/traverse';

import * as types from '@babel/types';

import type {
    ArrowFunctionExpression,
    SourceLocation,
    Identifier,
    VariableDeclarator,
} from '@babel/types';
import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { Reactives, TransformResult } from './types';
import { babelParseOptions } from './constants';

import type { PreprocessResult, UnassignableLabelType } from '../preprocessor';

import { compileErrors } from '../errors';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    replaceSignalUpdates,
    replaceSignalReading,
    replaceComputationReading,
    createCompileErrorFromNode,
} from './utils';

/**
 *
 *
 * #### Parses preprocessed code via `@babel/parser` and transforms signals, effects, computations and components to `void-js` runtime API functions.
 *
 * @param preprocessed Result of preprocessor.
 *
 *
 * @returns `babel` AST.
 *
 *
 *
 *
 *
 */

export const transform = (preprocessed: PreprocessResult): TransformResult => {
    /**
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
    let componentFn: ArrowFunctionExpression | null = null;

    /**
     *
     * The last `void-js` {@link UnassignabelLabelType} syntax label appeared in `preprocessed.code`.
     *
     */
    let lastLabel: UnassignableLabelType | '' = '';

    const ast = parse(preprocessed.code, babelParseOptions);

    traverse(ast, {
        enter: (path) => {
            const nodeType = path.node.type;

            if (nodeType === 'Identifier') {
                const label = unassignableLabels.get(path.node.name);

                if (label) {
                    lastLabel = label;
                    return path.remove();
                }

                return;
            }

            if (nodeType === 'VariableDeclaration') {
                variableDeclarationCount++;
                if (variableDeclarationCount === 1) {
                    // the first `VariableDeclaration` in preprocessed code is always an initialization of labels.
                    return path.remove();
                }

                if (lastLabel === 'signal') {
                    const declarators: VariableDeclarator[] = [];

                    const nodeDeclarators = path.node.declarations;
                    const nodeDeclaratorsLength = nodeDeclarators.length;

                    let declaratorIndex = 0;
                    while (declaratorIndex < nodeDeclaratorsLength) {
                        const currentDeclarator =
                            nodeDeclarators[declaratorIndex];

                        const signalDeclarator = createSignalDeclarator(
                            traceMap,
                            errors,
                            currentDeclarator.id,
                            currentDeclarator.init,
                            runtimeApiNames,
                        );

                        if (signalDeclarator) {
                            declarators[declarators.length] = signalDeclarator;

                            const binding = path.scope.getBinding(
                                (currentDeclarator.id as Identifier).name, // currentDeclarator.id is exactly an identifier because of createSignalDeclarator call above
                            ) as Binding; // assertion is not dangerous because a binding with currentDeclarator.id.name exactly exists

                            replaceSignalReading(binding, runtimeApiNames);
                            replaceSignalUpdates(binding, runtimeApiNames);
                        }

                        declaratorIndex++;
                    }

                    path.replaceWith(
                        types.variableDeclaration('const', declarators),
                    );
                } else if (lastLabel === 'computation') {
                    const declarators: VariableDeclarator[] = [];

                    const nodeDeclarators = path.node.declarations;
                    const nodeDeclaratorsLength = nodeDeclarators.length;

                    let declaratorIndex = 0;
                    while (declaratorIndex < nodeDeclaratorsLength) {
                        const currentDeclarator =
                            nodeDeclarators[declaratorIndex];

                        const computationDeclarator =
                            createComputationDeclarator(
                                traceMap,
                                errors,
                                currentDeclarator.id,
                                currentDeclarator.init,
                                runtimeApiNames,
                            );

                        if (computationDeclarator) {
                            declarators[declarators.length] =
                                computationDeclarator;

                            const binding = path.scope.getBinding(
                                (currentDeclarator.id as Identifier).name, // currentDeclarator.id is exactly an identifier because of createComputationDeclarator call above
                            ) as Binding; // assertion is not dangerous because a binding with currentDeclarator.id.name exactly exists

                            replaceComputationReading(binding, runtimeApiNames);
                        }

                        declaratorIndex++;
                    }

                    path.replaceWith(
                        types.variableDeclaration('const', declarators),
                    );
                } else if (lastLabel === 'component') {
                    const declarator = path.node.declarations[0];

                    const componentInit =
                        declarator.init as ArrowFunctionExpression; // assertion is not dangerous because preprocessor always places a function here

                    const body = componentInit.body;

                    if (body.type !== 'BlockStatement') {
                        const bodyLoc = body.loc as SourceLocation;
                        errors[errors.length] = createCompileErrorFromNode(
                            traceMap,
                            compileErrors.COMPONENT_CONSICE_BODY,
                            bodyLoc.start,
                            bodyLoc.end,
                        );
                        lastLabel = '';
                        return path.skip();
                    }

                    componentFn = componentInit;
                }

                lastLabel = '';

                return;
            }

            if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
                if (
                    path.getFunctionParent()?.node !== componentFn ||
                    !path.findParent(
                        (parentPath) => parentPath.type === 'ReturnStatement',
                    )
                ) {
                    const jsxLoc = path.node.loc as SourceLocation;

                    errors[errors.length] = createCompileErrorFromNode(
                        traceMap,

                        compileErrors.JSX_OUTSIDE_COMPONENT,

                        jsxLoc.start,
                        jsxLoc.end,
                    );

                    return path.remove();
                }

                return;
            }
            if (nodeType === 'AssignmentExpression') {
                const leftNode = path.node.left;

                if (
                    leftNode.type === 'Identifier' &&
                    assignableLabels.get(leftNode.name) === 'effect'
                ) {
                    path.replaceWith(
                        types.callExpression(
                            types.identifier(
                                runtimeApiNames.get('createEffect') as string,
                            ),
                            [types.cloneNode(path.node.right)],
                        ),
                    );
                }

                return;
            }
        },
    });

    const parseErrors = ast.errors as ParseError[]; // assertion is not dangerous because of `errorRecovery` property in parser options

    for (let errorIndex = 0; errorIndex < parseErrors.length; errorIndex++) {
        const parseError = parseErrors[errorIndex];

        errors[errors.length] = createCompileErrorFromNode(
            traceMap,
            parseError.message,
            parseError.loc,
            null,
        );

        errorIndex++;
    }
    return { ast, errors };
};
