import type { SourceMap } from 'magic-string';

import type { tokenErrorCodes } from './constants';

import type {
    VoidKeyword,
    VoidConstruction,
    RuntimeApiName,
} from '../../types';
import type { CompileError } from '../../errors';

/**
 *
 * Token that appears on preprocessing phase
 */
export type PreprocessToken = {
    type: PreprocessTokenType;

    /**
     * Original value of `PreprocessToken` from `source` string.
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
     *
     * End position in `source` string.
     */
    end: number;
};

/**
 *
 * Variety of `PreprocessToken` types.
 *
 * `Empty` Token means it is not needed for preprocessor logic (`Comment`, `RegExp` and the like).
 */
type PreprocessTokenType =
    | 'Identifier'
    | 'VoidKeyword'
    | 'Literal'
    | 'Punctuator'
    | 'Empty';

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
    source: string;

    pos: number;

    /**
     *
     * If the last token is `Literal`, closed bracket or `Identifier`, this flag is `false`.
     */
    isRegExpAllowed: boolean;
};

/**
 * `PreprocessAST` is a flattened array because there is not any nested nodes.
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
 * Used to prevent cascade error by overwriting:
 *
 * `void-js` source file will be overwrited by `replacement` property from `start` to `end` of this node.
 */
type RecoveredNode = PreprocessASTNodeBase<'Recovered'> & {
    /**
     * String that overwrites `void-js` source code from `start` to `end` of this node.
     */
    replacement: string;
};

export type ComponentNode = PreprocessASTNodeBase<'Component'> & {
    /**
     * Name of component.
     *
     */

    name: string;

    /**
     *
     * `props` property includes circle brackets of them.
     *
     * @example
     * ```tsx
     * export <App> ({ a: b() }: PropsInterface) {
     * };
     * ```
     *
     * `ComponentNode.props` will be:
     *
     *
     * ```typescript
     * '({ a: b() }: PropsInterface)'
     * ```
     */

    props: string;
};

type PreprocessASTNodeBase<T extends PreprocessASTNodeType> = {
    type: T;
    start: number;
    end: number;
};

/**
 *
 * Result of `preprocess` function.
 */
export type PreprocessResult = {
    /**
     *
     *
     * #### Transformed source code to be used in parser.
     * #### `void-js` API imports are included in the first line.
     * #### The first variable declaration is ALWAYS with `signal`, `effect` and `computation` unique labels.
     * #### There are `void-js` syntax labels before expressions and statements which are used with `void-js` keywords in the source file.
     *
     * @example
     *
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
     *
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
     *
     * `Map` with `void-js` keywords and syntax constructions that are related with assignment expression.
     *
     *
     * @see {@link AssignableLabelType}
     *
     *
     *
     */

    assignableLabels: Map<string, AssignableLabelType>;

    /**
     *
     * `Map` with `void-js` keywords and syntax constructions that are not related with assignment expression.
     *
     * @see {@link UnassignableLabelType}
     *
     */
    unassignableLabels: Map<string, UnassignableLabelType>;

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
     * Object with unique names of `void-js` runtime API to prevent collisions.
     *
     */

    runtimeApiNames: Map<RuntimeApiName, string>;
};

/**
 *
 *
 *
 *
 *  Variety of labels that appears in preprocessed code to identify `void-js` syntax later (for example, in transformer phase).
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
export type UnassignableLabelType = Extract<
    LabelType,
    'signal' | 'computation' | 'component'
>;

export type TokenErrorCode =
    (typeof tokenErrorCodes)[keyof typeof tokenErrorCodes];
