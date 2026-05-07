import type { DecodedSourceMap } from '@jridgewell/gen-mapping';

import type { CompileError } from '../../errors';
import type { VoidKeyword, VoidConstruction, RuntimeApiName } from '../../types';

import type { TokenType, IrNodeType } from './constants';

/**
 *
 * Token that appears after `getNextToken` function.
 *
 *
 */

export type Token = {
	type: TokenType;
	/**
	 * Original value from `source` string.
	 */
	value: string;
	/**
	 *
	 *
	 * Start position in `source` string.
	 */
	start: number;
	/**
	 *
	 * End position in `source` string.
	 */
	end: number;
};

/**
 *
 *
 *
 * Object that connects `preprocess` function with its utils.
 *
 * For example, `getNextToken` mutates `PreprocessContext.pos`.
 */

export type PreprocessContext = {
	/**
	 *
	 * `void-js` source code.
	 */
	readonly source: string;

	pos: number;

	/**
	 *
	 * Flag that shows is a RegExp allowed in the current `pos` of `source`.
	 */
	isRegExpAllowed: boolean | 1 | 0;

	/**
	 * The last token processed `getNextToken` with the context.
	 *
	 * That is always the same object, `getNextToken` only changes fields.
	 *
	 * Used not to create new token objects on every `getNextToken` call.
	 */

	readonly currentToken: Token;
};

/**
 * Intermediate Representation for generating preprocessed code.
 *
 * It is an array with numbers for better performance.
 *
 * Order of a node:
 * - The first element is {@link IrNodeType} of node.
 * - The second element is start position of node.
 * - The third element is end position of node.
 *
 * @example
 *
 * ```typescript
 * // `source`
 * 'signal count = 16000;'
 *
 *
 * // usage
 * const ir: PreprocessIR = [];
 *
 * ir.push(
 *   IRNodeType.Signal, // Type of node
 *   0, // The start of node in source
 *   6, // The end of node in source
 * );
 * ```
 */
export type PreprocessIR = number[];

/**
 *
 * Result of `preprocess` function.
 */

export type PreprocessResult = {
	/**
	 * Imports of `void-js` API are on the first line.
	 *
	 * The first Variable Declaration is ALWAYS with `signal`, `effect`, component unique {@link PreprocessResult.labels}.
	 *
	 *  @example
	 *
	 * ```typescript
	 * preprocess(`
	 * signal count: number = 10;
	 * memo multiplied: number = () => count * 16;
	 *
	 * effect () =>{
	 *   console.log(multiplied);
	 * }`);
	 * ```
	 * Preprocessed:
	 * ```typescript
	 * import { ... } from 'VOID-JS_API'; // imports are on the first line
	 *
	 * let _$signal, _$effect, _$memo, _$component; // initialized labels - the first variable declaration
	 *
	 * _$signal; // to identify the signal in parser
	 * let count: number = 10;
	 *
	 * _$memo;
	 * const multiplied: number = () => count * 16;
	 *
	 * _$effect;
	 * () => {
	 *   console.log(multiplied);
	 * };
	 *
	 * _$component;
	 * export <App> () {
	 *   return <div> </div>;
	 * };
	 *
	 *
	 * ```
	 */
	code: string;

	/**
	 * Source map with `void-js` source code changes.
	 */

	sourceMap: DecodedSourceMap;

	errors: CompileError[];

	/**
	 * Object with {@link LabelType|labels} that appear before `void-js` keywords and syntax constructions in {@link PreprocessResult.code}.
	 *
	 * Used to identifiy `void-js` keywords and syntax constructions in preprocessed code.
	 *
	 *  @example
	 *
	 *
	 * ```typescript
	 * preprocess('signal count = 16; export <Button> () { return <button/>; };');
	 * ```
	 * Output:
	 *
	 * ```typescript
	 * let _$sgn, _$cmpn;
	 *
	 * _$sgn;
	 * let a = 16;
	 *
	 * _$cpmn;
	 * export const Button = () => { return <button />; };
	 * ```
	 */
	labels: Readonly<Record<string, LabelType>>;

	/**
	 *
	 *
	 * `Set` with ALL identifiers in `void-js` source file.
	 */

	identifiers: Set<string>;

	/**
	 * Object with unique names of `void-js` runtime API to be imported in compiled file.
	 *
	 *
	 */

	runtimeApiNames: Readonly<Record<RuntimeApiName, string>>;
};

/**
 * Variety of labels that appear in preprocessed code to identify `void-js` constructions.
 */

export type LabelType = VoidKeyword | VoidConstruction;
