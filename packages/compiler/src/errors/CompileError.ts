import type { LineIndexes } from './types';
import { getIndexLocation } from './utils';
import type { getLineIndexes } from './utils';

/**
 * #### Error that appears while `void-js` file is compiling.
 */

export class CompileError extends Error {
	/**
	 *
	 * Line with error in `void-js` source file.
	 *
	 *
	 * Сount of lines starts from 1.
	 */

	line: number;

	/**
	 *
	 * Start position of error in `line`.
	 * Position starts from 0 like indexes in a string.
	 */

	start: number;

	/**
	 *
	 * End position of error in `line`.
	 * Position starts from 0 like indexes in a string.
	 * The value can be `null` if is not provided.
	 */
	end: number | null | undefined;

	/**
	 *
	 *
	 *
	 *
	 *
	 * @param message Message of error.
	 *
	 * @param line Line with error in `void-js` source file.
	 * @param start Start position of error in `line`.
	 * @param end End position of error in `line`. Can be `null`.
	 *
	 *
	 */

	constructor(message: string, line: number, start: number, end: number | null | undefined) {
		super(message);

		this.line = line;
		this.start = start;
		this.end = end;

		this.name = 'CompileError';
	}

	/**
	 *
	 * #### Creates a `CompileError` instance from `start` and `end` absolute indexes in `void-js` source file.
	 *
	 * @param lineIndexes Result of {@link getLineIndexes} call.
	 *
	 * @param message Message of error.
	 * @param start Abolute position of error beginning in `void-js` source file.
	 * @param end Absoulte position of error end in `void-js` source file.
	 *
	 * @returns {CompileError} `CompileError` instance.
	 *
	 */

	static fromAbsolutePos(
		lineIndexes: LineIndexes,
		message: string,
		start: number,
		end: number | null | undefined,
	) {
		const startLocation = getIndexLocation(lineIndexes, start);

		const startColumn = startLocation.column;

		return new CompileError(
			message,
			startLocation.line,

			startColumn,
			end && startColumn + (end - start),
		);
	}
}
