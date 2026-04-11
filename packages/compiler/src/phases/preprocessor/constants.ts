import type { VoidKeyword } from '../../types';

/**
 * RegExp that allows one ecmascript character of identifier start.
 *
 * Used as a fallback when {@link IDENTIFIER_START_CODES} does not have a character.
 *
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

export const IDENTIFIER_START_REGEXP = /[\p{ID_Start}_$]/u;

/**
 * `Uint8Array` with ASCII codes of identifier start symbols.
 *
 * Used as a fast path instead of {@link IDENTIIFER_START_REGEXP}.
 */
export const IDENTIFIER_START_CODES = new Uint8Array(122);
const identifierCodeList: number[] = [
    36, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
    88, 89, 90, 95, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
    113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
];
for (let i = 0; i < identifierCodeList.length; i++) {
    IDENTIFIER_START_CODES[identifierCodeList[i]] = 1;
}
/**
 *
 * `Set` with symbols that can interrupt an identifier.
 *
 * Includes `' '`, `'\n'`, `'\r'`, `'\t`'.
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

    ' ',
    '\n',
    '\r',
    '\t',
]);

/**
 * `Set` with symbols that allow RegExp literal after itself.
 *
 * Does not include `' '`, `'\n'`, `'\r'`, `'\t'`.
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
export const DECLARATION_KEYWORDS: ReadonlySet<VoidKeyword | (string & {})> = new Set([
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

export const VOID_KEYWORDS: ReadonlySet<VoidKeyword> = new Set(['signal', 'effect', 'computation']);

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
 *
 * Variety of `PreprocessToken.type`.
 */
export const enum TokenType {
    /**
     *
     *
     * Appears only on the start of preprocessing.
     */

    Start = 0,

    Identifier = 1,
    Literal = 2,
    VoidKeyword = 3,
    Punctuator = 4,

    Empty = 5,

    /**
     *
     *
     * Appears when the whole source was iterated.
     */

    End = 6,
}

/**
 * Variety of preprocessor ast nodes.
 */
export const enum ASTNodeType {
    Signal = 0,
    Effect = 1,
    Computation = 2,
    Component = 3,
    Recovered = 4,
}

/**
 *
 * Codes of errors that appear in `expectNextToken` function.
 *
 * `NoError` variant is a falsy value.
 */

export const enum TokenCode {
    /**
     * This appears when the token is completely valid.
     */
    NoError = 0,

    /**
     * This error appears when a token does not satisfy expected `type` or `value`.
     *
     * Treated as Recoverable error.
     */
    Unexpected = 1,

    /**
     * This error appears when it is the end of `void-js` source file and expected token is not found.
     *
     * Treated as Fatal error.
     */
    Missing = 2,
}
