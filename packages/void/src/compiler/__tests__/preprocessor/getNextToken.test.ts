import { describe, it, expect } from 'bun:test';

import { getNextToken } from '../../preprocessor/preprocess';

import type { PreprocessContext } from '../../preprocessor/types';

describe('getNextToken', () => {
    it('should return `null` if there is not any content after `context.pos` in `source`', () => {
        const emptySource = '                   ';

        expect(
            getNextToken(emptySource, { pos: 0, isRegExpAllowed: true }),
        ).toBe(null);

        const contentfullSource = 'ab + c';
        const mixedSource = contentfullSource + emptySource;

        expect(
            getNextToken(mixedSource, {
                pos: contentfullSource.length,
                isRegExpAllowed: true,
            }),
        ).toBe(null);
    });

    it('should return only the first token that is after `context.pos` in `source`', () => {
        const source = "a +  1 + ''";

        const context: PreprocessContext = {
            pos: 0,

            isRegExpAllowed: true,
        };

        expect(getNextToken(source, context)).toEqual({
            type: 'Identifier',
            value: 'a',

            start: 0,

            end: 1,
        });

        expect(getNextToken(source, context)).toEqual({
            type: 'Punctuator',

            value: '+',

            start: 2,

            end: 3,
        });

        expect(getNextToken(source, context)?.type).toBe('Literal');

        expect(getNextToken(source, context)).toEqual({
            type: 'Punctuator',

            value: '+',

            start: 7,

            end: 8,
        });

        expect(getNextToken(source, context)?.type).toBe('Literal');

        expect(getNextToken(source, context)).toBe(null);
    });

    describe('RegExp', () => {
        it("should skip whole `source` if there is only RegExp's", () => {
            const source = '/c/';

            const context: PreprocessContext = {
                pos: 0,

                isRegExpAllowed: true,
            };

            expect(getNextToken(source, context)).toBe(null);
        });

        it('should distinguish RegExp and division', () => {
            const allowedSources: string[] = [
                '/^/',

                '( /^/',

                '{ /^/',

                '} /^/',

                '[ /^/',

                ', /^/',

                '; /^/',
            ];

            for (const source of allowedSources) {
                const context: PreprocessContext = {
                    pos: 0,
                    isRegExpAllowed: true,
                };

                getNextToken(source, context);

                expect(getNextToken(source, context)).toBe(null);
            }

            const notAllowedSources: string[] = [
                'a /^/',
                '"" /^/',

                '1 /^/',

                ') /^/',

                '] /^/',

                '+ /^/',
            ];

            for (const source of notAllowedSources) {
                const context: PreprocessContext = {
                    pos: 0,

                    isRegExpAllowed: true,
                };

                getNextToken(source, context);

                const division = getNextToken(source, context);

                expect(division?.type).toBe('Punctuator');
                expect(division?.value).toBe('/');
            }
        });
    });

    describe('screening', () => {
        it('should understand screening in strings and RegExp', () => {
            const stringSource = '"abc\\"a"';

            expect(
                getNextToken(stringSource, { pos: 0, isRegExpAllowed: true }),
            ).toEqual({
                type: 'Literal',
                value: '',
                start: 0,
                end: stringSource.length,
            });

            const regexpSource = '/a\//';

            expect(
                getNextToken(
                    regexpSource,

                    { pos: 0, isRegExpAllowed: true },
                ),
            ).toBe(null);
        });
    });
});
