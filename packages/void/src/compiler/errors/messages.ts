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
    KEYWORD_WITHOUT_IDENTIFIER: (keyword: string) =>
        "Identifier of '" + keyword + "' expected.",

    VOID_KEYWORD_AS_VARIABLE_NAME: (keyword: string) =>
        "'" +
        keyword +
        "' is a 'void-js' keyword and is not allowed as variable declaration name.",
} as const;
