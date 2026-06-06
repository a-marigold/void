import { TokenType, VOID_ID_PREFIX } from './constants';
import { getNextToken } from './tokens';
import type { PreprocessContext, PreprocessResult, UniqueId } from './types';
/**
 * @param idContext {@link PreprocessResult.idContext} for unique id generating with {@link generateUniqueId}.
 *
 * @returns {PreprocessResult.runtimeApiNames} {@link PreprocessResult.runtimeApiNames} with unique identifiers.
 */
export const generateRuntimeApiNames = (
	idContext: PreprocessResult['idContext'],
): PreprocessResult['runtimeApiNames'] => ({
	getValue: generateUniqueId(idContext),
	setValue: generateUniqueId(idContext),
	postSetValue: generateUniqueId(idContext),
	createEffect: generateUniqueId(idContext),
	createMemo: generateUniqueId(idContext),
	computeMemo: generateUniqueId(idContext),

	insert: generateUniqueId(idContext),
	mergeAttrs: generateUniqueId(idContext),

	$ClickHandler: generateUniqueId(idContext),
	$PointerDownHandler: generateUniqueId(idContext),
	$PointerUpHandler: generateUniqueId(idContext),
	$InputHandler: generateUniqueId(idContext),
	$ChangeHandler: generateUniqueId(idContext),

	$KeyDownHandler: generateUniqueId(idContext),

	$KeyUpHandler: generateUniqueId(idContext),
	$SubmitHandler: generateUniqueId(idContext),

	Signal: generateUniqueId(idContext),
});

/**
 * #### Generates unique identifier name with {@link VOID_ID_PREFIX} and the current value of `idContext.uniqueidCount`.s
 * #### Mutates `idContext.uniqueIdCount` property via incrementing it.
 *
 * @param idContext {@link PreprocessResult.idContext} for its `uniqueIdCount` property.
 *
 * @returns String with unique identifier.
 *
 *
 *
 *
 *
 */

export const generateUniqueId = (idContext: PreprocessResult['idContext']): UniqueId =>
	('_$' + idContext.uniqueIdCount++) as UniqueId;

/**
 *
 *
 *
 * #### Handles component props.
 * #### Should be used after the props start symbol (`(`) is handled.
 *
 * @param context {@link PreprocessContext}.
 * @param propsStart Start position of 	props start symbol (`(`).
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
 *
 *
 * #### Generates string with imports of `void-js` runtime API with aliases from `runtimeApiNamess`.
 *
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
