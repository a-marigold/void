import { describe, it, expect } from 'bun:test';

import { getNextToken } from '../../preprocessor/preprocess';

import type { PreprocessContext } from '../../preprocessor/types';
describe('getNextToken', () => {
    it('should return `null` if there is not any content after `context.pos` in `source`', () => {
        const emptySource = '                   ';

        expect(
            getNextToken(
                emptySource,

                { pos: 0, isRegExpAllowed: true },

                emptySource.length,
            ),
        ).toBe(null);

        const contentfullSource = 'ab + c';

        const mixedSource = contentfullSource + emptySource;

        expect(
            getNextToken(
                mixedSource,
                {
                    pos: contentfullSource.length,
                    isRegExpAllowed: true,
                },

                mixedSource.length,
            ),
        ).toBe(null);
    });

    it('should return only the first token that is after `context.pos` in `source`', () => {
        const source = "a +  1 + ''";

        const context: PreprocessContext = {
            pos: 0,
            isRegExpAllowed: true,
        };

        expect(getNextToken(source, context, source.length)).toEqual({
            type: 'Identifier',
            value: 'a',

            start: 0,
            end: 1,
        });

        expect(getNextToken(source, context, source.length)).toEqual({
            type: 'Punctuator',
            value: '+',
            start: 2,
            end: 3,
        });

        expect(getNextToken(source, context, source.length)?.type).toBe(
            'Literal',
        );

        expect(getNextToken(source, context, source.length)).toEqual({
            type: 'Punctuator',

            value: '+',

            start: 7,
            end: 8,
        });

        expect(getNextToken(source, context, source.length)?.type).toBe(
            'Literal',
        );

        expect(getNextToken(source, context, source.length)).toBe(null);
    });
});
