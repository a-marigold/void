/**
 *
 *
 *
 * #### Generates unique label for keyword (`signal`, `effect`, `computation`) from prefix.
 * #### Should be used after the whole `void-js` file scanning to prevent collisions.
 *
 * @param identifiers `Set` with all identifiers in `void-js` source file.
 * @param labelPrefix String of label to start from (for example, `_$effect.
 *
 *
 *
 *
 *
 *
 * @returns String with unique label.
 *
 *
 * @example
 *
 * ```typescript
 * const identifiers = new Set(['_$effect']); // There might be collision because of this `_$effect` identifier
 * generateKeywordLabel(identifiers, '_$effect'); // Output: `_$effect1`
 * ```
 *
 */
export const generateKeywordLabel = (
    identifiers: Set<string>,
    labelPrefix: string,
): string => {
    let label: string = labelPrefix;
    let labelCount = 0;

    while (identifiers.has(label)) {
        labelCount++;

        label = labelPrefix + labelCount;
    }

    return label;
};
