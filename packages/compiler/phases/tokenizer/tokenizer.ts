import { TokenizeError } from '../errors';
import type { HighLevelTokenType, HighLevelToken } from './types/Token';

const blockTypes: HighLevelTokenType[] = ['script', 'markup'];

/**
 *
 *
 * @param {string} source - The source code of `.vd` file.
 *
 * @returns {HighLevelToken[]} An array with code blocks as tokens.
 *
 * @example
 * ```typescript
 *
 * const source = `
 * <script>
 *     let variable = 'foo';
 * </script
 * <markup>
 *     <p> text </p>
 * </markup>
 * `;
 * getHighLevelTokens(source); // Output:
 * ```
 */
export const getHighLevelTokens = (source: string): HighLevelToken[] => {
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
            if (!blockTypes.includes(blockType as HighLevelTokenType)) {
                throw new TokenizeError('Unexpected block type');
            }

            while (pos < trimSource.length && trimSource[pos] !== '>') {
                if (trimSource[pos] !== ' ' && trimSource[pos] !== '>') {
                    throw new TokenizeError('Parsing markup failed');
                }
            }

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
                type: blockType as HighLevelTokenType,
                value: blockContent.trim(),
            });

            while (pos < trimSource.length && trimSource[pos] !== '>') pos++;
            pos++;
        } else {
            pos++;
        }
    }

    return tokens;
};

console.log(
    getHighLevelTokens(`
<script>
    let variable = 'foo';
</script>
<markup>
text
</markup>
`)
);
