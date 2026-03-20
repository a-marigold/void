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

/**
 *
 * Name of property in `HTMLElement.prototype` that refers on the first child of element.
 */
export const FIRST_CHILD_ACCESS = 'firstChild';

/**
 *
 * Name of property in `HTMLElement.prototype` that refers on the next sibling of element.
 */
export const NEXT_SIBLING_ACCESSOR = 'nextSibling';
