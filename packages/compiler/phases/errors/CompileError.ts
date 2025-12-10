/**
 * Basic compilation error interface
 *
 * @property name - Name of error. For example: `ParseError`.
 * @property message - Message of error.
 */
export interface BasicCompileError {
    name: string;

    message: string;
}

export class CompileError extends Error implements BasicCompileError {
    constructor(message: string) {
        super(message);
        this.name = 'CompileError';
    }
}
