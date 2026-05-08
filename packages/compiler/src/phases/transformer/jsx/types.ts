import type { Statement, Expression, JSXElement, JSXFragment } from 'oxc-parser';

import type { JSXInfoType, JSXExprType } from './constants';

/**
 *
 * Array with information about visited JSX nodes.
 *
 * ### Infos are added in identical tree traversal order of `analyzeJsx` function.
 * ### That means to access infos correctly, the traversal order must be the same as traversal order of `analyzeJsx`.
 * ### This invariant is needed for cache locality and performance.
 */

export type JSXInfos = (JSXInfoType | AttrsInfo)[];

/**
 * Type of attribute info in {@link AttrsInfo}.
 */
export type AttrInfoType = Exclude<JSXExprType, JSXExprType.Empty>;
/**
 * It is a flat array and has strict order for performance.
 *      @example
 * ```typescript
 * attributes.push(
 *   JSXAttributeType,
 *   AttrName, // it is empty when attribute is `JSXSpreadAttribute`
 *   ValueOfAttribute,
 * );
 * ```
 */

export type AttrsInfo = (AttrInfoType | string | Expression)[];

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
