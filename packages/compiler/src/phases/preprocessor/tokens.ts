import type { PreprocessToken, PreprocessContext } from './types';
import {
    IDENTIFIER_START_REGEXP,
    PUNCTUATORS,
    VOID_KEYWORDS,
    ALLOW_REGEXP_PUNCTUATORS,
    PreprocessTokenType,
    TokenCode,
} from './constants';

import type { VoidKeyword } from '../../types';
import { CompileError, getLineIndexes } from '../../errors';

import type { LineIndexes } from '../../errors';

/**
 * #### Starts from `context.pos`.
 * #### Rewrites `context.currentToken` fields with the first found token.
 * #### If the `source` is finished, Rewrites `context.currentToken` fields with {@link PreprocessTokenType.End}.
 *
 * @param context {@link PreprocessContext}.
 *
 * @example
 *
 * ```typescript
 * const source = 'someIdentifier';
 * getNextToken({
 *     source: 'someIdentifierName',
 *     pos: 0,
 *     isRegExpAllowed: true ,
 * });
 * ```
 *
 * Output:
 *
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 */

export const getNextToken = (context: PreprocessContext): void => {
    const source = context.source;

    const currentToken = context.currentToken;
    const sourceLength = source.length;

    while (context.pos < sourceLength) {
        const char = source[context.pos];

        if (IDENTIFIER_START_REGEXP.test(char)) {
            const start = context.pos;

            context.pos++;

            while (
                context.pos < sourceLength &&
                source[context.pos] !== ' ' &&
                source[context.pos] !== '\n' &&
                source[context.pos] !== '\r' &&
                source[context.pos] !== '\t' &&
                !PUNCTUATORS.has(source[context.pos])
            ) {
                context.pos++;
            }

            const identifier = source.slice(start, context.pos);

            context.isRegExpAllowed = false;

            currentToken.type = VOID_KEYWORDS.has(identifier as VoidKeyword)
                ? PreprocessTokenType.VoidKeyword
                : PreprocessTokenType.Identifier;
            currentToken.value = identifier;
            currentToken.start = start;
            currentToken.end = context.pos;

            return;
        }

        if (char === "'" || char === '"' || char === '`') {
            const start = context.pos;

            context.pos++;

            const startQuote = source[start];

            while (
                context.pos < sourceLength &&
                !(
                    source[context.pos] === startQuote &&
                    source[context.pos - 1] !== '\\'
                )
            ) {
                context.pos++;
            }

            context.pos++;

            context.isRegExpAllowed = false;

            currentToken.type = PreprocessTokenType.Literal;
            currentToken.value = '';

            currentToken.start = start;
            currentToken.end = context.pos;

            return;
        }

        if (char >= '0' && char <= '9') {
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

            currentToken.type = PreprocessTokenType.Literal;
            currentToken.value = '';

            currentToken.start = start;
            currentToken.end = context.pos;

            return;
        }

        if (char === '/') {
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
                currentToken.type = PreprocessTokenType.Punctuator;
                currentToken.value = char;

                currentToken.start = start;
                currentToken.end = context.pos;

                return;
            }

            currentToken.type = PreprocessTokenType.Empty;
            currentToken.value = '';
            currentToken.start = start;
            currentToken.end = context.pos;

            return;
        }

        if (PUNCTUATORS.has(char)) {
            const start = context.pos;
            context.pos++; // TODO: REFACT

            if (ALLOW_REGEXP_PUNCTUATORS.has(char)) {
                context.isRegExpAllowed = true;
            } else {
                context.isRegExpAllowed = false;
            }

            currentToken.type = PreprocessTokenType.Punctuator;
            currentToken.value = char;

            currentToken.start = start;
            currentToken.end = context.pos;

            return;
        }

        // fallback

        context.pos++;
    }

    currentToken.type = PreprocessTokenType.Punctuator;
    currentToken.value = '';

    currentToken.start = 0;
    currentToken.end = 0;

    return;
};

/**
 * #### Calls {@link getNextToken}:
 * - If the next token is {@link PreprocessTokenType.End}, returns {@link TokenCode.Missing}.
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
 * @returns {PreprocessToken | TokenErrorCode} {@link TokenCode}.
 *
 *
 *
 *
 */

export const expectNextToken = (
    context: PreprocessContext,
    lineIndexes: LineIndexes,
    errors: CompileError[],

    expectedType: PreprocessToken['type'],
    expectedValue: PreprocessToken['value'] | null,
    message: string,
): TokenCode => {
    const prevTokenEnd = context.pos;

    const currentToken = context.currentToken;

    getNextToken(context);

    if (currentToken.type === PreprocessTokenType.End) {
        errors.push(
            CompileError.fromAbsolutePos(
                lineIndexes,
                message,
                prevTokenEnd,
                context.pos - 1,
            ),
        );
        return TokenCode.Missing;
    }

    if (
        (expectedValue && currentToken.value !== expectedValue) ||
        currentToken.type !== expectedType
    ) {
        errors.push(
            CompileError.fromAbsolutePos(
                lineIndexes,
                message,
                currentToken.start,
                currentToken.end,
            ),
        );

        return TokenCode.Unexpected;
    }

    return TokenCode.NoError;
};
