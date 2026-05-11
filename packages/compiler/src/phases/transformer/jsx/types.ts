import type { DelegableEvent } from '@void/shared';
import type { Statement, Expression, JSXElement, JSXFragment } from 'oxc-parser';

import type { JSXInfoType, AttrInfoType } from './constants';

/**
 *
 * Array with information about visited JSX nodes.
 *
 * {@link AttrsInfo} is always after {@link JSXInfoType.Attrs} in the array.
 *
 *
 *
 *
 *
 * ### Invariant:
 * #### Infos are added in tree traversal order of `analyzeJsx` function.
 * #### That means to access infos correctly, the traversal order must be identical to traversal order of `analyzeJsx`.
 * #### That is  needed for cache locality and performance.
 */
export type JSXInfos = (JSXInfoType | AttrsInfo)[];

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
export type AttrsInfo = (AttrInfoType | string | Expression)[];

/**
 * Result of `generateDom` function.
 */

export type GenerateDOMResult = {
	/**
	 *
	 * Unique name of identifier containing `template.content`.
	 *
	 * Must be used in `transformJsx` function as name of `template.content` after assigning {@link GenerateDOMResult.templateString} to `template.innerHTML`
	 *
	 *
	 * Needed because `generateDom` immediatly demands name of root element (content of `HTMLTemplate`) identifier.
	 */
	templateContentIdName: string;

	/**
	 *
	 *
	 * String to be inserted to HTML template element of transformed JSX.
	 *
	 *  @example
	 * `'<div class='abcde'> Hello, <!---->! </div>
	 */

	templateString: string;

	/**
	 *
	 *
	 * DOM operations with DOM elements of transformed JSX.
	 */

	domOps: Statement[];
	/**
	 *
	 *
	 * Event names to be delegated in global scope.
	 *
	 *
	 *
	 *
	 *
	 *
	 */

	delegatedEvents: DelegableEvent[];
};

/**
 * Parent JSX element.
 */

export type JSXParent = JSXElement | JSXFragment;

/**
 *
 * Derived from {@link JSXElement.children}.
 *
 *
 */

export type JSXChild = JSXElement['children'][number];
