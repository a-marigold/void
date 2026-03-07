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
};

export const LOGICAL_OPERATORS = new Set<LogicalExpression['operator']>([
    '&&',
    '??',
    '||',
]);
