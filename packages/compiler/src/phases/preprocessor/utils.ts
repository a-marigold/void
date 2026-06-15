import type { PropsVoidKeyword } from '@void/shared';

import { IrNodeType, TokenType, VOID_ID_PREFIX } from './constants';
import { getNextToken } from './tokens';
import type { PreprocessContext, PreprocessIR, PreprocessResult, UniqueId } from './types';
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

	createComponent: generateUniqueId(idContext),
	insert: generateUniqueId(idContext),
	mergeAttrs: generateUniqueId(idContext),

	onClick: generateUniqueId(idContext),
	onPointerDown: generateUniqueId(idContext),
	onPointerUp: generateUniqueId(idContext),
	onInput: generateUniqueId(idContext),
	onChange: generateUniqueId(idContext),
	onKeyDown: generateUniqueId(idContext),
	onKeyUp: generateUniqueId(idContext),
	onSubmit: generateUniqueId(idContext),
	Signal: generateUniqueId(idContext),
});

/**
 * #### Generates unique identifier name with {@link VOID_ID_PREFIX} and the current value of `idContext.uniqueIdCount`.s
 * #### Mutates `idContext.uniqueIdCount` property via incrementing it.
 *
 * @param idContext {@link PreprocessResult.idContext} for its `uniqueIdCount` property.
 *
 * @returns String with unique identifier.
 *
 *
 *
 */

export const generateUniqueId = (idContext: PreprocessResult['idContext']): UniqueId =>
	('_$' + idContext.uniqueIdCount++) as UniqueId;

/**
 *
 * #### Parses component props and adds parsed nodes to `ir`.
 * #### Should be used after the props start symbol (`(`) is handled.
 *
 *
 * @param propsStart Start position of 	props start symbol (`(`).
 * @param ir {@link PreprocessIR} to receive parsed props.
 * @param context {@link PreprocessContext}.
 */

export const parseProps = (
	propsStart: number,
	ir: PreprocessIR,
	context: PreprocessContext,
): void => {
	const currentToken = context.currentToken;

	let balance: number = 1;

	let lastUserCodeStart = propsStart;

	while (balance && currentToken.type !== TokenType.End) {
		getNextToken(context);

		const currentValue = currentToken.value;

		if (currentValue === '(') {
			balance++;
		} else if (currentValue === ')') {
			balance--;
		} else if (balance === 1) {
			// `balance === 1` means it is not an expression or a function
			if ((currentValue as PropsVoidKeyword) === 'signal') {
				ir.push(
					IrNodeType.UserCode,
					lastUserCodeStart,
					currentToken.start,

					IrNodeType.PropsSignal,
					currentToken.start,
					currentToken.end,
				);
				lastUserCodeStart = currentToken.end;
			} else if ((currentValue as PropsVoidKeyword) === 'ref') {
				ir.push(
					IrNodeType.UserCode,
					lastUserCodeStart,
					currentToken.start,

					IrNodeType.PropsRef,
					currentToken.start,
					currentToken.end,
				);
				lastUserCodeStart = currentToken.end;
			} else if ((currentValue as PropsVoidKeyword) === 'memo') {
				ir.push(
					IrNodeType.UserCode,
					lastUserCodeStart,
					currentToken.start,

					IrNodeType.PropsMemo,
					currentToken.start,
					currentToken.end,
				);
				lastUserCodeStart = currentToken.end;
			}
		}
	}

	ir.push(IrNodeType.UserCode, lastUserCodeStart, context.pos);
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
