/**
 *
 *
 *
 * #### Generates unique identifier name from prefix.
 * #### Should be used after the whole `void-js` file scanning to prevent collisions.
 *
 *
 * @param identifiers `Set` with all identifiers in `void-js` source file.
 * @param prefix String of label to start from (for example, `_$effect`).
 *
 *
 *
 *
 *
 * @returns String with unique identifier.
 *
 *
 * @example
 *
 * ```typescript
 * const identifiers = new Set(['_$effect']); // There might be collision because of this `_$effect` identifier
 * generateUniqueIdentifier(identifiers, '_$effect'); // Output: `_$effect1`
 * ```
 *
 */
export const generateUniqueIdentifier = (
    identifiers: Set<string>,
    prefix: string,
): string => {
    let identifier: string = prefix;
    let identifierCount = 0;

    while (identifiers.has(identifier)) {
        identifierCount++;

        identifier = prefix + identifierCount;
    }

    return identifier;
};
