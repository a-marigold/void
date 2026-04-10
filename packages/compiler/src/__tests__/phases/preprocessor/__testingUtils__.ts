import type { PreprocessContext } from '../../../phases/preprocessor';

import { PreprocessTokenType } from '../../../phases/preprocessor/constants';

/**
 * @returns {PreprocessTokenType} {@link PreprocessTokenType} with {@link PreprocessTokenType.Start}.
 */
export const mockPreprocessContext = (
    overrides: Partial<PreprocessContext>,
): PreprocessContext => ({
    source: '',
    pos: 0,

    isRegExpAllowed: true,

    currentToken: {
        type: PreprocessTokenType.Start,
        value: '',
        start: 0,
        end: 0,
    },

    ...overrides,
});
