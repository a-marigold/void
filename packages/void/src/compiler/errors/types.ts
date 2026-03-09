import type { compileErrorCodes } from './constants';

export type LineIndexes = number[];

/**
 *
 *
 * Object with `line` (starts from 1) and `column` that is located in `line` (starts from 0)
 */
export type Location = {
    /**
     *
     * Starts from 1.
     */
    line: number;

    /**
     * Start from 0.
     */
    column: number;
};

/**
 *
 *
 * Code of a `CompileError` kind.
 *
 * Derivde from {@link compileErrorCodes}.
 */

export type CompileErrorCode =
    (typeof compileErrorCodes)[keyof typeof compileErrorCodes];
