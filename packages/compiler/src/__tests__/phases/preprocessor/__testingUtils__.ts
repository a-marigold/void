import type { TokenContext } from '../../../phases/preprocessor';
import { TokenType } from '../../../phases/preprocessor/constants';

/**
 * @returns {TokenType} {@link TokenType} with {@link TokenType.Start}.
 */
export const mockPreprocessContext = (overrides: Partial<TokenContext>): TokenContext => ({
	source: '',
	pos: 0,

	isRegExpAllowed: true,

	currentToken: {
		type: TokenType.Start,
		value: '',
		start: 0,
		end: 0,
	},

	...overrides,
});
