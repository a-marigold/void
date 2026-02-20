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
    IDENTIFIER_EXPECTED: (keyword: string) =>
        "Identifier of '" + keyword + "' expected.",

    TOKEN_EXPECTED: (tokenValue: string) =>
        "'" + tokenValue + "'" + ' expected.',

    VOID_KEYWORD_AS_VARIABLE_NAME: (keyword: string) =>
        "'" +
        keyword +
        "' is a 'void-js' keyword and is not allowed as variable declaration name.",
} as const;
