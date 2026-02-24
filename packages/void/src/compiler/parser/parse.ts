import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';

import * as babelTypes from '@babel/types';
import type { ImportSpecifier } from '@babel/types';

import type { VoidKeyword } from '../types';

import type { PreprocessResult } from '../preprocessor';

export const parse = (preprocessed: PreprocessResult) => {
    const keywordLabels = preprocessed.keywordLabels;

    /**
     *
     * The last `void-js` keyword appeared in `preprocessed.transformed`.
     */
    let lastKeywordType: VoidKeyword | (string & {}) = '';

    traverse(babelParse(preprocessed.transformed), {
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
                    babelTypes.stringLiteral(),
                ),
            );
        },

        Identifier: (path) => {
            const keywordType = keywordLabels.get(path.node.name);

            if (!keywordType) {
                return path.skip();
            }

            lastKeywordType = keywordType;
        },
        VariableDeclaration: (path) => {
            if (lastKeywordType === 'signal') {
                path.node;
            } else if (lastKeywordType === 'effect') {
            } else if (lastKeywordType === 'computation') {
            }

            lastKeywordType = '';
        },
    });
};
