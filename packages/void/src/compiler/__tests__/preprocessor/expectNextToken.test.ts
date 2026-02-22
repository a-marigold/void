import { describe, it, expect } from 'bun:test';

import { getNextToken, expectNextToken } from '../../preprocessor/preprocess';

import { CompileError, compileErrors } from '../../errors';
import type { PreprocessToken } from '../../preprocessor/types';

describe('expectNextToken', () => {
    it.serial(
        'should throw CompileError instance if `expectedType` argument does not equal to next token `type`',
        () => {
            expect.assertions(1);

            try {
                expectNextToken(
                    '+',

                    { pos: 0, isRegExpAllowed: true },

                    'Identifier',
                    null,

                    'abc',
                );
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);
            }
        },
    );

    it.serial(
        'should throw CompileError instance if `expectedValue` argument does not equal to next token `value`',
        () => {
            expect.assertions(1);

            try {
                expectNextToken(
                    '+',
                    { pos: 0, isRegExpAllowed: true },
                    'Punctuator',
                    '-',

                    'abc',
                );
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);
            }
        },
    );

    it('should return the next token of `source` if `expectedType` and `expectedValue` arguments equal to next token properties', () => {
        const source = 'abc';

        const nextToken = getNextToken(source, {
            pos: 0,
            isRegExpAllowed: true,
        });

        expect(
            expectNextToken(
                source,

                {
                    pos: 0,

                    isRegExpAllowed: true,
                },

                'Identifier',
                source,

                'error',
            ),
        ).toEqual(nextToken as PreprocessToken);
    });

    it('should correctly handle cases when `expectedType` is valid and `expectedValue` is null', () => {
        const source = 'a';

        const nextToken = getNextToken(source, {
            pos: 0,
            isRegExpAllowed: true,
        });

        expect(
            expectNextToken(
                source,
                { pos: 0, isRegExpAllowed: true },
                'Identifier',
                null,
                'error',
            ),
        ).toEqual(nextToken as PreprocessToken);
    });
});
