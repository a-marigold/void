import { ChildNodeType } from './constants';
import { context } from './context';
import type { Component, ComponentFn, Child, DelegatedEventTarget } from './types';

/**
 * #### Sets {@link context.currentComponent} to created {@link Component}.
 * #### Calls `fn`.
 * #### Sets {@link context.currentComponent} to `null`.
 *
 * @param fn {@link ComponentFn} to be called with `children`.
 * @param children Children of component.
 *
 * @returns Result of `fn` call.
 */

export const createComponent = <P extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>(
	fn: ComponentFn,
	children: Child,
	props: P,
): Child => {
	const component: Component = { subs: [], cleanups: [] };

	context.currentComponent = component;

	const node = fn(children, props);

	context.currentComponent = null;

	return node;
};

/**
 * #### Inserts `expr` before `anchor`.
 * #### Handles strings and numbers.
 * #### For fragments, inserts extra start-anchor and returns it.
 * #### If `prevExprNode` is,deletes it from DOM or reuses it in case of {@link Text}.
 * #### Deletes `prevExprNode` from DOM if `expr` is falsy.
 * #### Must be assigned to `prevExprNode` external identifier and called with it if used for reactive updates (see examples).
 *
 * @param expr {@link Child} or {@link DocumentFragment} to be inserted.
 * @param anchor Anchor node (comment in `void-js`) to be as a pivot for `expr` insertion.
 * @param prevExprNode The previous result of this function call or `null` for static expressions.
 *
 * @returns  New node, created from `expr` or  `null`.
 *
 *
 * @example
 * ```typescript
 * // Reactive expressions
 * let prevExprNode: Node | null = null;
 * createEffect(() => {
 *   // Assign it for correctness
 *   // Because `prevExprNode` can be reused or deleted in `insert`
 *   prevExprNode = insert(expression, anchor, prevExprNode);
 * });
 *
 * // Static expressions
 * insert(expression, parent, anchor, null);
 * ```
 *
 *
 *
 */

export const insert = (
	expr: Child,
	anchor: Comment,
	prevExprNode: ChildNode | null,
): ChildNode | null => {
	// `anchor` always has a parent 'cause it is from compiled `template`
	const parent = anchor.parentNode as Node;

	const exprType = typeof expr;

	if (prevExprNode) {
		if (
			(exprType === 'string' || exprType === 'number') &&
			prevExprNode.nodeType === ChildNodeType.TextNode
		) {
			// types before are checked

			(prevExprNode as Text).data = expr as string;

			return prevExprNode;
		}

		let currentSibling: ChildNode = prevExprNode;

		while (currentSibling !== anchor) {
			// siblings are always behind `anchor`
			const nextSibling = currentSibling.nextSibling as ChildNode;

			currentSibling.remove();

			currentSibling = nextSibling;
		}
	}

	if (exprType === 'string' || exprType === 'number') {
		return parent.insertBefore(document.createTextNode(expr as string), anchor);
	}

	if (expr) {
		// types of expr are checked before
		const newExprNode =
			(expr as Element | DocumentFragment).nodeType ===
			ChildNodeType.DocumentFragment
				? parent.insertBefore(document.createComment(''), anchor)
				: (expr as Element);

		parent.insertBefore(expr as Element | DocumentFragment, anchor);

		return newExprNode;
	}

	return null;
};

/**
 * #### Merges `attributes` to element attributes.
 * #### Handles `aria-*` and `data-*` attributes.
 *
 * @param element Element to be merged with `attributes`.
 * @param attributes Attributes to be moved to `element`.
 *
 */

export const mergeAttrs = <T extends HTMLElement>(
	element: HTMLElement,

	attributes: Partial<T> & { [name: string]: unknown },
): void => {
	for (const name in attributes) {
		const value = attributes[name];

		if (name.includes('-')) {
			element.setAttribute(name, value === undefined ? '' : (value as string));
		} else {
			(element as unknown as Record<string, unknown>)[name] = value;
		}
	}
};

// --- Delegation handlers ---
// All the handlers have identical logic but different events
// They must  be variables and not stored to `delegationHandlers` object for tree shaking

export const $ClickHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$Click'> | null;
	while (element) {
		element.$Click?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $PointerDownHandler = (event: PointerEvent): void => {
	let element = event.target as DelegatedEventTarget<'$PointerDown'> | null;
	while (element) {
		element.$PointerDown?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const $PointerUpHandler = (event: PointerEvent): void => {
	let element = event.target as DelegatedEventTarget<'$PointerUp'> | null;
	while (element) {
		element.$PointerUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $InputHandler = (event: Event): void => {
	let element = event.target as DelegatedEventTarget<'$Input'> | null;

	while (element) {
		element.$Input?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const $ChangeHandler = (event: Event): void => {
	let element = event.target as DelegatedEventTarget<'$Change'> | null;
	while (element) {
		element.$Change?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $KeyDownHandler = (event: KeyboardEvent): void => {
	let element = event.target as DelegatedEventTarget<'$KeyDown'> | null;

	while (element) {
		element.$KeyDown?.(event);

		if (event.cancelBubble) {
			return;
		}
		element = element.parentElement;
	}
};
export const $KeyUpHandler = (event: KeyboardEvent): void => {
	let element = event.target as DelegatedEventTarget<'$KeyUp'> | null;
	while (element) {
		element.$KeyUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $SubmitHandler = (event: SubmitEvent): void => {
	let element = event.target as DelegatedEventTarget<'$Submit'> | null;

	while (element) {
		element.$Submit?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
