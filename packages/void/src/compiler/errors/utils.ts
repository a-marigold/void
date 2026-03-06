/**
 *
 * #### Returns an array with positions of `\n` characters.
 *
 * @param source String to be explored on new line positions.
 * @returns Array with positions of `\n` characters.
 *
 * @example
 *
 * ```typescript
 * getNewLinePositions('abc\ndef\njkl') // Output: `[3, 7]`
 * ````
 */

const getNewLinePositions = (source: string): number[] => {
    const positions: number[] = [];

    const sourceLength = source.length;

    let pos = 0;

    while (pos < sourceLength) {
        const char = source[pos];

        if (char === '\n') {
            positions[positions.length] = pos;
        }
    }

    return positions;
};
