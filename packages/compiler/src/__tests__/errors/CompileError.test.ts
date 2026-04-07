import { describe, it, expect } from 'bun:test';

import { CompileError } from '../../errors/CompileError';

describe('CompileError', () => {
    describe('fromAbsolutePoss', () => {
        it('should return CompileError instance with correct one-based line and zero-based start, end positions', () => {
            const message = '___error___';
            const start = 11;
            const end = 12;

            const expectedStart = 0;

            const error = CompileError.fromAbsolutePos(
                [10, 16],
                message,

                start,

                end,
            );

            expect(error.message).toBe(message);
            expect(error.line).toBe(2);
            expect(error.start).toBe(expectedStart);
            expect(error.end).toBe(expectedStart + end - start);
        });
    });
});
