import type { DelegatedEventProp } from '@void/shared';
import type { Statement, Expression, JSXElement, JSXFragment, BlockStatement } from 'oxc-parser';

import type { JSXInfoType, AttrInfoType } from './constants';

/**
 *
 * Array with information about visited JSX nodes.
 *
 * There is ALWAYS {@link AttrInfos} after {@link JSXInfoType.StaticParent} and {@link JSXInfoType.DynamicParent}.
 *
 * There is ALWAYS {@link IIFEBody} of transformed component's children after {@link JSXInfoType.Component}.
 *
 * Root `JSXFragment` is flattened - {@link JSXInfoType} of fragment is not added to the array, but of all its children added.
 *
 * ### Invariant:
 * #### Infos are added in tree traversal order of `analyzeJsx` function.
 * #### That means to access infos correctly, the traversal order must be identical to traversal order of `analyzeJsx`.
 * #### That is  needed for cache locality and performance.
 */
export type JSXInfos = (JSXInfoType | AttrInfos | IIFEBody)[];

/**
 * It is a flat array and has strict order for performance.
 *
 * @example
 * ```typescript
 * // attributes
 * attributes.push(
 *   JSXAttributeType,
 *   AttrName, // it is an empty string when attribute is `JSXSpreadAttribute`
 *   ValueOfAttribute,
 * );
 * ```
 *
 */
export type AttrInfos = (AttrInfoType | string | Expression)[];

/**
 * Result of `generateDom` function.
 */

export type GenerateDOMResult = {
	/**
	 *
	 *
	 *
	 * String to be inserted to HTML template element of transformed JSX.
	 *
	 *
	 *
	 *	 @example
	 * `'<div class='abcde'> Hello, <!---->! </div>
	 */

	templateHtml: string;

	/**
	 *
	 *
	 * DOM operations of transformed JSX to be inserted to component body.
	 *
	 * #### It includes `ReturnStatement` with root element.
	 */

	domOps: Statement[];

	/**
	 * Event names to be delegated in global scope.
	 *
	 * They must be checked with `CompileContext.globalDelegatedEvents` before delegating.
	 */

	delegableEvents: DelegatedEventProp[];
};

export type IIFEBody = BlockStatement['body'];

/**
 * Parent JSX element.
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
 */
export type JSXParent = JSXElement | JSXFragment;

/**
 *
 * Derived from {@link JSXElement.children}.
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
 */

export type JSXChild = JSXElement['children'][number];
