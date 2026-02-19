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

export type PreprocessASTNode = UserCodeNode | VoidKeywordNode;

export type PreprocessASTNodeType =
    | 'UserCode'
    | 'Signal'
    | 'Effect'
    | 'Computation';

type UserCodeNode = PreprocessASTNodeBase<'UserCode'> & { value: string };

type VoidKeywordNode = PreprocessASTNodeBase<'Signal'> & {
    /**
     * End position of `VoidKeyword` token in `void-js` source file.
     */

    keywordTokenEnd: number;
};

type PreprocessASTNodeBase<T extends PreprocessASTNodeType> = { type: T };
