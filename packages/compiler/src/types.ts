import type { DelegatedEventProp } from '@void/shared';

/**
 * All the new keywords that `void-js` provides.
 */
export type VoidKeyword = 'signal' | 'effect' | 'memo';

/**
 * `void-js` specific syntax constructions like components.
 */
export type VoidConstruction = 'component';
/**
 *
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
	| 'mergeAttrs'
	| `delegated${DelegatedEventProp}`
	| RuntimeTypeName;

/**
 *
 *
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
	 * Names of events that are already delegated in the whole `void-js` project
	 */

	delegatedEvents: Set<DelegatedEventProp>;
};
