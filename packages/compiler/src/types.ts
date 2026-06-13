import type { DelegatedEventProp } from '@void/shared';

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
