import type { SourceMap } from 'magic-string';

import type { VoidKeyword, RuntimeApiName } from '../types';

import type { CompileError, compileErrorCodes } from '../errors';
/**
 * Token that appears on preprocessing phase
 */
export type PreprocessToken = {
    type: PreprocessTokenType;

    /**
     *
     * Original value of `TopLevelToken` from `source` string.
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
 * Variety of `PreprocessToken` types.
 *
 * `Empty` Token means token that is not needed for preprocessor logic (`Comment`, `RegExp` and the like).
 */

export type PreprocessTokenType =
    | 'Identifier'
    | 'VoidKeyword'
    | 'Literal'
    | 'Punctuator'
    | 'Empty';
/**
 *
 *
 *
 *  Object that connects `preprocess` function with its utils.
 * For example, `getNextToken` mutates `PreprocessContext.pos`.
 */

export type PreprocessContext = {
    source: string;

    pos: number;

    /**
     *
     * If the last token is `Literal`, closed bracket or `Identifier`, this flag is `false`.
     */
    isRegExpAllowed: boolean;
};

/**
 *
 *
 * Nodes that appear in `preprocess` function.
 *
 *
 *
 * `PreprocessAST` is a flattened array because there is not any nested nodes.
 *
 */

export type PreprocessASTNode =
    | SignalNode
    | EffectNode
    | ComputationNode
    | ComponentNode
    | RecoveredNode;

type PreprocessASTNodeType =
    | 'Signal'
    | 'Effect'
    | 'Computation'
    | 'Component'
    | 'Recovered';

type SignalNode = PreprocessASTNodeBase<'Signal'>;
type EffectNode = PreprocessASTNodeBase<'Effect'>;
type ComputationNode = PreprocessASTNodeBase<'Computation'>;

/**
 *
 * Node that was recovered because of an error.
 */
type RecoveredNode = PreprocessASTNodeBase<'Recovered'> & {
    /**
     * String with recovered code.
     */
    value: string;
};

type ComponentNode = PreprocessASTNodeBase<'Component'> & {
    /**
     * Name of component.
     */

    name: string;

    /**
     * `props` property includes circle brackets of them.
     *
     * Circle brackets are included to more conventient transforming.
     *
     * @example
     * ```tsx
     * export <App> ({ a: b() }: PropsInterface) {
     * };
     * ```
     *
     * `ComponentNode.props` will be:
     *
     * ```typescript
     * '({ a: b() }: PropsInterface)'
     * ```
     */

    props: string;
};

/**
 *
 *
 *
 * Basic type of `PreprocessASTNode`.
 *
 *
 */
type PreprocessASTNodeBase<T extends PreprocessASTNodeType> = {
    type: T;
    start: number;
    end: number;
};

/**
 *
 * Result of `preprocess` function.
 *
 */
export type PreprocessResult = {
    /**
     *
     * #### Transformed source code to be used in parser.
     * #### The first line ALWAYS contains a variable declaration with `signal`, `effect` and `computation` unique labels.
     * #### There are `void-js` keyword labels before expressions and statements which are used with `void-js` keywords in the source file.
     *
     *
     * @example
     *
     * ```markdown
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
     * Preprocessed:
     *
     * ```typescript
     * let _$signal, _$effect, _$computation; // ALWAYS on the first line
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
     * ```
     */
    code: string;

    /**
     *
     * Source map with `void-js` source code changes.
     */
    sourceMap: SourceMap;

    errors: CompileError[];

    /**
     *
     * `Map` with labels for keywords to identify usage of `void-js` keywords in parser.
     *
     */

    keywordLabels: Map<string, VoidKeyword>;

    /**
     *
     * Object with unique names for `void-js` reactivity API to prevent collisions.
     *
     *
     */

    runtimeApiNames: Map<RuntimeApiName, string>;
};
