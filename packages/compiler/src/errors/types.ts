import type { CompileErrorMessage } from '@void/shared';

export type CompileError = {
	message: CompileErrorMessage;
	/**
	 * Start location of error in `void-js` source file.
	 */
	startLoc: IndexLoc;
	/**
	 * End location of error in `void-js` source file.
	 */
	endLoc: IndexLoc;
};

/**
 * The result of `getLineIndexes` function.
 */
export type LineIndexes = readonly number[];

/**
 * Object with `line` (starts from 1) and `column` that is located шn `line` (starts from 0)ю
 */
export type IndexLoc = {
	/**
	 *
	 *
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
