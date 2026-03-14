import { describe, it, expect } from 'bun:test';

import {
    generateUniqueIdentifier,
    handleProps,
} from '../../preprocessor/utils';

describe('generateKeywordLabel', () => {
    it('should not have a collision if there is identifier with the same name in `identifiers` argument', () => {
        expect(
            generateUniqueIdentifier(
                new Set(['a', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6']),

                'a',
            ),
        ).toBe('a7');
    });

    it('should return the same `labelPrefix` if there is not any collision in `identifiers` argument', () => {
        const prefix = 'b';

        expect(generateUniqueIdentifier(new Set(['a']), prefix)).toBe(prefix);
    });
});

describe('handleProps', () => {
    it('should return not a full props if brackets in source are interrupted or not valid', () => {
        const unclosedSource = '( ( ( ( ( (';

        expect(
            handleProps(
                { source: unclosedSource, pos: 1, isRegExpAllowed: true },
                0,
            ),
        ).toBe(unclosedSource);

        const oneMissingSource = '( ( ( ( ( ( ) ) ) ) )';

        expect(
            handleProps(
                {
                    source: oneMissingSource,

                    pos: 1,

                    isRegExpAllowed: true,
                },

                0,
            ),
        ).toBe(oneMissingSource);
    });
});
