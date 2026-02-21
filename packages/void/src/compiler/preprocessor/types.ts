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
 * All the new keywords that `void-js` provides.
 *
 */

export type VoidKeyword = 'signal' | 'effect' | 'computation';

/**
 * Object that connects `preprocess` function with its utils.
 * For example, `getNextToken` mutates `PreprocessContext.pos`.
 *
 */
export type PreprocessContext = {
    pos: number;
    /**
     * If the last token is `Literal`, closed bracket or `Identifier`, this flag is `true`.
     */

    isRegExpAllowed: boolean;
};

/**
 *
 *  Nodes that appear in `preprocess` function.
 *
 *
 * `PreprocessAST` is a flattened array because there is not any nested nodes.
 */

export type PreprocessASTNode =
    | UserCodeNode
    | SignalNode
    | EffectNode
    | ComputationNode
    | ComponentNode;

type PreprocessASTNodeType =
    | 'UserCode'
    | 'Signal'
    | 'Effect'
    | 'Computation'
    | 'Component';

type UserCodeNode = PreprocessASTNodeBase<'UserCode'> & { value: string };

type SignalNode = PreprocessASTNodeBase<'Signal'>;
type EffectNode = PreprocessASTNodeBase<'Effect'>;
type ComputationNode = PreprocessASTNodeBase<'Computation'>;

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
 * Basic type of `PreprocessASTNode`.
 *
 *
 */

type PreprocessASTNodeBase<T extends PreprocessASTNodeType> = { type: T };
