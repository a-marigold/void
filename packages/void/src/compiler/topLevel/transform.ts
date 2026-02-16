import type { TopLevelToken } from './types';

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

                if (source[pos] === '\r') {
                    pos++;
                }
                pos++;
            } else if (source[pos] === '*') {
                while (
                    pos < sourceLength &&
                    !(source[pos] === '/' && source[pos + 1] === '*')
                ) {
                    pos++;
                }

                pos += 2;
            } else {
                // skip a RegExp
                while (
                    pos < sourceLength &&
                    !(source[pos] === '/' && source[pos - 1] !== '\\')
                ) {
                    pos++;
                }
            }
        }

        // fallback

        pos++;
    }
    return transformed;
};
