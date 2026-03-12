import { getNextToken } from './tokens';

import type { PreprocessContext } from './types';

/**
 *
 *
 *
 * #### Generates unique identifier name from prefix.
 * #### Should be used after the whole `void-js` file scanning to prevent collisions.
 *
 *
 *
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

/**
 *
 * #### Handles component props.
 * #### should be used after the props start symbol (opened circle bracket) is handled.
 *
 * @param context {@link PreprocessContext}.
 * @param propsStart Start position of props start symbol (opened circle bracket).
 *
 *
 * @returns String with props that includes brackets.
 *
 */
export const handleProps = (
    context: PreprocessContext,
    propsStart: number,
): string => {
    let balance: number = 1;

    let nextToken = getNextToken(context);

    while (balance && nextToken) {
        if (nextToken.value === ')') {
            balance--;
        } else if (nextToken.value === '(') {
            balance++;
        }

        nextToken = getNextToken(context);
    }

    return context.source.slice(propsStart, context.pos);
};
