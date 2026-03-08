import type { LineIndexes, Location } from './types';

/**
 *
 * #### Returns an array with positions of `\n` characters.
 * @param source String to be explored on new line positions.
 *
 *
 *
 * @returns Array with positions of `\n` characters.
 *
 *
 * @example
 *
 * ```typescript
 * getNewLineIndexes('abc\ndef\njkl') // Output: `[3, 7]`.
 * ````
 */
export const getLineIndexes = (source: string): LineIndexes => {
    const positions: LineIndexes = [];
    const sourceLength = source.length;

    let pos = 0;

    while (pos < sourceLength) {
        const char = source[pos];

        if (char === '\n') {
            positions[positions.length] = pos;
        }

        pos++;
    }

    return positions;
};

/**
 *
 * #### Returns object with `line` of `index` and `column` of `index` in the line, uses provided `newLineIndexes` of string.
 *
 * @param lineIndexes Array with indexes derived via {@link getLineIndexes}.
 *
 * @param index Index, location of which to be found.
 *
 *
 */

export const getIndexLocation = (
    lineIndexes: LineIndexes,

    index: number,
): Location => {
    let lowBound = 0;

    let highBound = lineIndexes.length;

    while (lowBound < highBound) {
        const middleIndex = (lowBound + highBound) >> 1;
        if (lineIndexes[middleIndex] < index) {
            lowBound = middleIndex + 1;
        } else {
            highBound = middleIndex;
        }
    }
    return {
        line: lowBound + 1,

        column: index - (lineIndexes[lowBound - 1] ?? 0) - 1,
    };
};
