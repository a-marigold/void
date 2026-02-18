import type {
    PreprocessToken,
    VoidKeyword,
    SyntaxHandler,
    Identifiers,
    PreprocessContext,
} from './types';

import {
    IDENTIFIER_START_REGEXP,
    PUNCTUATORS,
    VOID_KEYWORDS,
} from './constants';

/**
 * #### Returns the first `PreprocessToken` in the `source` argument.
 *
 *
 * #### Returns `null` if the `source` is empty.
 *
 * @param source String with `void-js` source code.
 *
 * @param sourceStart Position in `source` to start from.
 * @param end Position in `source` to finish in.
 *
 * @param lastToken The last token appeared in `source` string. Can be `undefined`.
 *
 *
 * @returns `PreprocessToken` object or `null` if the `source` is empty.
 *
 *
 * @example
 *
 * ```typescript
 * const source = 'someIdentifier';
 * getNextToken('count', 0, source.length, undefined);
 * ```
 *
 * output:
 *
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 *
 */

const getNextToken = (
    source: string,

    sourceStart: number,
    sourceEnd: number,

    lastToken: PreprocessToken | undefined | null,
): PreprocessToken | null => {
    let pos = sourceStart;

    while (pos < sourceEnd) {
        const char = source[pos];

        if (IDENTIFIER_START_REGEXP.test(char)) {
            const start = pos;

            pos++;

            while (pos < sourceEnd && !PUNCTUATORS.has(source[pos])) {
                pos++;
            }

            const identifier = source.slice(start, pos);

            return {
                type: VOID_KEYWORDS ? 'VoidKeyword' : 'Identifier',

                value: identifier,

                start,
                end: pos,
            };
        }

        if (char === "'" || char === '"' || char === '`') {
            const start = pos;

            pos++;

            const startQuote = source[start];

            while (
                pos < sourceEnd &&
                !(source[pos] === startQuote && source[pos - 1] !== '\\')
            ) {
                pos++;
            }

            return {
                type: 'Literal',
                value: '', // there is no need to store strings to tokens
                start,
                end: pos,
            };
        }

        if (char >= '0' && char <= '9') {
            const start = pos;

            pos++;

            while (
                pos < sourceEnd &&
                ((source[pos] >= '0' && source[pos] <= '9') ||
                    source[pos] === '_')
            ) {
                pos++;
            }

            return {
                type: 'Literal',
                value: '', // there is no need to store numbers in tokens

                start,
                end: pos,
            };
        }

        if (char === '/') {
            const start = pos;

            pos++;

            if (source[pos] === '/') {
                pos++;

                while (
                    pos < sourceEnd &&
                    source[pos] !== '\n' &&
                    source[pos] !== '\r'
                ) {
                    pos++;
                }
            } else if (source[pos] === '*') {
                pos++;

                while (
                    pos < sourceEnd &&
                    !(source[pos] === '*' && source[pos + 1] === '/')
                ) {
                    pos++;
                }

                pos += 2;
            } else if (
                lastToken &&
                !(
                    lastToken.type === 'Identifier' ||
                    lastToken.type === 'Literal' ||
                    lastToken.value === ')' ||
                    lastToken.value === ']'
                )
            ) {
                // RegExp

                while (pos < sourceEnd && source[pos] !== '/') {
                    pos++;
                }
            }

            return { type: 'Empty', value: '', start, end: pos };
        }

        if (PUNCTUATORS.has(char)) {
            return {
                type: 'Punctuator',
                value: char,
                start: pos,
                end: pos + 1,
            };
        }

        if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
            pos++;
        }

        // fallback

        return {
            type: 'Empty',
            value: '',
            start: pos,
            end: pos + 1,
        };
    }

    return null;
};

/**
 *
 * @param source
 *
 * @returns
 *
 */
export const preprocess = (source: string): string => {
    const sourceLength = source.length;

    let transformed: string = '';

    let lastToken: PreprocessToken | null = null;

    const context = {
        pos: 0,
    };

    while (context.pos < sourceLength) {
        const token = getNextToken(
            source,
            context.pos,
            sourceLength,
            lastToken,
        );

        if (!token) {
            break;
        }
    }

    return transformed;
};
