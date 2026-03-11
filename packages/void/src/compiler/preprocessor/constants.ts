import type { LabelType, Interrupt } from './types';

import type { VoidKeyword } from '../types';

/**
 *
 * RegExp that allows one ecmascript character of identifier start.
 *
 * @example
 *
 * ```typescript
 * IDENTIFIER_START_REGEXP.test('a'); // true
 *
 * IDENTIFIER_START_REGEXP.test('_'); // true
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
 * Used to identify does the next line contain `signal`, `effect`, `computation` or a component in preprocessed code.
 *
 * @example
 *
 *
 *
 * ```typescript
 * signal count: number = 10;
 * ```
 *
 * Output:
 *
 *  ```typescript
 * let _$signal, _$effect, _$computation, ...(and other labels); // preprocessor added this line
 *
 * _$signal; // label for transformer
 * let count: number = 10; // this was a `signal` in `void-js` source file
 * ```
 *
 */
export const LABEL_PREFIXES: { [K in LabelType]: string } = {
    signal: '_$sgn',
    effect: '_$efc',
    computation: '_$cmp',
    component: '_$cmpn',
    recoveredComponent: '_$rcc',
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
 *
 *
 */

export const DECLARATION_KEYWORDS = new Set<VoidKeyword | (string & {})>([
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
 * Types and values of `PreprocessToken` that must interrupt the `syncToToken` function.
 *
 * Used for skcipping rubbish in error recovery.
 */
export const COMPONENT_INTERRUPTS = new Set<Interrupt>([
    'Identifier',
    'Literal',
    'VoidKeyword',
    ')',
    '{',
    '}',
    '!',
    '.',
    ',',
    ';',
    '[',
    ']',
]);
