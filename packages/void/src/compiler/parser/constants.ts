import type { ParserOptions } from '@babel/parser';

/**
 *
 * Options object of `@babel/parser`.
 */
export const babelParseOptions: ParserOptions = {
    sourceType: 'module',

    plugins: ['jsx', 'typescript'],
};
