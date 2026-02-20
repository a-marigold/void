import type { VoidKeyword } from './types';

/**
 *
 * RegExp that allows one ecmascript identifier start character.
 *
 * @example
 *
 * ```typescript
 * IDENTIFIER_START_REGEXP.test('a'); // true
 * IDENTIFIER_START_REGEXP.test('_'); // true
 * IDENTIFIER_START_REGEXP.test('$'); // true
 * IDENTIFIER_START_REGEXP.test('1'); // false
 * ```
 *
 *
 */

export const IDENTIFIER_START_REGEXP = /^[\p{ID_Start}_$]+$/u;

/**
 * `Set` with symbols that can interrupt an identifier.
 *
 * @example
 * ```typescript
 * 'identif!ier'
 *         ^
 *         | --- Interruption
 * ```
 */
export const PUNCTUATORS = new Set([
    '{',
    '}',
    '(',
    ')',
    '[',
    ']',

    '.',
    ',',

    ':',

    '=',

    '<',
    '>',
    ';',
    '!',
    '?',
    '|',
    '~',
    '&',
    '+',

    '-',
    '*',

    '/',

    '*',
    '^',
    "'",
    '"',
    '`',
    '#',
]);

/**
 *
 *
 * Used to identify does the next line contain `signal`, `effect` or `computation` in preprocessed code.
 *
 * @example
 *
 * ```typescript
 * effect () => {
 *   console.log('hello');
 * };
 * ```
 *
 * Output:
 *
 *
 *
 *  ```typescript
 * let _$effect; // preprocessor added this line
 *
 * _$effect; // label for parser
 * () => { console.log('Hello'); }; // this was an `effect` in `void-js` source file
 * ```
 *
 */

export const KEYWORD_LABEL_PREFIXES = {
    signal: '_$signal',
    effect: '_$effect',
    computation: '_$computation',
} as const;

/**
 * All the keywords that exist in `void-js`.
 */
export const VOID_KEYWORDS = new Map<VoidKeyword, VoidKeyword>([
    ['signal', 'signal'],
    ['effect', 'effect'],
    ['computation', 'computation'],
]);
