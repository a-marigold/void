/**
 *
 * #### Checks is the string starts from character in lower case or is not.
 *
 * @param string String, the first character of which will be checked.
 * @returns `true` if the first charecter of `string` is in lower case, otherwise returns `false`.
 */
export const isUncapitalized = (string: string): boolean => {
    const firstChar = string[0];

    return firstChar === firstChar.toLowerCase();
};
