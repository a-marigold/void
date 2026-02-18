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

export const EFFECT_PREFIX = '_$effect';

export const VOID_KEYWORDS: { [K in VoidKeyword]: VoidKeyword } = {
    signal: 'signal',

    effect: 'effect',
    computation: 'computation',
};
