import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';

import * as types from '@babel/types';
import type { VariableDeclarator, ImportSpecifier } from '@babel/types';

import type { AssignableVoidKeyword } from './types';

import { babelParseOptions } from './constants';
import { REACTIVITY_API_NAMES } from '../constants';

import type { PreprocessResult } from '../preprocessor';

import { CompileError, compileErrors } from '../errors';

import { createSignalDeclarator } from './utils';

export const parse = (preprocessed: PreprocessResult) => {
    const keywordLabels = preprocessed.keywordLabels;
    const reactivityApiNames = preprocessed.reactivityApiNames;
    /**
     *
     * Represents how many times `VariableDeclartion` appeared in AST. Used to delete `void-js` keyword labels on the first line of {@link preprocessed.transformed}.
     */
    let variableDeclarationCount: number = 0;

    /**
     *
     * The last `void-js` keyword appeared in `preprocessed.transformed`.
     */

    let lastKeywordType: AssignableVoidKeyword | '' = '';

    const ast = babelParse(preprocessed.transformed, babelParseOptions);

    traverse(ast, {
        Program: (path) => {
            const imported: ImportSpecifier[] = [];

            for (const name of reactivityApiNames) {
                imported[imported.length] = types.importSpecifier(
                    types.identifier(name[1]),

                    types.identifier(name[0]),
                );
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

            lastKeywordType = keywordType;

            return path.remove();
        },

        VariableDeclaration: (path) => {
            variableDeclarationCount++;

            if (variableDeclarationCount === 1) {
                // the first `VariableDeclaration` in preprocessed code always is an initialization of keyword labels
                return path.remove();
            }

            if (lastKeywordType === 'signal') {
                const declarators: VariableDeclarator[] = [];

                const nodeDeclarators = path.node.declarations;
                const nodeDeclaratorsLength = nodeDeclarators.length;

                let declaratorIndex = 0;

                while (declaratorIndex < nodeDeclaratorsLength) {
                    const currentDeclarator = nodeDeclarators[declaratorIndex];

                    declarators[declarators.length] = createSignalDeclarator(
                        currentDeclarator.id,
                        currentDeclarator.init,

                        reactivityApiNames.get('Signal') as string,
                    );

                    declaratorIndex++;
                }

                path.replaceWith(
                    types.variableDeclaration('const', declarators),
                );
            }

            lastKeywordType = '';
        },

        AssignmentExpression: (path) => {
            const leftNode = path.node.left;

            if (
                leftNode.type === 'Identifier' &&
                keywordLabels.get(leftNode.name) === 'effect'
            ) {
                path.replaceWith(
                    types.callExpression(
                        types.identifier(REACTIVITY_API_NAMES.createEffect),
                        [path.node.right],
                    ),
                );
            }
        },
    });

    return ast;
};
