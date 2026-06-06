import { describe, it, expect } from 'bun:test';

import type { CompileError } from '../../../errors';
import { getLineIndexes } from '../../../errors';
import { TokenType, TokenCode } from '../../../phases/preprocessor/constants';
import { expectNextToken } from '../../../phases/preprocessor/tokens';

import { mockPreprocessContext } from './__testingUtils__';

describe('expectNextToken', () => {
	it('should return correct `TokenCode` for every variant', () => {
		const emptySource = '';

		expect(
			expectNextToken(
				mockPreprocessContext({ source: emptySource }),

				getLineIndexes(emptySource),
				[],
				TokenType.Identifier,
				'abc',
				'Attribute must have a value.',
			),
		).toBe(TokenCode.Missing);

		const unexpectedSource = '16;';
		expect(
			expectNextToken(
				mockPreprocessContext({ source: unexpectedSource }),
				getLineIndexes(unexpectedSource),
				[],
				TokenType.Identifier,

				'abc',
				'Attribute must have a value.',
			),
		).toBe(TokenCode.Unexpected);

		const noErrSource = '16;';
		expect(
			expectNextToken(
				mockPreprocessContext({ source: noErrSource }),
				getLineIndexes(noErrSource),
				[],
				TokenType.Literal,
				'',
				'Attribute must have a value.',
			),
		).toBe(TokenCode.NoError);
	});

	it('should add CompileError to `errors` with provided `message`', () => {
		const source = 'A';

		const errors: CompileError[] = [];

		const message: CompileError['message'] = 'Expression expected.';
		expectNextToken(
			mockPreprocessContext({ source }),
			getLineIndexes(source),
			errors,
			TokenType.Empty,
			'B' satisfies 'B' extends typeof source ? never : string,
			message,
		);

		expect(errors.length).toBe(1);
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
			'Component name must be capitalized.',
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
			'Attribute must have a value.',
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

				"Cannot declare 'signal' by using destructuring.",
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
				'Attribute value must be wrapped in figure brackets.',
			),
		).toBe(TokenCode.NoError);
	});
});
