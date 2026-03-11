import type { PreprocessToken, PreprocessContext, Interrupt } from './types';

import {
    IDENTIFIER_START_REGEXP,
    PUNCTUATORS,
    VOID_KEYWORDS,
    ALLOW_REGEXP_PUNCTUATORS,
} from './constants';

import type { VoidKeyword } from '../types';

import { CompileError, getLineIndexes, compileErrorCodes } from '../errors';

import type { LineIndexes, CompileErrorCode } from '../errors/types';

/**
 *
 * #### Starts from `context.pos`.
 * #### Returns the first `PreprocessToken` in the `source` argument.
 * #### Returns `null` if the `source` is empty.
 *
 *
 * @param context {@link PreprocessContext} — Object with current position in `source` and useful properties like this.
 *
 *
 *
 * @returns {PreprocessToken} {@link PreprocessToken} or `null` if the `context.source` is empty.
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
 * #### Adds new `CompileError` instance to `errors` if next token is `null` or it does not match `expectedType` or `expectedValue`.
 * #### Returns {@link compileErrorCodes.Fatal} if the next token is `null`.
 * #### Returns {@link compileErrorCodes.Recoverable} if the next token does not match arguments.
 * #### Returns the next token if everything is ok.
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
 */

export const expectNextToken = (
    context: PreprocessContext,
    lineIndexes: LineIndexes,
    errors: CompileError[],

    expectedType: PreprocessToken['type'],
    expectedValue: PreprocessToken['value'] | null,

    message: string,
): PreprocessToken | CompileErrorCode => {
    const prevTokenEnd = context.pos;
    const nextToken = getNextToken(context);

    if (!nextToken) {
        errors[errors.length] = CompileError.fromAbsolutePos(
            lineIndexes,
            message,
            prevTokenEnd,
            context.pos - 1,
        );

        return compileErrorCodes.Fatal;
    }

    if (
        (expectedValue && nextToken.value !== expectedValue) ||
        nextToken.type !== expectedType
    ) {
        errors[errors.length] = CompileError.fromAbsolutePos(
            lineIndexes,
            message,
            nextToken.start,
            nextToken.end,
        );

        return compileErrorCodes.Recoverable;
    }

    return nextToken;
};

/**
 *
 *
 *
 * #### Traverses tokens until it meets a token with provided `tokenType` argument and with `tokenValue` if it is provided.
 *
 * @param context {@link PreprocessContext}.
 * @param interrupts `Set` with types and values of {@link PreprocessToken} that must interrupt this function.
 * @param tokenType {@link PreprocessToken.type} of desired token.
 * @param tokenValue {@link PreprocessToken.value} of desired token. If it is `null`, it is not included to search.
 *
 *
 */
export const syncToToken = (
    context: PreprocessContext,
    interrupts: Set<Interrupt>,
    tokenType: PreprocessToken['type'],
    tokenValue: PreprocessToken['value'] | null,
): PreprocessToken | null => {
    const isTokenValueNotNeeded = !tokenValue;

    let nextToken = getNextToken(context);

    while (nextToken) {
        const nextTokenType = nextToken.type;
        const nextTokenValue = nextToken.value;

        if (interrupts.has(nextTokenType) || interrupts.has(nextTokenValue)) {
            return null;
        }
        if (
            nextTokenType === tokenType &&
            (isTokenValueNotNeeded || nextTokenValue === tokenValue)
        ) {
            return nextToken;
        }
    }
    return null;
};
