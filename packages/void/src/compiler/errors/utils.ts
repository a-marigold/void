import type { NewLineIndexes, Location } from './types';

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
export const getNewLineIndexes = (source: string): NewLineIndexes => {
    const positions: NewLineIndexes = [];
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
 * @param newLineIndexes Array with indexes derived via {@link getNewLineIndexes}
 *
 * @param index Index, location of which to be found.
 *
 *
 */

export const getIndexLocation = (
    newLineIndexes: NewLineIndexes,

    index: number,
): Location => {
    let lowBound = 0;

    let highBound = newLineIndexes.length;

    while (lowBound < highBound) {
        const middleIndex = (lowBound + highBound) >> 1;
        if (newLineIndexes[middleIndex] < index) {
            lowBound = middleIndex + 1;
        } else {
            highBound = middleIndex;
        }
    }
    return {
        line: lowBound + 1,

        column: index - (newLineIndexes[lowBound - 1] ?? 0) - 1,
    };
};
