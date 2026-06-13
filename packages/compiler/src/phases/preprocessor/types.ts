import type { DecodedSourceMap } from '@jridgewell/gen-mapping';
import type {
	RuntimeApiName,
	VoidKeyword,
	VoidConstruction,
	VoidIdPrefix,
	PropsVoidKeyword,
} from '@void/shared';

import type { CompileError } from '../../errors';

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
	isRegExpAllowed: boolean;

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
 * IR of `void-js` syntax from which `preprocess` generates valid typescript.
 *
 * Order of nodes:
 * - `Base` (base order and order of signal, memo, effect):
 *   - {@link IrNodeType} of node.
 *   - Start pos in {@link source}.
 *   - End pos in {@link source}.
 *
 * - `Component`:
 *   - ...`Base`.
 *   - Component Name string.
 *   - Props string.
 *
 * - `RecoveredError`:
 *   - ...`Base`.
 *   - Replacement (string to replace error in source from Node start to end).
 *
 * @example
 * ```typescript
 * // `source`
 * 'signal count = 16000; export <Button> () {}'
 *
 * ir.push(
 *   IRNodeType.Signal, // Type of node
 *   0, // Start of node in source
 *   6, // End of node in source
 * );
 *
 * ir.push(
 *   IRNodeType.Component,
 *   28,
 *   46,
 *   'Button',
 *   '()',
 * );
 * ```
 *
 */

export type PreprocessIR = (IrNodeType | number | string)[];

/**
 * {@link PreprocessResult.idContext}.
 */

type IdContext = {
	/**
	 * Quantity of created unique identifiers with `void-js` prefix `_$`.
	 */
	uniqueIdCount: number;
};

/**
 *
 * Result of `preprocess` function.
 */

export type PreprocessResult = {
	/**
	 *
	 * Imports of `void-js` API are ALWAYS on the first line.
	 *
	 * The first Variable Declaration is ALWAYS with `signal`, `effect`, component unique {@link PreprocessResult.labels}.
	 *
	 *  @example
	 *
	 * ```typescript
	 * preprocess(`
	 * signal count: number = 10;
	 *
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
	labels: Readonly<Record<UniqueId, LabelType>>;

	/**
	 * Used to generate unique identifiers during compilation.
	 */
	idContext: IdContext;

	/**
	 * Object with unique names of `void-js` runtime API to be imported in compiled file.
	 *
	 */

	runtimeApiNames: Readonly<Record<RuntimeApiName, UniqueId>>;
};

/**
 * Variety of labels appeared in preprocessed components.
 *
 *
 *
 *
 *
 */
export type PropsLabelType = `prop${Capitalize<PropsVoidKeyword>}`;
// TODO: make label type numeric const enum
/**
 *
 * Variety of labels that appear in preprocessed code to identify `void-js` syntax.
 */

export type LabelType = Exclude<VoidKeyword, 'ref'> | VoidConstruction | PropsLabelType;

/**
 *
 *
 *
 *
 *
 *
 *
 *
 *
 * Structure of unique identifier name that appears in {@link PreprocessResult.runtimeApiNames} and {@link PreprocessResult.labels}.
 */

export type UniqueId = `${VoidIdPrefix}${number}`;
