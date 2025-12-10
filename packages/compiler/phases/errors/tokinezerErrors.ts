import { CompileError } from './CompileError';

export type TokenizeErrorMessage = 'Unexcepted token';

export class TokenizeError extends CompileError {
    constructor(message: TokenizeErrorMessage) {
        super(message);
        this.name === 'TokenizeError';
    }
}
