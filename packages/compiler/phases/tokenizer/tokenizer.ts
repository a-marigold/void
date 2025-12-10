import type { HighLevelToken, BlockType } from './types/Token';

/**
 *
 * @param source
 *
 * @returns
 */
export const getTokens = (source: string): HighLevelToken[] => {
    const trimSource = source.trim();

    if (!trimSource) return [];

    const tokens: HighLevelToken[] = [];

    let pos = 0;

    while (pos < trimSource.length) {
        if (trimSource[pos] === '<') {
            pos++;

            let blockType = '';

            while (
                pos < trimSource.length &&
                trimSource[pos] !== '>' &&
                trimSource[pos] !== ' '
            ) {
                blockType += trimSource[pos];

                pos++;
            }

            while (pos < trimSource.length && trimSource[pos] !== '>') pos++;

            pos++;

            let blockContent = '';

            while (
                pos < trimSource.length &&
                !(trimSource[pos] === '<' || trimSource[pos + 1] === '/')
            ) {
                blockContent += trimSource[pos];
                pos++;
            }

            tokens.push({
                type: blockType as HighLevelToken['type'],
                value: blockContent,
            });

            while (pos < trimSource.length && trimSource[pos] !== '>') pos++;
            pos++;
        } else {
            pos++;
        }
    }

    return tokens;
};
