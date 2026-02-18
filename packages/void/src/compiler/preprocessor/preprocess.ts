import type {
    PreprocessToken,
    VoidKeyword,
    SyntaxHandler,
    Identifiers,
} from './types';

import {
    IDENTIFIER_START_REGEXP,
    IDENTIFIER_REGEXP,
    VOID_KEYWORDS,
} from './constants';

/**
 *
 * #### Returns the first `PreprocessToken` in the `source` argument.
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
 * @example
 *
 * ```typescript
 * const source = 'someIdentifier';
 * getNextToken('count', 0, source.length, undefined);
 * ```
 * output:
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 */
const getNextToken = (
    source: string,
    sourceStart: number,
    sourceEnd: number,
    lastToken: PreprocessToken | undefined,
): PreprocessToken | null => {
    let pos = sourceStart;

    const char = source[pos];

    while (pos < sourceEnd) {
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
                value: source.slice(start, pos),

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
        // fallback
        pos++;
    }

    return null;
};
