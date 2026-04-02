import type { DynamicDescription } from './types';

/**
 * HTML tag that is used as anchor for dynamic content insertion (for example, components and expressions).
 */
export const ANCHOR_HTML_TAG = '<!---->';

/**
 *
 * Name of property in `HTMLElement.prototype` that refers on the first child of element.
 */

export const FIRST_CHILD_ACCESS = 'firstChild';

/**
 *
 * Name of property in `HTMLElement.prototype` that refers on the next sibling of element.
 */

export const NEXT_SIBLING_ACCESSOR = 'nextSibling';

/**
 *
 * @see {@link Parent}.
 *
 */

export const PARENT_DYNAMIC_DESCRIPTION: DynamicDescription = {
    type: 'Parent',
};
/**
 * Types of identifiers that appear in a traversal `Scope`.
 */
export const scopeIdTypes = { default: 0, signal: 1, computation: 2 } as const;
