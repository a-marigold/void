import type { VoidKeyword } from '../types';

/**
 *
 * RegExp that allows one ecmascript identifier start character.
 *
 * @example
 *
 * ```typescript
 * IDENTIFIER_START_REGEXP.test('a'); // true
 *
 * IDENTIFIER_START_REGEXP.test('_'); // true
 *
 * IDENTIFIER_START_REGEXP.test('$'); // true
 *
 * IDENTIFIER_START_REGEXP.test('1'); // false
 * ```
 *
 */

export const IDENTIFIER_START_REGEXP = /^[\p{ID_Start}_$]+$/u;

/**
 *
 * `Set` with symbols that can interrupt an identifier.
 *
 * @example
 * ```typescript
 *   'identif!ier'
 *           ^
 *           └─════════════════ Interruption
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
 * `Set` with symbols that allow RegExp literal after itself.
 */
export const ALLOW_REGEXP_PUNCTUATORS = new Set(['(', '{', '}', '[', ';', ',']);

/**
 *
 * Used to identify does the next line contain `signal`, `effect` or `computation` in preprocessed code.
 *
 * @example
 *
 * ```typescript
 * signal count: number = 10;
 * ```
 *
 * Output:
 *
 *  ```typescript
 * let _$signal; // preprocessor added this line
 *
 * _$signal; // label for transformer
 * let count: number = 10; // this was a `signal` in `void-js` source file
 * ```
 *
 */
export const KEYWORD_LABEL_PREFIXES = {
    signal: '_$signal',
    effect: '_$effect',
    computation: '_$computation',
} as const;

/**
 *
 * All the keywords that exist in `void-js`.
 */
export const VOID_KEYWORDS = new Set<VoidKeyword>([
    'signal',
    'effect',
    'computation',
]);

/**
 *
 * Keyword that is used as replacement of `signal` keyword.
 */
export const TRANSFORMED_SIGNAL_KEYWORD = 'let';

/**
 *
 *
 * Keyword that is used as replacement of `computation` keyword.
 */

export const TRANSFORMED_COMPUTATION_KEYWORD = 'let';

/**
 *
 * ECMAScript keyword from which component declaration starts.
 */
export const COMPONENT_START_KEYWORD = 'export';

/**
 *
 * Keyword that is used as replacement of component initialization.
 */
export const TRANSFORMED_COMPONENT_KEYWORD = 'const';

/**
 *
 *
 * ECMAScript and `void-js` keywords that start a variable or another declaration.
 */

export const DECLARATION_KEYWORDS = new Set<VoidKeyword | (string & {})>([
    'var',

    'let',

    'const',

    'function',

    'signal',

    'computation',

    'effect',
]);
