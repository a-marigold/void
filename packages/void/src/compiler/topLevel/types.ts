export type TopLevelToken = {
    type: TopLevelTokenType;

    /**
     * Original value of `TopLevelToken` from `source` string.
     */
    value: string;

    /**
     * Start position in `source` string.
     */

    start: number;
    /**
     * End position in `source` string.
     */
    end: number;
};

/**
 * Variety of `TopLevelToken` types.
 */
export type TopLevelTokenType = 'Identifier' | 'Operator' | 'Component';
