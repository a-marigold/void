import type { VoidKeyword } from '@void/shared';

import { createAbsPosCompileError, getLineIndexes } from '../../errors';
import type { CompileError, LineIndexes } from '../../errors';

import {
	IDENTIFIER_START_CODES,
	IDENTIFIER_START_REGEXP,
	PUNCTUATORS,
	VOID_KEYWORDS,
	ALLOW_REGEXP_PUNCTUATORS,
	TokenType,
	TokenCode,
	CharCode,
} from './constants';
import type { Token, PreprocessContext } from './types';

/**
 * #### Starts from `context.pos`.
 * #### Rewrites `context.currentToken` fields with the first found token.
 * #### If the `source` is finished, Rewrites `context.currentToken` fields with {@link TokenType.End}.
 *
 * @param context {@link PreprocessContext}.
 *
 * @example
 *
 * ```typescript
 * getNextToken({
 *     source: 'someIdentifierName',
 *     pos: 0,
 *     isRegExpAllowed: true,
 *     currentToken: {
 *        type: TokenType.Start,
 *        value: '',
 *        start: 0,
 *        end: 0,
 *     }
 * });
 * ```
 *
 * Output:
 *
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 *
 *
 *
 */

export const getNextToken = (context: PreprocessContext): void => {
	const source = context.source;

	const currentToken = context.currentToken;
	const sourceLength = source.length;

	while (context.pos < sourceLength) {
		const char = source[context.pos];

		const charCode = char.charCodeAt(0);

		if (
			charCode === CharCode[' '] ||
			charCode === CharCode['\n'] ||
			charCode === CharCode['\t'] ||
			charCode === CharCode['\r']
		) {
			context.pos++;
			continue;
		}

		if (
			charCode === CharCode["'"] ||
			charCode === CharCode['`'] ||
			charCode === CharCode['"']
		) {
			const start = context.pos;

			context.pos++;

			const startQuote = source[start];

			while (
				context.pos < sourceLength &&
				(source[context.pos - 1] === '\\' ||
					source[context.pos] !== startQuote)
			) {
				context.pos++;
			}

			context.pos++;

			currentToken.type = TokenType.Literal;
			currentToken.value = '';

			currentToken.start = start;
			currentToken.end = context.pos;

			context.isRegExpAllowed = false;

			return;
		}

		if (charCode >= CharCode.Zero && charCode <= CharCode.Nine) {
			const start = context.pos;

			context.pos++;

			while (
				context.pos < sourceLength &&
				((source[context.pos] >= '0' && source[context.pos] <= '9') ||
					source[context.pos] === '_')
			) {
				context.pos++;
			}

			context.isRegExpAllowed = false;
			currentToken.type = TokenType.Literal;
			currentToken.value = '';

			currentToken.start = start;
			currentToken.end = context.pos;

			return;
		}

		if (IDENTIFIER_START_CODES[charCode] || IDENTIFIER_START_REGEXP.test(char)) {
			const start = context.pos;
			context.pos++;

			while (
				context.pos < sourceLength &&
				!PUNCTUATORS[source.charCodeAt(context.pos)]
			) {
				context.pos++;
			}

			const identifier = source.slice(start, context.pos);

			context.isRegExpAllowed = false;

			currentToken.type = VOID_KEYWORDS.has(identifier as VoidKeyword)
				? TokenType.VoidKeyword
				: TokenType.Identifier;
			currentToken.value = identifier;
			currentToken.start = start;
			currentToken.end = context.pos;

			return;
		}

		if (charCode === CharCode['/']) {
			const start = context.pos;

			context.pos++;

			if (source[context.pos] === '/') {
				context.pos++;

				while (
					context.pos < sourceLength &&
					source[context.pos] !== '\n' &&
					source[context.pos] !== '\r'
				) {
					context.pos++;
				}

				context.isRegExpAllowed = true;
			} else if (source[context.pos] === '*') {
				context.pos++;

				while (
					context.pos < sourceLength &&
					!(
						source[context.pos] === '*' &&
						source[context.pos + 1] === '/'
					)
				) {
					context.pos++;
				}

				context.pos += 2;

				context.isRegExpAllowed = true;
			} else if (context.isRegExpAllowed) {
				while (
					context.pos < sourceLength &&
					!(
						source[context.pos] === '/' &&
						source[context.pos - 1] === '\\'
					)
				) {
					context.pos++;
				}

				context.pos++;

				context.isRegExpAllowed = false;
			} else {
				// otherwise it is a Division
				currentToken.type = TokenType.Punctuator;
				currentToken.value = char;

				currentToken.start = start;
				currentToken.end = context.pos;

				return;
			}

			currentToken.type = TokenType.Empty;
			currentToken.value = '';

			currentToken.start = start;
			currentToken.end = context.pos;

			return;
		}

		// otherwise it is a `Punctuator`

		const start = context.pos;

		context.pos++;

		currentToken.type = TokenType.Punctuator;
		currentToken.value = char;
		currentToken.start = start;
		currentToken.end = context.pos;

		// 0 | 1 is the same with boolean
		context.isRegExpAllowed = ALLOW_REGEXP_PUNCTUATORS[charCode] as unknown as boolean;

		return;
	}

	currentToken.type = TokenType.End;
	currentToken.value = '';

	currentToken.start = 0;
	currentToken.end = sourceLength;

	return;
};
/**
 * #### Calls {@link getNextToken}:
 * - If the next token is {@link TokenType.End}, returns {@link TokenCode.Missing}.
 * - If the next token does not match `expectedType` or `expectedValue`, returns {@link TokenCode.Unexpected}.
 * - Otherwise the next token is valid, returns {@link TokenCode.NoError}.
 *
 * @param context {@link PreprocessContext}.
 * @param lineIndexes Result of {@link getLineIndexes} call.
 *
 *
 * @param errors Array with `CompileError` instances.
 * @param expectedType Expected `type` of next token.
 * @param expectedValue Expected `value` of next token.
 * @param message Message that will be in CompileError.
 *
 * @returns {Token | TokenErrorCode} {@link TokenCode}.
 */

export const expectNextToken = (
	context: PreprocessContext,
	lineIndexes: LineIndexes,
	errors: CompileError[],

	expectedType: Token['type'],

	expectedValue: Token['value'] | null,
	message: CompileError['message'],
): TokenCode => {
	const prevTokenEnd = context.pos;

	const currentToken = context.currentToken;

	getNextToken(context);

	if (currentToken.type === TokenType.End) {
		errors.push(
			createAbsPosCompileError(
				message,
				prevTokenEnd,
				context.pos - 1,
				lineIndexes,
			),
		);
		return TokenCode.Missing;
	}

	if (
		(expectedValue && currentToken.value !== expectedValue) ||
		currentToken.type !== expectedType
	) {
		errors.push(
			createAbsPosCompileError(
				message,
				currentToken.start,
				currentToken.end,
				lineIndexes,
			),
		);

		return TokenCode.Unexpected;
	}

	return TokenCode.NoError;
};
