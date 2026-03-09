import { getIndexLocation } from './utils';
import type { getLineIndexes } from './utils';

import type { LineIndexes } from './types';

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
     *
     *
     *
     *
     *
     */

    line: number;

    /**
     *
     * Start position of error in `line`.
     * Position starts from 0 like indexes in a string.
     *
     */

    start: number;

    /**
     *
     * End position of error in `line`.
     * Position starts from 0 like indexes in a string.
     */
    end: number;

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
     * @param end End position of error in `line`.
     *
     *
     */

    constructor(message: string, line: number, start: number, end: number) {
        super(message);

        this.line = line;
        this.start = start;
        this.end = end;

        this.name = 'CompileError';
    }

    /**
     *
     * #### Creates a `CompileError` instance from absoulte `start` and `end` positions.
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

        end: number,
    ) {
        const startLocation = getIndexLocation(lineIndexes, start);

        const startColumn = startLocation.column;

        return new CompileError(
            message,

            startLocation.line,

            startColumn,

            startColumn + (end - start),
        );
    }
}
