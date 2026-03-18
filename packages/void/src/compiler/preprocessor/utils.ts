import { getNextToken } from './tokens';

import type { PreprocessContext, PreprocessResult } from './types';

/**
 *
 * #### Generates unique identifier name from prefix.
 * #### Should be used after the whole `void-js` file scanning to prevent collisions.
 *
 *
 *
 *
 *
 *
 *
 * @param identifiers `Set` with all identifiers in `void-js` source file.
 *
 * @param prefix String with prefix of identifier to start from (for example, `_$pr`).
 *
 * @returns String with unique identifier.
 *
 * @example
 *
 *
 * ```typescript
 * const identifiers = new Set(['_$pr']); // There might be a collision because of this `_$pr` identifier
 * generateUniqueIdentifier(identifiers, '_$pr'); // Output: `_$pr0`
 * ```
 *
 */

export const generateUniqueIdentifier = (
    identifiers: PreprocessResult['identifiers'],
    prefix: string,
): string => {
    let identifier: string = prefix;
    let identifierCount = 0;

    while (identifiers.has(identifier)) {
        identifier = prefix + identifierCount;
        identifierCount++;
    }

    identifiers.add(identifier);

    return identifier;
};

/**
 *
 *
 * #### Handles component props.
 *
 * #### should be used after the props start symbol (opened circle bracket) is handled.
 *
 *
 *
 * @param context {@link PreprocessContext}.
 * @param propsStart Start position of props start symbol (opened circle bracket).
 *
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

    while (balance) {
        const nextToken = getNextToken(context);

        if (!nextToken) {
            break;
        }

        if (nextToken.value === ')') {
            balance--;
        } else if (nextToken.value === '(') {
            balance++;
        }
    }

    return context.source.slice(propsStart, context.pos);
};
