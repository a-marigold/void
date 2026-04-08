import { describe, it, expect } from 'bun:test';

import {
    getNextToken,
    expectNextToken,
} from '../../../phases/preprocessor/tokens';

import { CompileError, getLineIndexes } from '../../../errors';
import type { PreprocessToken } from '../../../phases/preprocessor/types';
import {
    PreprocessTokenType,
    TokenCode,
} from '../../../phases/preprocessor/constants';

describe('expectNextToken', () => {
    it('should return correct code from `tokenErrorCodes` and add instance of CompileError to `errors`', () => {
        const errors: CompileError[] = [];

        const emptySource = '';
        expect(
            expectNextToken(
                { source: emptySource, pos: 0, isRegExpAllowed: true },
                getLineIndexes(emptySource),
                errors,

                PreprocessTokenType.Identifier,
                'abc',

                'error',
            ),
        ).toBe(TokenCode.Missing);

        const unexpectedSource = '16;';

        expect(
            expectNextToken(
                {
                    source: unexpectedSource,

                    pos: 0,
                    isRegExpAllowed: true,
                },
                getLineIndexes(unexpectedSource),

                errors,

                PreprocessTokenType.Identifier,

                'abc',

                'error',
            ),
        ).toBe(TokenCode.Unexpected);

        expect(errors.every((error) => error instanceof CompileError)).toBe(
            true,
        );
    });

    it('should mutate provided `errors` with an error with provided message', () => {
        const source = 'abc';
        const errors: CompileError[] = [];

        const message = 'MESSAGEOFANERROR';

        expectNextToken(
            { source, pos: 0, isRegExpAllowed: true },
            getLineIndexes(source),
            errors,
            PreprocessTokenType.Empty,
            'not abc' satisfies 'not abc' extends typeof source
                ? never
                : string,
            message,
        );

        expect(errors.length).toBe(1);
        expect(errors[0]).toBeInstanceOf(CompileError);
        expect(errors[0].message).toBe(message);
    });

    it('should add CompileError instance to `errors` if `expectedType` argument does not equal to next token `type`', () => {
        const errors: CompileError[] = [];

        expectNextToken(
            { source: '+', pos: 0, isRegExpAllowed: true },
            getLineIndexes('+'),
            errors,

            PreprocessTokenType.Identifier,
            null,
            'abc',
        );

        expect(errors.length).toBe(1);
    });

    it('should add CompileError instance to `errors` if `expectedValue` argument does not equal to next token `value`', () => {
        const source = '+';
        const errors: CompileError[] = [];

        expectNextToken(
            { source, pos: 0, isRegExpAllowed: true },

            getLineIndexes(source),

            errors,

            PreprocessTokenType.Punctuator,

            '-',

            'abc',
        );

        expect(errors.length).toBe(1);
    });

    it('should return the next token of `source` if `expectedType` and `expectedValue` arguments equal to next token properties', () => {
        const source = 'abc';
        const nextToken = getNextToken({
            source,
            pos: 0,
            isRegExpAllowed: true,
        });

        expect(
            expectNextToken(
                {
                    source,
                    pos: 0,
                    isRegExpAllowed: true,
                },
                getLineIndexes(source),
                [],

                PreprocessTokenType.Identifier,
                source,

                'error',
            ),
        ).toEqual(nextToken as PreprocessToken);
    });

    it('should correctly handle cases when `expectedType` is valid and `expectedValue` is null', () => {
        const source = 'a';

        const nextToken = getNextToken({
            source,
            pos: 0,
            isRegExpAllowed: true,
        });

        expect(
            expectNextToken(
                { source, pos: 0, isRegExpAllowed: true },
                getLineIndexes(source),
                [],
                PreprocessTokenType.Identifier,
                null,
                'error',
            ),
        ).toEqual(nextToken as PreprocessToken);
    });
});
