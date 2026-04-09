import type { VoidKeyword } from '../../types';

/**
 *
 *
 * RegExp that allows one ecmascript character of identifier start.
 * @example
 *
 * ```typescript
 * IDENTIFIER_START_REGEXP.test('a'); // true
 *
 * IDENTIFIER_START_REGEXP.test('_'); // true
 *
 *
 *
 * IDENTIFIER_START_REGEXP.test('$'); // true
 * IDENTIFIER_START_REGEXP.test('1'); // false
 * ```
 *
 */
export const IDENTIFIER_START_REGEXP = /^[\p{ID_Start}_$]+$/u;

/**
 *
 * `Set` with symbols that can interrupt an identifier.
 *
 *
 * @example
 * ```typescript
 *   'identif!ier'
 *           ^
 *           └─══════════════════ Interruption
 * ```
 */
export const PUNCTUATORS: ReadonlySet<string> = new Set([
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
 * `Set` with symbols that allow RegExp literal after itself.
 */
export const ALLOW_REGEXP_PUNCTUATORS: ReadonlySet<string> = new Set([
    '{',
    '}',
    '(',
    '[',

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
]);

/**
 *
 * ECMAScript, TypeScript and `void-js` keywords that start a variable or another declaration.
 */
export const DECLARATION_KEYWORDS: ReadonlySet<VoidKeyword | (string & {})> =
    new Set([
        'var',
        'let',
        'const',

        'function',
        'class',
        'type',
        'interface',

        'signal',
        'computation',
        'effect',
    ]);

/**
 *
 * All the keywords that exist in `void-js`.
 */

export const VOID_KEYWORDS: ReadonlySet<VoidKeyword> = new Set([
    'signal',
    'effect',
    'computation',
]);

/**
 * Keyword that is used as replacement of `signal` and `computation` keywords.
 *
 */

export const TRANSFORMED_REACTIVE_KEYWORD = 'let';

/**
 * ECMAScript keyword from which component declaration starts.
 */
export const COMPONENT_START_KEYWORD = 'export';

/**
 * Keyword that is used as replacement of component initialization.
 */
export const TRANSFORMED_COMPONENT_KEYWORD = 'const';

/**
 * Variety of `PreprocessToken.type`.
 */
export const enum PreprocessTokenType {
    Identifier = 0,
    Literal = 1,
    VoidKeyword = 2,
    Punctuator = 3,
    Empty = 4,
}

/**
 * Codes of errors that appear in `expectNextToken` function.
 *
 * Does not have any falsy values.
 */

export const enum TokenCode {
    /**
     *
     * This error appears when a token does not satisfy expected `type` or `value`.
     *
     * Treated as Recoverable error.
     */
    Unexpected = 1,

    /**
     *
     * This error appears when it is the end of `void-js` source file and expected token is not found.
     *
     * Treated as Fatal error.
     */
    Missing = 2,
}
