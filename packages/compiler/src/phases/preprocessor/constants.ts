import type { VoidKeyword, VoidIdPrefix } from '@void/shared';

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
 * IDENTIFIER_START_REGEXP.test('$'); // true
 * IDENTIFIER_START_REGEXP.test('1'); // false
 * ```
 *
 */
export const IDENTIFIER_START_REGEXP = /[\p{ID_Start}_$]/u;

/**
 *
 *
 * `Uint8Array` with ASCII codes of identifier start symbols.
 */
export const IDENTIFIER_START_CODES = new Uint8Array(123);

for (const code of [
	36, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
	87, 88, 89, 90, 95, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
	112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
]) {
	IDENTIFIER_START_CODES[code] = 1;
}
/**
 *
 * `Uint8Array` with ASCII codes of symbols that can interrupt an identifier.
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
export const PUNCTUATORS = new Uint8Array(127);
for (const code of [
	9, 10, 13, 32, 33, 34, 35, 38, 39, 40, 41, 42, 42, 43, 44, 45, 46, 47, 58, 59, 60, 61, 62,
	63, 91, 93, 94, 96, 123, 124, 125, 126,
]) {
	PUNCTUATORS[code] = 1;
}
/**
 *
 * `Uint8Array` with ASCII codes of symbols that allow RegExp literal after itself.
 *
 * Does not include `' '`, `'\n'`, `'\r'`, `'\t'`.
 */
export const ALLOW_REGEXP_PUNCTUATORS = new Uint8Array(127);

for (const code of [
	33, 38, 40, 42, 42, 43, 44, 45, 47, 58, 59, 60, 61, 62, 63, 91, 94, 123, 124, 125, 126,
]) {
	ALLOW_REGEXP_PUNCTUATORS[code] = 1;
}

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
	'memo',
	'effect',
]);

/**
 *
 * All new the keywords of `void-js`.
 */

export const VOID_KEYWORDS: ReadonlySet<VoidKeyword> = new Set(['signal', 'effect', 'memo']);

/**
 * Keyword that is used as replacement of `signal` and `memo` keywords.
 */

export const TRANSFORMED_REACTIVE_KEYWORD = 'let';

/**
 *
 *
 *
 * ECMAScript keyword from which component declaration starts.
 */
export const COMPONENT_START_KEYWORD = 'export';

/**
 *
 *
 *
 *
 * Keyword that is used as replacement of component initialization.
 *
 */

export const TRANSFORMED_COMPONENT_KEYWORD = 'const';

export const enum CharCode {
	Space = 32,
	'\n' = 10,
	'\r' = 13,
	'\t' = 9,
	'"' = 34,
	"'" = 39,
	'`' = 96,
	Zero = 48,
	Nine = 57,
	'/' = 47,
}

/**
 * Variety of preprocessor `Token` `type`.
 */
export const enum TokenType {
	/**
	 *
	 *
	 * Appears only on the start of preprocessing.
	 *
	 *
	 *
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
 *
 * Codes of errors that appear in `expectNextToken` function.
 *
 * `NoError` variant is a falsy value.
 */

export const enum TokenCode {
	/**
	 *
	 * This appears when the token is completely valid.
	 */
	NoError = 0,

	/**
	 * This error appears when a token does not satisfy expected `type` or `value`.
	 *
	 * Treated as Recoverable error.
	 */

	Unexpected,

	/**
	 *
	 *
	 *
	 *
	 * This error appears when it is the end of `void-js` source file and expected token is not found.
	 *
	 * Treated as a fatal error.
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	Missing,
}

/**
 * {@link VoidIdPrefix} to generate unqiue identifiers.
 */

export const VOID_ID_PREFIX: VoidIdPrefix = '_$';

/**
 * Added to preprocessed code when block of components' body starts.
 */
export const COMPONENT_BLOCK_START = '=>{';

/**
 * Added to start of component's block body for fast moving props from parameters to variable in transfrom phase.
 *
 * Includes a semicolon to exactly create an expression statement in transform phase's AST.
 */

export const PROPS_PLACEHOLDER = '0;';

/**
 * Variety of `PreprocessIR` nodes.
 */

export const enum IrNodeType {
	/**
	 * Includes arbitrary user typescript code from IR node start to end positions.
	 */
	UserCode,
	Signal,
	Effect,
	Memo,
	Component,

	PropsRef,
	PropsSignal,
	PropsMemo,

	/**
	 * Means {@link PROPS_PLACEHOLDER} is needed to be added to preprocessed code.
	 *
	 *
	 *
	 *
	 *
	 */

	PropsPlaceholder,

	/**
	 *
	 * Means {@link COMPONENT_BLOCK_START} is needed to be added to preprocessed code.
	 */

	ComponentBlockStart,

	RecoveredError,
}

/**
 * Offsets of a `PreprocessIR` node.
 *
 * ```typescript
 * const irType = ir[IrNodeOffset.IrNodeType];
 * const nodeStart = ir[IrNodeOffset.Start];
 * if(irType === IrNodeType.Component) {
 *   const componentName = ir[IrNodeOffset.ComponentName];
 * }
 * ```
 */
export const enum IrNodeOffset {
	IrType,
	Start,
	End,

	ComponentName = 3,
	RecoveredReplacement = 3,

	/**
	 * Quantity of {@link ir} elements base node (signal, memo, effect) occupies.
	 */
	BaseSize = 3,
	/**
	 * Quantity of {@link ir} elements {@link IrNodeType.Component} occupies.
	 */
	ComponentSize = 4,
	/**
	 * Quantity of {@link ir} elements {@link IrNodeType.RecoveredError} occupies.
	 */
	RecoveredSize = 4,
}
