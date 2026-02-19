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

/**
 *
 * Used to identify does the next line contain `signal` declaration.
 *
 *
 * @example
 *
 * `void-js`
 * ```typescript
 * signal count = 0;
 * ```
 *
 * Output:
 *
 * ```typescript
 * const _$signal = 1; // preprocessor added this line
 *
 * _$signal;
 * let count = 0; // this was a `signal` in `void-js` source file
 * ```
 *
 *
 */

export const SIGNAL_LABEL = '_$signal';

/**
 *
 * Used to identify does the next line contain `effect`.
 *
 * @example
 *
 * `void-js`:
 * ```typescript
 * effect () => {
 *   console.log('hello');
 * };
 * ```
 * Output:
 * ```typescript
 * const _$effect = 1; // preprocessor added this line
 *
 * _$effect;
 * () => { console.log('Hello'); }; // this was an `effect` in `void-js` source file
 * ```
 */

export const EFFECT_LABEL = '_$effect';

/**
 *
 * Used to identify does the next line contain `computation`.
 *
 * @example
 *
 *
 * `void-js`:
 *
 * ```typescript
 * computation doubled = () => 2;
 * ```
 * Output:
 * ```typescript
 * const _$computation = 1; // preprocessor added this line
 *
 * _$computation;
 * const dobuled = () => 2; // this was a `computation in `void-js` source file
 * ```
 */

export const COMPUTATION_LABEL = '_$computation';

export const VOID_KEYWORDS = new Set<VoidKeyword>([
    'signal',
    'effect',
    'computation',
]);
