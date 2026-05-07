import type { LineIndexes, CompileErrorLocation } from './types';

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
			positions.push(pos);
		}
	}

	return positions;
};

/**
 * @param lineIndexes Array with indexes from {@link getLineIndexes}.
 *
 *
 * @param index Index, location of which to be found.
 *
 *
 * @returns {CompileErrorLocation} {@link CompileErrorLocation} with `line` of `index` and `column` of `index` in the line, uses provided `newLineIndexes` of string.
 */

export const getIndexLocation = (
	lineIndexes: LineIndexes,

	index: number,
): CompileErrorLocation => {
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
