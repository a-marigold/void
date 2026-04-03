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
 * @param prefix String with prefix of identifier to start from (for example, `_$pr`).
 *
 * @returns String with unique identifier.
 *
 * @example
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
 * #### should be used after the props start symbol (opened circle bracket) is handled.
 *
 * @param context {@link PreprocessContext}.
 * @param propsStart Start position of props start symbol (opened circle bracket).
 *
 * @returns String with props that includes brackets.
 *
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

        const nextTokenValue = nextToken.value;

        if (nextTokenValue === ')') {
            balance--;
        } else if (nextTokenValue === '(') {
            balance++;
        }
    }

    return context.source.slice(propsStart, context.pos);
};

/**
 *
 * #### Generates string with imports of `void-js` runtime API with aliases from `runtimeApiNamess`.
 *
 * @param importNames Object with shape: `{ origName: 'aliasName' }`.
 * @param typeNames Object with import names that should be imported as types: `{ name: 1 }`. They contain any truthy values.
 * @param path String with import path.
 *
 * @returns String with imports where type imports are distinguished.
 *
 * @example
 *
 * ```typescript
 * generateImports({ name: 'aliasAbc', shouldBeType: '_type' }, { shouldBeType: 1 }, '__API__');
 * // Output
 * `import {name as aliasAbc, type shouldBeType as _type} from '__API__';`
 * ```
 *
 *
 *
 *
 */

export const generateImports = (
    importNames: Readonly<Record<string, string>>,
    typeNames: Readonly<Record<string, 1>>,
    path: string,
): string => {
    let imports: string = '';

    for (const apiName in importNames) {
        if (importNames.hasOwnProperty(apiName)) {
            const origName = apiName;
            if (typeNames[apiName]) {
                imports += 'type ';
            }

            imports += origName + ' as ' + importNames[apiName] + ',';
        }
    }

    return 'import {' + imports + '} from "' + path + '";';
};
