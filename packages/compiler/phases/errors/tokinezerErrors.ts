import { CompileError } from './CompileError';

export type TokenizeErrorMessage = 'Unexpected token' | 'Unexpected block name';

export class TokenizeError extends CompileError {
    constructor(message: TokenizeErrorMessage) {
        super(message);
        this.name === 'TokenizeError';
    }
}
