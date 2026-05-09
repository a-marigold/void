import type { Statement, Expression, JSXElement, JSXFragment } from 'oxc-parser';

import type { JSXInfoType, AttrInfoType } from './constants';

/**
 *
 * Array with information about visited JSX nodes.
 *
 * ### Infos are added in identical tree traversal order of `analyzeJsx` function.
 * ### That means to access infos correctly, the traversal order must be the same as traversal order of `analyzeJsx`.
 * ### This invariant is needed for cache locality and performance.
 *
 *
 */

export type JSXInfos = (JSXInfoType | AttrsInfo)[];

/**
 * It is a flat array and has strict order for performance.
 *
 * The last element is ALWAYS {@link JSXInfoType.LiteralAttrs} or {@link JSXInfoType.ExprAttrs}
 *
 * to indicate should attributes be marked as dynamic in `analyzeJsx`. That means the last element must be skipped.
 *      @example
 * ```typescript
 * // attributes
 * attributes.push(
 *   JSXAttributeType,
 *   AttrName, // it is an empty string when attribute is `JSXSpreadAttribute`
 *   ValueOfAttribute,
 * );
 * // type of whole attributesss (only LAST element)
 * attributes.push(
 *   JSXInfoType.LiteralAttributes | JSXInfoType.ExprAttributes /
 * );
 * ```
 *
 *
 */

export type AttrsInfo = (
	| AttrInfoType
	| string
	| Expression
	| JSXInfoType.LiteralAttrs
	| JSXInfoType.ExprAttrs
)[];

/**
 *
 *
 * Result of `transformJsx`.
 */
export type TransformJSXResult = {
	/**
	 *
	 * String to be inserted to HTML template element of transformed JSX.
	 *
	 *  @example
	 * `'<div class='abcde'> Hello, <!---->! </div>
	 */

	templateString: string;

	/**
	 *
	 * DOM operations with dom elements of transformed JSX.
	 */

	generatedDom: Statement[];

	/**
	 * Event names to be delegated in global scope.
	 */
	delegatedEvents: string[];
};

/**
 * Parent JSX element.
 */
export type JSXParent = JSXElement | JSXFragment;

/**
 *
 * Derived from {@link JSXElement.children}.
 *
 */
export type JSXChild = JSXElement['children'][number];
