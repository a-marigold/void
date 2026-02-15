/**
 *
 * RegExp that allows single ecmascript identifier start character.
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

export const IDENTIFIER_START_REGEXP = /^[a-zA-Zа-яА-Я_$]$/;

/**
 * RegExp that allows single ecmascript identifer character.
 *
 * @example
 *
 * ```typescript
 * IDENTIFIER_START_REGEXP.test('a'); // true
 * IDENTIFIER_START_REGEXP.test('_'); // true
 * IDENTIFIER_START_REGEXP.test('$'); // true
 * IDENTIFIER_START_REGEXP.test('1'); // true
 * ```
 *
 */

export const IDENTIFIER_REGEXP = /^[a-zA-Zа-яА-Я0-9_$]$/;
