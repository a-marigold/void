import type {
    PreprocessToken,
    VoidKeyword,
    SyntaxHandler,
    PreprocessContext,
} from './types';

import { IDENTIFIER_START_REGEXP, IDENTIFIER_REGEXP } from './constants';

/**
 *
 *
 *
 * @param source
 *
 * @returns
 */
export const preprocess = (source: string): string => {
    let transformed: string = '';

    /**
     * Collected tokens that help with context identifying
     */
    const contextTokens: PreprocessToken[] = [];

    const sourceLength = source.length;

    let lastUserCodeStart = 0;

    let pos = 0;
    while (pos < sourceLength) {
        const char = source[pos];

        if (IDENTIFIER_START_REGEXP.test(char)) {
            const start = pos;

            pos++;

            while (pos < sourceLength && IDENTIFIER_REGEXP.test(char)) {
                pos++;
            }

            const identifier = source.slice(start, pos);

            const voidSyntaxHandler = voidSyntaxHandlers[
                identifier as VoidKeyword
            ] as SyntaxHandler | undefined;

            if (voidSyntaxHandler) {
                voidSyntaxHandler();
            }
            contextTokens[contextTokens.length] = {
                type: 'Identifier',
                value: identifier,
                start,
                end: pos,
            };

            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            const start = pos;

            while (
                pos < sourceLength &&
                !(source[pos] === char && source[pos - 1] !== '\\')
            ) {
                pos++;
            }

            pos++;

            contextTokens[contextTokens.length] = {
                type: 'Literal',
                value: '', // there is no need to store string literal value
                start,
                end: pos,
            };

            continue;
        }

        if (char >= '0' && char <= '9') {
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
                value: '', // there is no need to store number literal value
                start,
                end: pos,
            };

            continue;
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

        // fallback

        pos++;
    }

    return transformed;
};
