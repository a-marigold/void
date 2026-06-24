import type { DelegableEvent } from '@void/shared';
import type {
	Statement,
	Expression,
	JSXElement,
	JSXFragment,
	ObjectExpression,
	ArrowFunctionExpression,
	BlockStatement,
	CallExpression,
} from 'oxc-parser';

import type { UniqueId } from '../../preprocessor';

import type { JSXInfoType, AttrInfoType } from './constants';

/**
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
 *
 */
export type AttrInfos = (AttrInfoType | string | Expression)[];

export type GenerateDOMResult = {
	/**
	 *
	 * String to be inserted to HTML template element of transformed JSX.
	 *
	 *	 @example

	 * `'<div class='abcde'> Hello, <!---->! </div>`
	 */
	templateHtml: string;

	/**
	 * Generated DOM operations with attributes and elements insertion.
	 */
	domOps: Statement[];

	/**
	 * Name of identifier of root element that is the entrypoint of generated DOM.
	 */
	rootElIdName: UniqueId;

	/**
	 * Event names to be delegated in global scope.
	 *
	 * They must be checked with `CompileContext.globalDelegatedEvents` before delegating.
	 */

	delegableEvents: DelegableEvent[];
};

/**
 * Function of `element` component special prop value (see runtime types).
 */

export type ElementPropFn = ArrowFunctionExpression;

export type ComponentProps = ObjectExpression['properties'];

/**
 *
 * Block statement with dom operations of component's children or call expression of `insert`.
 *
 */

export type TransformChildrenResult = BlockStatement | CallExpression;

/**
 *
 * Parent JSX element.
 *
 */

export type JSXParent = JSXElement | JSXFragment;

/**
 *
 * Derived from {@link JSXElement.children}.
 */
export type JSXChild = JSXElement['children'][number];
