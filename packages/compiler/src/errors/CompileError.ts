import type { LineIndexes } from './types';
import type { CompileError } from './types';
import { getIndexLoc } from './utils';

/**
 *
 * @param message {@link CompileError['message']}.
 * @param startLoc Start location (`line`, `column`) of error in `void-js` source file.
 * @param endLoc End location (`line`, `column`) of error in `void-js` source file.
 *
 * @returns {CompileError} {@link CompileError}.
 */
export const createCompileError = (
	message: CompileError['message'],

	startLoc: CompileError['startLoc'],
	endLoc: CompileError['endLoc'],
): CompileError => ({ message, startLoc: startLoc, endLoc: endLoc });

/**
 *
 *
 * @param message {@link CompileError['message']}.
 * @param startIndex Start index of error in `void-js` source file.
 * @param endIndex End index of error in `void-js` source file.
 * @param lineIndexes {@link LineIndexes} from `getLineIndexes` function.s
 *
 * @returns {CompileError} {@link CompileError}.
 */
export const createAbsPosCompileError = (
	message: CompileError['message'],
	startIndex: number,
	endIndex: number,
	lineIndexes: LineIndexes,
): CompileError => ({
	message,
	startLoc: getIndexLoc(lineIndexes, startIndex),
	endLoc: getIndexLoc(lineIndexes, endIndex),
});
