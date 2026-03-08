import type { VoidKeyword } from '../types';

/**
 *
 * Object with messages of errors that appear while `void-js` file is compiling.
 *
 *
 *
 *
 *
 *
 */

export const compileErrors = {
    /**
     * @param keyword Keyword, identifier after which is expected.
     *
     *
     *
     *
     */

    IDENTIFIER_EXPECTED: (keyword: VoidKeyword | (string & {})) =>
        "Identifier of '" + keyword + "' expected.",

    /**
     *
     *
     * @param tokenValue Value of token (for example, `(` or `=`) that is expected.
     *
     */

    TOKEN_EXPECTED: (tokenValue: string) => "'" + tokenValue + "' expected.",

    /**
     *
     * An error about variable declaration with `void-js` keyword as name.
     *
     * @param keyword Keyword that was used as variable declaration name.
     *
     */

    KEYWORD_AS_VARIABLE_NAME: (keyword: VoidKeyword | (string & {})) =>
        "'" +
        keyword +
        "' is a 'void-js' keyword and is not allowed as variable declaration name.",

    /**
     *
     * Error about `void-js` keyword that can have an identifier (they are `signal`, `computation`) used with destructuring.
     *
     * @param keyword Keyword that was used with destructuring.
     */
    REACTIVE_DESTRUCTURING: (keyword: VoidKeyword | (string & {})) =>
        "Cannot use '" + keyword + "' with destructuring.",

    REACTIVE_WITHOUT_INITIAL_VALUE: (keyword: VoidKeyword) =>
        "'" + keyword + "' identifier must have an initial value.",
} as const;

/**
 *
 * Codes of `CompileError` types.
 */
export const errorCodes = {
    /**
     * Non critical error that does not allow code generation but compilation can go on.
     */
    Recoverable: 1,

    /**
     * Critical error that interrupts all the compilation phases.
     */
    Fatal: 2,
} as const;
