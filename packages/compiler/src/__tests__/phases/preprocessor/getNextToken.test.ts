import { describe, it, expect } from 'bun:test';

import { TokenType } from '../../../phases/preprocessor/constants';
import { getNextToken } from '../../../phases/preprocessor/tokens';

import { mockPreprocessContext } from './__testingUtils__';

describe('getNextToken', () => {
    it('the token type should be `End` if the `source` is empty', () => {
        const contextEmpty = mockPreprocessContext({
            source: '',
        });

        getNextToken(contextEmpty);

        expect(contextEmpty.currentToken.type).toBe(TokenType.End);
        const contextTabs = mockPreprocessContext({
            source: '\t\t\n           \n\r\n\t',
        });

        getNextToken(contextTabs);
        expect(contextTabs.currentToken.type).toBe(TokenType.End);
    });

    it('the token should have type `End` if there is not any content after `context.pos` in `source`', () => {
        const context = mockPreprocessContext({
            source: 'a+b\n\n \r\n                     \t\t\t\t\t',
        });

        getNextToken(context);
        getNextToken(context);
        getNextToken(context);
        getNextToken(context);

        expect(context.currentToken.type).toBe(TokenType.End);
    });
    it('should have only the first token that is after `context.pos` in `source`', () => {
        const context = mockPreprocessContext({ source: "a +  1 + ''" });

        const currentToken = context.currentToken;

        getNextToken(context);
        expect(currentToken).toEqual({
            type: TokenType.Identifier,
            value: 'a',
            start: 0,
            end: 1,
        });

        getNextToken(context);
        expect(currentToken).toEqual({
            type: TokenType.Punctuator,
            value: '+',
            start: 2,
            end: 3,
        });

        getNextToken(context);
        expect(currentToken.type).toBe(TokenType.Literal);

        getNextToken(context);
        expect(currentToken).toEqual({
            type: TokenType.Punctuator,
            value: '+',
            start: 7,
            end: 8,
        });

        getNextToken(context);
        expect(currentToken.type).toBe(TokenType.Literal);
    });

    describe('RegExp', () => {
        it('should have an `Empty` token if there is only RegExp in source', () => {
            const context = mockPreprocessContext({ source: '/c/' });

            getNextToken(context);

            expect(context.currentToken.type).toBe(TokenType.Empty);
        });
        it('should distinguish RegExp and division', () => {
            const allowedSources: string[] = [
                '* /^/',
                '( /^/',
                '{ /^/',
                '} /^/',
                '[ /^/',
                ', /^/',
                '; /^/',
                '+ /^/',
                '- /^/',
                '^ /^/',
                '> /^/',
                '> /^/',
                '~ /^/',
            ];

            for (const source of allowedSources) {
                const context = mockPreprocessContext({ source });

                getNextToken(context);

                getNextToken(context);

                expect(context.currentToken.type).toBe(TokenType.Empty);
            }

            const notAllowedSources: string[] = [
                'a  /^/',
                '"" /^/',
                "'' /^/",
                '`` /^/',
                '1  /^/',
                ')  /^/',
                ']   /^/',
                '.  /^/',
            ];

            for (const source of notAllowedSources) {
                const context = mockPreprocessContext({ source });

                getNextToken(context);

                getNextToken(context);

                expect(context.currentToken.type).toBe(TokenType.Punctuator);
                expect(context.currentToken.value).toBe('/');
            }
        });
    });

    describe('screening', () => {
        it('should understand screening in strings and RegExp', () => {
            const stringSource = '"abc\\"a"';

            const stringCtx = mockPreprocessContext({
                source: stringSource,
            });

            getNextToken(stringCtx);
            expect(stringCtx.currentToken).toEqual({
                type: TokenType.Literal,
                value: '',

                start: 0,
                end: stringSource.length,
            });

            const regexpSource = '/a\//';
            const regexpCtx = mockPreprocessContext({ source: regexpSource });

            getNextToken(regexpCtx);
            expect(regexpCtx.currentToken.type).toBe(TokenType.Empty);
        });
    });
});
