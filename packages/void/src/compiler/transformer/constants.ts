import type { ParserOptions } from '@babel/parser';

import type { LogicalExpression } from '@babel/types';

/**
 *
 * Options object of `@babel/parser`.
 */

export const babelParseOptions: ParserOptions = {
    sourceType: 'module',

    attachComment: false,

    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
};

export const LOGICAL_OPERATORS = new Set<LogicalExpression['operator']>([
    '&&',
    '??',
    '||',
]);

/**
 * HTML tag that is used as anchor for dynamic content insertion (for example, components and expressions).
 */
export const ANCHOR_HTML_TAG = '<!---->';
