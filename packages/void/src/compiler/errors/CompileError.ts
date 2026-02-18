/**
 * #### Error that appears while `void-js` file is parsing.
 */
export class CompileError extends Error {
    sourceStart: number;

    sourceEnd: number;

    /**
     *
     *
     *
     *
     * @param message Standard `Error.prototype.message`.
     * @param sourceStart Start position of error in `void-js` source file.
     * @param sourceEnd End position of error in `void-js` source file.
     *
     */
    constructor(message: string, sourceStart: number, sourceEnd: number) {
        super(message);

        /**
         * Start position of error in `void-js` source file.
         */
        this.sourceStart = sourceStart;

        /**
         * End position of error in `void-js` source file.
         */
        this.sourceEnd = sourceEnd;

        this.name = 'CompileError';
    }
}
