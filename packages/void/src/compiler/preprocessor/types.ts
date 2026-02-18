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
    | 'Literal'
    | 'Operator'
    | 'Empty';

/**
 *
 * All the new keywords that `void-js` provides.
 */

export type VoidKeyword = 'signal' | 'effect' | 'computation';

export type SyntaxHandler = (identifiers: Identifiers) => string;

/**
 *
 * `Map<identfier name, quantity of identifiers with this name>`
 *
 */

export type Identifiers = Map<string, number>;
