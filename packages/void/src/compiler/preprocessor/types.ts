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
    | ComputationNode;

export type PreprocessASTNodeType =
    | 'UserCode'
    | 'Signal'
    | 'Effect'
    | 'Computation';

type UserCodeNode = PreprocessASTNodeBase<'UserCode'> & { value: string };

type SignalNode = PreprocessASTNodeBase<'Signal'>;
type EffectNode = PreprocessASTNodeBase<'Effect'>;
type ComputationNode = PreprocessASTNodeBase<'Computation'>;

/**
 * Basic type of `PreprocessASTNode`.
 *
 *
 */

type PreprocessASTNodeBase<T extends PreprocessASTNodeType> = { type: T };
