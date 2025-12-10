type BasicToken<TokenType extends string> = { type: TokenType; value: string };

export type HighLevelTokenType = 'SCRIPT' | 'MARKUP';

/**
 * Token type of high level `.vd` source code.
 *
 * @example
 * ```tsx
 * <markup> text </markup> // Token: { type: 'MARKUP', value: 'text' }
 * ```
 */
export type HighLevelToken = BasicToken<HighLevelTokenType>;

/**
 * The type of block of high level `.vd` source code.
 */
export type BlockType = 'script' | 'markup';
