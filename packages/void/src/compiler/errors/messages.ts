/**
 *
 * Object with messages of errors that appear while `void-js` file is compiling.
 *
 *
 *
 *
 *
 */

export const compileErrors = {
    /**
     *
     *
     *
     * @param keyword Keyword, identifier after which is expected.
     *
     */
    IDENTIFIER_EXPECTED: (keyword: string) =>
        "Identifier of '" + keyword + "' expected.",

    /**
     *
     *
     * @param tokenValue Value of token (for example, `(` or `=`) that is expected.
     *
     */
    TOKEN_EXPECTED: (tokenValue: string) =>
        "'" + tokenValue + "'" + ' expected.',

    /**
     *
     * An error about variable declaration with `void-js` keyword as name.
     *
     * @param keyword
     *
     */
    VOID_KEYWORD_AS_VARIABLE_NAME: (keyword: string) =>
        "'" +
        keyword +
        "' is a 'void-js' keyword and is not allowed as variable declaration name.",
} as const;
