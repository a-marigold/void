import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';

import * as babelTypes from '@babel/types';

import type { VariableDeclarator, ImportSpecifier } from '@babel/types';

import type { AssignableVoidKeyword } from './types';

import { babelParseOptions } from './constants';
import type { VoidKeyword } from '../types';
import { REACTIVITY_API_NAMES } from '../constants';

import type { PreprocessResult } from '../preprocessor';

import { CompileError, compileErrors } from '../errors';

export const parse = (preprocessed: PreprocessResult) => {
    const keywordLabels = preprocessed.keywordLabels;

    /**
     *
     *
     * The last `void-js` keyword appeared in `preprocessed.transformed`.
     */

    let lastKeywordType: AssignableVoidKeyword | '' = '';

    traverse(babelParse(preprocessed.transformed, babelParseOptions), {
        Program: (path) => {
            const imported: ImportSpecifier[] = [];

            const reactivityApiNames = preprocessed.reactivityApiNames;

            for (const name of reactivityApiNames) {
                imported[imported.length] = babelTypes.importSpecifier(
                    babelTypes.identifier(name[1]),

                    babelTypes.identifier(name[0]),
                );
            }
            path.unshiftContainer(
                'body',
                babelTypes.importDeclaration(
                    imported,
                    babelTypes.stringLiteral(''),
                ),
            );
        },

        Identifier: (path) => {
            const keywordType = keywordLabels.get(path.node.name);

            if (!keywordType || keywordType === 'effect') {
                return;
            }

            lastKeywordType = keywordType;
        },

        VariableDeclaration: (path) => {
            if (lastKeywordType === 'signal') {
                const declarators: VariableDeclarator[] = [];

                const nodeDeclarators = path.node.declarations;
                const nodeDeclaratorsLength = nodeDeclarators.length;

                let declaratorIndex = 0;
                while (declaratorIndex < nodeDeclaratorsLength) {
                    const currentDeclarator = nodeDeclarators[declaratorIndex];

                    if (!currentDeclarator.init) {
                        throw new CompileError(
                            compileErrors.SIGNAL_WITHOUT_INITIAL_VALUE(),
                            0,
                            0,
                        );
                    }

                    if (currentDeclarator.id.type !== 'Identifier') {
                        throw new CompileError(
                            compileErrors.SIGNAL_DESTRUCTURING(),

                            0,

                            0,
                        );
                    }

                    const identifier = babelTypes.cloneNode(
                        currentDeclarator.id,
                    );
                    identifier.typeAnnotation = babelTypes.tsTypeAnnotation(
                        babelTypes.tsTypeReference(
                            babelTypes.identifier(REACTIVITY_API_NAMES.Signal),
                        ),
                    );

                    declarators[declarators.length] =
                        babelTypes.variableDeclarator(
                            identifier,
                            babelTypes.cloneNode(currentDeclarator.init),
                        );

                    declaratorIndex++;
                }

                path.replaceWith(
                    babelTypes.variableDeclaration('const', declarators),
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
                    babelTypes.callExpression(
                        babelTypes.identifier(
                            REACTIVITY_API_NAMES.createEffect,
                        ),
                        [path.node.right],
                    ),
                );
            }
        },
    });
};
