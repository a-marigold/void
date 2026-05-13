/**
 * The result of `getLineIndexes` function.
 */
export type LineIndexes = readonly number[];

/**
 * Object with `line` (starts from 1) and `column` that is located шn `line` (starts from 0)ю
 */
export type CompileErrorLocation = {
	/**
	 *
	 * Starts from 1.
	 *
	 */

	line: number;

	/**
	 * Starts from 0.
	 */
	column: number;
};
