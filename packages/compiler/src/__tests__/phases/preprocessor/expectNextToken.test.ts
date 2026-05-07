import { describe, it, expect } from 'bun:test';

import { CompileError, getLineIndexes } from '../../../errors';
import { TokenType, TokenCode } from '../../../phases/preprocessor/constants';
import { expectNextToken } from '../../../phases/preprocessor/tokens';

import { mockPreprocessContext } from './__testingUtils__';

describe('expectNextToken', () => {
	it('should return correct `TokenCode` for every variant', () => {
		const errors: CompileError[] = [];
		const emptySource = '';
		expect(
			expectNextToken(
				mockPreprocessContext({ source: emptySource }),
				getLineIndexes(emptySource),
				errors,
				TokenType.Identifier,
				'abc',
				'',
			),
		).toBe(TokenCode.Missing);

		const unexpectedSource = '16;';
		expect(
			expectNextToken(
				mockPreprocessContext({ source: unexpectedSource }),
				getLineIndexes(unexpectedSource),
				errors,
				TokenType.Identifier,
				'abc',
				'',
			),
		).toBe(TokenCode.Unexpected);

		const noErrSource = '16;';
		expect(
			expectNextToken(
				mockPreprocessContext({ source: noErrSource }),
				getLineIndexes(noErrSource),
				errors,
				TokenType.Literal,
				'',
				'',
			),
		).toBe(TokenCode.NoError);
	});

	it('should add CompileError instance to `errors` with provided `message`', () => {
		const source = 'A';

		const errors: CompileError[] = [];

		const message = 'MESSAGEOFANERROR';
		expectNextToken(
			mockPreprocessContext({ source }),
			getLineIndexes(source),
			errors,
			TokenType.Empty,
			'B' satisfies 'B' extends typeof source ? never : string,
			message,
		);

		expect(errors.length).toBe(1);
		expect(errors[0]).toBeInstanceOf(CompileError);
		expect(errors[0].message).toBe(message);
	});

	it('should have an error if `expectedType` argument does not equal to next token `type`', () => {
		const errors: CompileError[] = [];

		expectNextToken(
			mockPreprocessContext({ source: '+' }),
			getLineIndexes('+'),

			errors,
			TokenType.Identifier,
			null,
			'abc',
		);

		expect(errors.length).toBe(1);
	});

	it('should have an error if `expectedValue` argument does not equal to next token `value`', () => {
		const source = '+';
		const errors: CompileError[] = [];

		expectNextToken(
			mockPreprocessContext({ source }),
			getLineIndexes(source),

			errors,
			TokenType.Punctuator,
			'-',
			'abc',
		);

		expect(errors.length).toBe(1);
	});

	it('should not have an error if `expectedType` and `expectedValue` arguments equal to next token properties', () => {
		const source = 'abc';

		expect(
			expectNextToken(
				mockPreprocessContext({ source }),
				getLineIndexes(source),
				[],
				TokenType.Identifier,

				source,
				'error',
			),
		).toBe(TokenCode.NoError);
	});

	it('should correctly handle cases when `expectedType` is valid and `expectedValue` is null', () => {
		const source = 'a';

		expect(
			expectNextToken(
				mockPreprocessContext({ source }),
				getLineIndexes(source),
				[],
				TokenType.Identifier,
				null,
				'error',
			),
		).toBe(TokenCode.NoError);
	});
});
