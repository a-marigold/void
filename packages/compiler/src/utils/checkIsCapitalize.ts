/**
 * #### Returns `false` for non-ASCII strings.
 *
 * @param string String to be checked
 *
 * @returns Boolean indicating is the `string` capitalized or not.
 */
export const checkIsCapitalize = (string: string): boolean => {
	const firstCharCode = string.charCodeAt(0);
	// 65 is A; 90 is Z
	return firstCharCode > 64 && firstCharCode < 91;
};
