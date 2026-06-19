import type { DelegableEvent } from '@void/shared';
import type {
	Statement,
	Expression,
	JSXElement,
	JSXFragment,
	ObjectExpression,
	ArrowFunctionExpression,
} from 'oxc-parser';

import type { JSXInfoType, AttrInfoType } from './constants';

/**
 *
 *
 * Array with information about analyzed JSX nodes.
 *
 * Root `JSXFragment` is flattened - {@link JSXInfoType} of fragment is not added to the array, but of all its children added.
 *
 * Order:
 * - {@link AttrInfos} is after {@link JSXInfoType.StaticParent} and {@link JSXInfoType.DynamicParent}.
 *
 * - {@link ComponentProps} is after {@link JSXInfoType.Component}.
 *
 * ### Invariant:
 * #### Infos are added in tree traversal order of `analyzeJsx` function for performance.
 * #### That means to access infos correctly, the traversal order must be identical to traversal order of `analyzeJsx`.
 */

export type JSXInfos = (JSXInfoType | AttrInfos | GenerateDOMResult | ComponentProps)[];

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
 *
 */
export type AttrInfos = (AttrInfoType | string | Expression)[];

/**
 * IIFE or call expression of `createComponent` if there is only a component child.
 */
export type ComponentChildren = ArrowFunctionExpression;
export type ComponentProps = ObjectExpression['properties'];

export type GenerateDOMResult = {
	/**
	 *
	 * String to be inserted to HTML template element of transformed JSX.
	 *
	 *	 @example
	 * `'<div class='abcde'> Hello, <!---->! </div>
	 */
	templateHtml: string;

	/**
	 * Operations to be added to component body.
	 * #### Includes `ReturnStatement` with root element.
	 */
	domOps: Statement[];

	/**
	 * Event names to be delegated in global scope.
	 *
	 * They must be checked with `CompileContext.globalDelegatedEvents` before delegating.
	 */

	delegableEvents: DelegableEvent[];
};

/**
 *
 * Parent JSX element.
 */

export type JSXParent = JSXElement | JSXFragment;

/**
 * Derived from {@link JSXElement.children}.
 */
export type JSXChild = JSXElement['children'][number];
