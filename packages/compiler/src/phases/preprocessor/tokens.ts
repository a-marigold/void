import type {
    PreprocessToken,
    PreprocessContext,
    TokenErrorCode,
} from './types';
import {
    IDENTIFIER_START_REGEXP,
    PUNCTUATORS,
    VOID_KEYWORDS,
    ALLOW_REGEXP_PUNCTUATORS,
    tokenErrorCodes,
} from './constants';

import type { VoidKeyword } from '../../types';

import { CompileError, getLineIndexes } from '../../errors';

import type { LineIndexes } from '../../errors';

/**
 *
 * #### Starts from `context.pos`.
 * #### Returns the first `PreprocessToken` in the `source` argument.
 * #### Returns `null` if the `source` is empty.
 *
 * @param context {@link PreprocessContext} — Object with current position in `source` and useful properties like this.
 *
 * @returns {PreprocessToken} {@link PreprocessToken} or `null` if the `context.source` is empty.
 *
 *
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
 *
 *
 *
 */

export const getNextToken = (
    context: PreprocessContext,
): PreprocessToken | null => {
    const source = context.source;

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

            return {
                type: VOID_KEYWORDS.has(identifier as VoidKeyword)
                    ? 'VoidKeyword'
                    : 'Identifier',
                value: identifier,
                start,
                end: context.pos,
            };
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

            return {
                type: 'Literal',
                value: '', // there is no need to store strings to tokens

                start,
                end: context.pos,
            };
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

            return {
                type: 'Literal',

                value: '', // there is no need to store numbers in tokens

                start,
                end: context.pos,
            };
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
                return {
                    type: 'Punctuator',
                    value: char,

                    start,
                    end: context.pos,
                };
            }

            continue;
        }

        if (PUNCTUATORS.has(char)) {
            const start = context.pos;

            context.pos++;

            if (ALLOW_REGEXP_PUNCTUATORS.has(char)) {
                context.isRegExpAllowed = true;
            } else {
                context.isRegExpAllowed = false;
            }

            return {
                type: 'Punctuator',

                value: char,

                start,

                end: context.pos,
            };
        }

        // fallback

        context.pos++;
    }

    return null;
};

/**
 *
 *
 * #### Adds new `CompileError` instance to `errors` if next token is `null` or it does not match `expectedType` or `expectedValue`.
 *
 * @param context {@link PreprocessContext}.
 * @param lineIndexes Result of {@link getLineIndexes} call.
 * @param errors Array with `CompileError` instances.
 *
 * @param expectedType Expected `type` of next token.
 *
 * @param expectedValue Expected `value` of next token.
 *
 * @param message Message that will be in CompileError.
 *
 *
 *
 *
 *
 *
 *
 *
 * @returns {PreprocessToken | TokenErrorCode} {@link PreprocessToken} if the next token is not `null` and satisfies provided arguments, otherwise returns appropriate `tokenErrorCodes` code.
 *
 */
export const expectNextToken = (
    context: PreprocessContext,
    lineIndexes: LineIndexes,
    errors: CompileError[],

    expectedType: PreprocessToken['type'],
    expectedValue: PreprocessToken['value'] | null,

    message: string,
): PreprocessToken | TokenErrorCode => {
    const prevTokenEnd = context.pos;
    const nextToken = getNextToken(context);

    if (!nextToken) {
        errors.push(
            CompileError.fromAbsolutePos(
                lineIndexes,
                message,
                prevTokenEnd,
                context.pos - 1,
            ),
        );
        return tokenErrorCodes.missing;
    }

    if (
        (expectedValue && nextToken.value !== expectedValue) ||
        nextToken.type !== expectedType
    ) {
        errors.push(
            CompileError.fromAbsolutePos(
                lineIndexes,
                message,

                nextToken.start,
                nextToken.end,
            ),
        );

        return tokenErrorCodes.unexpected;
    }

    return nextToken;
};
