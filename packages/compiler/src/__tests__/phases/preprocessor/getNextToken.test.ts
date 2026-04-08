import { describe, it, expect } from 'bun:test';

import { PreprocessTokenType } from '../../../phases/preprocessor/constants';
import { getNextToken } from '../../../phases/preprocessor/tokens';

import type { PreprocessContext } from '../../../phases/preprocessor/types';

describe('getNextToken', () => {
    it('should return `null` if there is not any content after `context.pos` in `source`', () => {
        const emptySource = '                   ';

        expect(
            getNextToken({
                source: emptySource,
                pos: 0,
                isRegExpAllowed: true,
            }),
        ).toBe(null);

        const contentfullSource = 'ab + c';
        const mixedSource = contentfullSource + emptySource;

        expect(
            getNextToken({
                source: mixedSource,
                pos: contentfullSource.length,
                isRegExpAllowed: true,
            }),
        ).toBe(null);
    });

    it('should return only the first token that is after `context.pos` in `source`', () => {
        const source = "a +  1 + ''";

        const context: PreprocessContext = {
            source,
            pos: 0,

            isRegExpAllowed: true,
        };

        expect(getNextToken(context)).toEqual({
            type: PreprocessTokenType.Identifier,
            value: 'a',

            start: 0,

            end: 1,
        });

        expect(getNextToken(context)).toEqual({
            type: PreprocessTokenType.Punctuator,

            value: '+',

            start: 2,

            end: 3,
        });

        expect(getNextToken(context)?.type).toBe(PreprocessTokenType.Literal);

        expect(getNextToken(context)).toEqual({
            type: PreprocessTokenType.Punctuator,

            value: '+',

            start: 7,

            end: 8,
        });

        expect(getNextToken(context)?.type).toBe(PreprocessTokenType.Literal);

        expect(getNextToken(context)).toBe(null);
    });

    describe('RegExp', () => {
        it("should skip whole `source` if there is only RegExp's", () => {
            const source = '/c/';

            const context: PreprocessContext = {
                source,
                pos: 0,

                isRegExpAllowed: true,
            };

            expect(getNextToken(context)).toBe(null);
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
                    source,
                    pos: 0,
                    isRegExpAllowed: true,
                };

                getNextToken(context);

                expect(getNextToken(context)?.type).toBe(
                    PreprocessTokenType.Empty,
                );
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
                    source,
                    pos: 0,

                    isRegExpAllowed: true,
                };

                getNextToken(context);

                const division = getNextToken(context);

                expect(division?.type).toBe(PreprocessTokenType.Punctuator);

                expect(division?.value).toBe('/');
            }
        });
    });

    describe('screening', () => {
        it('should understand screening in strings and RegExp', () => {
            const stringSource = '"abc\\"a"';

            expect(
                getNextToken({
                    source: stringSource,
                    pos: 0,
                    isRegExpAllowed: true,
                }),
            ).toEqual({
                type: PreprocessTokenType.Literal,
                value: '',
                start: 0,
                end: stringSource.length,
            });

            const regexpSource = '/a\//';

            expect(
                getNextToken({
                    source: regexpSource,
                    pos: 0,
                    isRegExpAllowed: true,
                }),
            ).toBe(null);
        });
    });
});
