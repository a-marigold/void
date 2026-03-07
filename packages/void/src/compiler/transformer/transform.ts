import { parse } from '@babel/parser';

import traverse from '@babel/traverse';

import type { Binding } from '@babel/traverse';

import * as types from '@babel/types';

import type {
    Identifier,
    VariableDeclarator,
    ImportSpecifier,
} from '@babel/types';

import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { AssignableVoidKeyword } from '../types';

import { babelParseOptions } from './constants';
import type { PreprocessResult } from '../preprocessor';
import type { RuntimeTypeName } from '../types';
import { RUNTIME_TYPE_NAMES } from '../constants';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    replaceSignalUpdates,
    replaceSignalReading,
    replaceComputationReading,
} from './utils';

/**
 *
 *
 * #### Parses preprocessed code via `@babel/parser` and transforms signals, effects, computations to `void-js` reactivity API functions.
 *
 *
 * @param preprocessed Result of preprocessor.
 *
 *
 * @returns `babel` AST.
 *
 * @example
 *
 * ```typescript
 * transform({ code });
 * ```
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

export const transform = (preprocessed: PreprocessResult) => {
    /**
     *
     * `TraceMap` from {@link preprocessed.sourceMap}.
     *
     * Used for errors with correct positions source code.
     *
     *
     */
    const traceMap = new TraceMap(preprocessed.sourceMap as EncodedSourceMap);

    const keywordLabels = preprocessed.keywordLabels;

    const runtimeApiNames = preprocessed.runtimeApiNames;

    /**
     *
     * Represents how many times `VariableDeclartion` appeared in AST.
     * Used to delete `void-js` keyword labels initialization on the first line of {@link preprocessed.code}.
     */
    let variableDeclarationCount: number = 0;

    /**
     *
     * The last `void-js` keyword appeared in `preprocessed.code`.
     */

    let lastLabel: AssignableVoidKeyword | '' = '';

    const ast = parse(preprocessed.code, babelParseOptions);

    traverse(ast, {
        Program: (path) => {
            const imported: ImportSpecifier[] = [];

            for (const name of runtimeApiNames) {
                const runtimeApiName = name[0];

                const importSpecifier = types.importSpecifier(
                    types.identifier(name[1]),

                    types.identifier(runtimeApiName),
                );

                if (RUNTIME_TYPE_NAMES.has(runtimeApiName as RuntimeTypeName)) {
                    importSpecifier.importKind = 'type';
                }

                imported[imported.length] = importSpecifier;
            }

            path.unshiftContainer(
                'body',

                types.importDeclaration(imported, types.stringLiteral('')),
            );
        },

        Identifier: (path) => {
            const keywordType = keywordLabels.get(path.node.name);

            if (!keywordType || keywordType === 'effect') {
                return;
            }

            lastLabel = keywordType;

            return path.remove();
        },

        VariableDeclaration: (path) => {
            variableDeclarationCount++;

            if (variableDeclarationCount === 1) {
                // the first `VariableDeclaration` in preprocessed code always is an initialization of keyword labels

                return path.remove();
            }

            if (lastLabel === 'signal') {
                const declarators: VariableDeclarator[] = [];

                const nodeDeclarators = path.node.declarations;
                const nodeDeclaratorsLength = nodeDeclarators.length;

                let declaratorIndex = 0;

                while (declaratorIndex < nodeDeclaratorsLength) {
                    const currentDeclarator = nodeDeclarators[declaratorIndex];

                    declarators[declarators.length] = createSignalDeclarator(
                        currentDeclarator.id,

                        currentDeclarator.init,

                        runtimeApiNames,
                    );

                    const binding = path.scope.getBinding(
                        (currentDeclarator.id as Identifier).name, // currentDeclarator.id is exactly an identifier because of createSignalDeclarator call above
                    ) as Binding; // assertion is not dangerous because a binding with currentDeclarator.id.name exactly exists

                    replaceSignalReading(binding, runtimeApiNames);

                    replaceSignalUpdates(binding, runtimeApiNames);

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
                    const currentDeclarator = nodeDeclarators[declaratorIndex];

                    declarators[declarators.length] =
                        createComputationDeclarator(
                            traceMap,
                            currentDeclarator.id,

                            currentDeclarator.init,

                            runtimeApiNames,
                        );

                    const binding = path.scope.getBinding(
                        (currentDeclarator.id as Identifier).name, // currentDeclarator.id is exactly an identifier because of createComputationDeclarator call above
                    ) as Binding; // assertion is not dangerous because a binding with currentDeclarator.id.name exactly exists

                    replaceComputationReading(binding, runtimeApiNames);

                    declaratorIndex++;
                }

                path.replaceWith(
                    types.variableDeclaration('const', declarators),
                );
            }

            lastLabel = '';
        },
        AssignmentExpression: (path) => {
            const leftNode = path.node.left;
            if (
                leftNode.type === 'Identifier' &&
                keywordLabels.get(leftNode.name) === 'effect'
            ) {
                path.replaceWith(
                    types.callExpression(
                        types.identifier(
                            runtimeApiNames.get('createEffect') as string,
                        ),
                        [path.node.right],
                    ),
                );
            }
        },
    });

    return ast;
};
