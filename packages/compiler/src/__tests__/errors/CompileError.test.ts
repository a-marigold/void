import { describe, it, expect } from 'bun:test';

import { createAbsPosCompileError, type CompileError } from '../../errors/';

describe('CompileError', () => {
	describe('createAbsPosCompileError', () => {
		it('should return CompileError with correct one-based line and zero-based start, end positions', () => {
			const message: CompileError['message'] = 'Attribute must have a value.';

			const start = 11;
			const end = 12;

			const error = createAbsPosCompileError(message, start, end, [10, 16]);
			expect(error.message).toBe(message);
			expect(error.startLoc.line).toBe(2);
			expect(error.startLoc.column).toBe(0);

			expect(error.endLoc.line).toBe(2);
			expect(error.endLoc.column).toBe(1);
		});
	});
});
