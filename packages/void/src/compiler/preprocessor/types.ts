/**
 * Token that appears on preprocessing phase
 */
export type PreprocessToken = {
    type: TopLevelTokenType;

    /**
     *
     * Original value of `TopLevelToken` from `source` string.
     */
    value: string;

    /**
     *
     * Start position in `source` string.
     *
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
 */

export type PreprocessTokenType = 'Identifier' | 'Literal' | 'Operator';

/**
 *
 * All the new keywords that `void-js` provides.
 */
export type VoidKeyword = 'signal' | 'effect' | 'computation';

export type SyntaxHandler = (context: PreprocessContext) => string;

/**
 *
 */
export type PreprocessContext = {};
