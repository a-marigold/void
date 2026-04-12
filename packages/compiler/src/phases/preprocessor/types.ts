import type { DecodedSourceMap } from '@jridgewell/gen-mapping';

import type { TokenType, IrNodeType } from './constants';

import type { VoidKeyword, VoidConstruction, RuntimeApiName } from '../../types';
import type { CompileError } from '../../errors';

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
     *
     * Transformed source code to be used in parser.
     *
     * `void-js` API imports are on the first line.
     *
     * The first Variable Declaration is ALWAYS with `signal`, `effect` and `computation` unique labels.
     *
     * There are `void-js` syntax labels before expressions and statements which are used with `void-js` keywords in the source file.
     *
     *  @example
     *
     * ```typescript
     * signal count: number = 10;
     *
     * computation multiplied: number = () => count * 16;
     *
     * effect () => {
     *   console.log(multiplied);
     * };
     *
     * ```
     *
     *
     * Preprocessed:
     *
     *
     * ```typescript
     * import { ... } from 'VOID-JS_API'; // imports are on the first line
     *
     * let _$signal, _$effect, _$computation, _$component; // initialized labels, the first variable declaration
     *
     * _$signal; // ALWAYS before a variable declaration that is used with `signal` keyword in source file
     * let count: number = 10;
     *
     * _$computation; // behaviour is like `signal`
     * const multiplied: number = () => count * 16;
     *
     * _$effect = () => { // effects are assigned to their label, they are not like signals and computatons
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
     *
     * Source map with `void-js` source code changes.
     */
    sourceMap: DecodedSourceMap;

    errors: CompileError[];

    /**
     *
     * Object with `void-js` keywords and syntax constructions that appear in assignment expressions in preprocessed code.
     *
     * @see {@link AssignableLabelType}
     *
     */
    assignableLabels: Readonly<Record<string, AssignableLabelType>>;

    /**
     *
     *
     * Object with `void-js` keywords and syntax constructions that appear as identifiers in preprocessed code.
     *
     * @see {@link UnassignableLabelType}
     *
     *
     */
    unassignableLabels: Readonly<Record<string, UnassignableLabelType>>;

    /**
     *
     *
     * `Set` with ALL identifiers in `void-js` source file.
     */

    identifiers: Set<string>;

    /**
     *
     *
     *
     *
     * Object with unique names of `void-js` runtime API to be imported in compiled file.
     *
     */

    runtimeApiNames: Readonly<Record<RuntimeApiName, string>>;
};

/**
 *
 *
 *
 *
 *
 * Variety of labels that appears in preprocessed code to identify `void-js` syntax later (for example, in transformer phase).
 *
 *
 *
 */

export type LabelType = VoidKeyword | VoidConstruction;

/**
 *
 * Variety of labels of `void-js` syntax that transformed to assignment expression.
 *
 * While {@link AssignableLabelType} labels are transformed to assignment expression - `_$effect = () => {}`,
 * {@link UnassignableLabelType} labels are transformed to identifiers - `_$signal; let count = 16;`.
 *
 * @example
 *
 * ```tsx
 * effect () => {} // assignable
 *
 * signal count = 16; // NOT assignable
 *
 * computation multiplied = () => count * 10; // NOT assignable
 *
 * export <Component> () { // NOT assignable construction
 *   return <div> </div>;
 * }
 * ```
 *
 *
 *
 */
export type AssignableLabelType = Extract<LabelType, 'effect'>;

/**
 *
 * @see {@link AssignableLabelType}
 */
export type UnassignableLabelType = Extract<LabelType, 'signal' | 'computation' | 'component'>;
