import type { TopLevelToken } from './types';

import { IDENTIFIER_START_REGEXP, IDENTIFIER_REGEXP } from './constants';

export const transfromTopLevel = (source: string): string => {
    let transformed: string = '';

    const contextTokens: TopLevelToken[] = [];

    const sourceLength = source.length;

    let lastUserCodeStart = 0;

    let pos = 0;
    while (pos < sourceLength) {
        const char = source[pos];

        if (source[pos] === "'") {
        }

        if (
            (char === '/' && source[pos + 1] === '/') ||
            source[pos + 1] === '*'
        ) {
            pos++;

            // skip a comment

            if (source[pos] === '/') {
                while (
                    pos < sourceLength &&
                    source[pos] !== '\r' &&
                    source[pos] !== '\n'
                ) {
                    pos++;
                }
            } else if (source[pos] === '*') {
                while (
                    pos < sourceLength &&
                    !(source[pos] === '/' && source[pos + 1] === '*')
                ) {
                    pos++;
                }

                pos += 2;
            } else {
                const lastToken = contextTokens[contextTokens.length - 1];

                // check is this a division
                if (
                    lastToken &&
                    (lastToken.type === 'Identifier' ||
                        lastToken.type === 'Literal' ||
                        lastToken.value === ')' ||
                        lastToken.value === ']')
                ) {
                    pos++;
                } else {
                    // otherwise this is a RegExp

                    while (
                        pos < sourceLength &&
                        !(source[pos] === '/' && source[pos - 1] !== '\\')
                    ) {
                        pos++;
                    }
                }
            }

            continue;
        }

        if (char >= '0' || char <= '9') {
            const start = pos;

            pos++;

            while (
                pos < sourceLength &&
                (source[pos] >= '0' ||
                    source[pos] <= '9' ||
                    source[pos] === '_')
            ) {
                pos++;
            }

            contextTokens[contextTokens.length] = {
                type: 'Literal',
                value: source.slice(start, pos),
                start,
                end: pos,
            };

            continue;
        }

        // fallback

        pos++;
    }

    return transformed;
};
