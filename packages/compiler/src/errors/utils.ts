import type { LineIndexes, IndexLoc } from './types';

/**
 *
 * #### Returns an array with positions of `\n` characters.
 *
 * @param source String to be explored on new line positions.
 *
 * @returns Array with positions of `\n` characters.
 *
 *
 * @example
 *
 *
 * ```typescript
 * getNewLineIndexes('abc\ndef\njkl') // Output: `[3, 7]`.
 * ````
 */
export const getLineIndexes = (source: string): LineIndexes => {
	const positions: LineIndexes = [];

	for (let pos = 0; pos < source.length; pos++) {
		if (source[pos] === '\n') {
			(positions as number[]).push(pos);
		}
	}

	return positions;
};

/**
 * @param lineIndexes Array with indexes from {@link getLineIndexes}.
 * @param index Index location of which to be found.
 *
 *
 *
 * @returns {IndexLoc} {@link IndexLoc}.
 */

export const getIndexLoc = (index: number, lineIndexes: LineIndexes): IndexLoc => {
	let lowBound = 0;

	let highBound = lineIndexes.length;

	while (lowBound < highBound) {
		const middleLineIndex = (lowBound + highBound) >> 1;

		if (lineIndexes[middleLineIndex] < index) {
			lowBound = middleLineIndex + 1;
		} else {
			highBound = middleLineIndex;
		}
	}

	return {
		line: lowBound + 1,

		column: lowBound ? index - lineIndexes[lowBound - 1] - 1 : index,
	};
};
