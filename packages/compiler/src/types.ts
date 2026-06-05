import type { DelegatedEventProp } from '@void/shared';
/**
 *
 *
 * Names of `void-js` runtime API exports to be imported in compiled file.
 */
export type RuntimeApiName =
	| 'getValue'
	| 'setValue'
	| 'postSetValue'
	| 'createEffect'
	| 'createMemo'
	| 'computeMemo'
	| 'insert'
	| 'mergeAttrs'
	| `${DelegatedEventProp}Handler`
	| RuntimeTypeName;

/**
 *
 * Names of `void-js` reactivity API that should be imported as types.
 */

export type RuntimeTypeName = 'Signal';

/**
 * State of compilation of the whole `void-js` project.
 *
 * Must be created once and shared for every file.
 *
 *
 */
export type CompileContext = {
	/**
	 *
	 * Names of events that are already delegated in the whole `void-js` project.
	 */

	globalDelegatedEvents: Set<DelegatedEventProp>;
};
