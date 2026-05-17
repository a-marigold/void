import { TokenType } from './constants';
import { getNextToken } from './tokens';
import type { PreprocessContext, PreprocessResult } from './types';

/**
 *
 * #### Generates unique identifier name from prefix.
 * #### Should be used after the whole `void-js` file scanning to prevent collisions.
 *
 * @param prefix String with prefix of identifier to start from (for example, `_$pr`).
 * @param identifiers `Set` with all identifiers in `void-js` source file.

 *
 *
 * 
 * @returns String with unique identifier.
 *
 * @example
 *
 * ```typescript
 * const identifiers = new Set(['_$pr']); // There might be a collision because of this `_$pr` identifier
 * generateUniqueIdentifier('_$pr', identifiers); // Output: `_$pr0`
 * ```
 *
 */

export const generateUniqueId = (
	prefix: string,
	identifiers: PreprocessResult['identifiers'],
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
 * #### Should be used after the props start symbol (`(`) is handled.
 *
 * @param context {@link PreprocessContext}.
 * @param propsStart Start position of props start symbol  ()`(`).
 *
 * @returns String with props that includes brackets.
 */

export const getProps = (context: PreprocessContext, propsStart: number): string => {
	const currentToken = context.currentToken;

	let balance: number = 1;

	while (balance && currentToken.type !== TokenType.End) {
		getNextToken(context);

		const currentTokenValue = currentToken.value;

		if (currentTokenValue === ')') {
			balance--;
		} else if (currentTokenValue === '(') {
			balance++;
		}
	}

	return context.source.slice(propsStart, context.pos);
};

/**
 *
 * #### Generates string with imports of `void-js` runtime API with aliases from `runtimeApiNamess`.
 * #### Includes semicolon `';'` in the end.
 *
 * @param importNames object with shape - `{ origName: 'aliasName' }`.
 * @param typeNames object with import names that should be imported as types (they should be in `importNames`)- `{ origName: true }`.
 * @param path string with import path.
 *
 * @returns string with imports where type imports are distinguished.
 *
 * @example
 *
 * ```typescript
 * generateImports({ name: 'aliasAbc', shouldBeTypeName: '_type' }, { shouldBeTypeName: true }, '__API__');
 * // Output:
 * `import{name as aliasAbc,type shouldBeTypeName as _type}from'__API__';`
 * ```
 *
 *
 *
 */

export const generateImports = <NKey extends string, TKey extends NKey>(
	importNames: Readonly<Record<NKey, string>>,

	typeNames: Readonly<Record<TKey, true>>,

	path: string,
): string => {
	let imports: string = '';
	for (const origName in importNames) {
		if (importNames.hasOwnProperty(origName)) {
			if (typeNames[origName as unknown as TKey]) {
				imports += 'type ';
			}
			imports += origName + ' as ' + importNames[origName] + ',';
		}
	}

	return 'import{' + imports + '}from"' + path + '";';
};

/**
 *
 * @param identifiers {@link PreprocessResult.identifiers} for unique identifier generating.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 * @returns {PreprocessResult.runtimeApiNames} {@link PreprocessResult.runtimeApiNames} with unique identifiers.
 */
export const generateRuntimeApiNames = (
	identifiers: PreprocessResult['identifiers'],
): PreprocessResult['runtimeApiNames'] => ({
	getValue: generateUniqueId('_$0', identifiers),
	setValue: generateUniqueId('_$1', identifiers),
	postSetValue: generateUniqueId('_$2', identifiers),

	createEffect: generateUniqueId('_$3', identifiers),

	createMemo: generateUniqueId('_$4', identifiers),
	computeMemo: generateUniqueId('_$5', identifiers),

	insert: generateUniqueId('_$16', identifiers),
	mergeAttrs: generateUniqueId('_$6', identifiers),

	$ClickHandler: generateUniqueId('_$7', identifiers),
	$PointerDownHandler: generateUniqueId('_$8', identifiers),
	$PointerUpHandler: generateUniqueId('_$9', identifiers),
	$InputHandler: generateUniqueId('_$a', identifiers),
	$ChangeHandler: generateUniqueId('_$b', identifiers),

	$KeyDownHandler: generateUniqueId('_$c', identifiers),
	$KeyUpHandler: generateUniqueId('_$d', identifiers),

	$SubmitHandler: generateUniqueId('_$e', identifiers),

	Signal: generateUniqueId('_$f', identifiers),
});
