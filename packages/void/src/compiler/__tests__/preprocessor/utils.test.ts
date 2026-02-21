import { describe, it, expect } from 'bun:test';

import { generateKeywordLabel } from '../../preprocessor/utils';

describe('generateKeywordLabel', () => {
    it('should not have a collision if there is identifier with the same name in `identifiers` argument', () => {
        expect(
            generateKeywordLabel(
                new Set(['a', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6']),
                'a',
            ),
        ).toBe('a7');
    });

    it('should return the same `labelPrefix` if there is not any collision in `identifiers` argument', () => {
        const prefix = 'b';

        expect(generateKeywordLabel(new Set(['a']), prefix)).toBe(prefix);
    });
});
