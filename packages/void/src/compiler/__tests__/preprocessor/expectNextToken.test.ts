import { describe, it, expect } from 'bun:test';

import { getNextToken, expectNextToken } from '../../preprocessor/preprocess';

import { CompileError, getLineIndexes } from '../../errors';
import type { PreprocessToken } from '../../preprocessor/types';

describe('expectNextToken', () => {
    it('should mutate provided `errors` with an error with provided message', () => {
        const source = 'abc';
        const errors: CompileError[] = [];
        const message = 'MESSAGEOFANERROR';

        expectNextToken(
            { source, pos: 0, isRegExpAllowed: true },
            getLineIndexes(source),
            errors,
            'Empty',
            'not abc' satisfies 'not abc' extends 'abc' ? never : string,
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

            'Identifier',
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

            'Punctuator',
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

                'Identifier',
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
                'Identifier',
                null,
                'error',
            ),
        ).toEqual(nextToken as PreprocessToken);
    });
});
