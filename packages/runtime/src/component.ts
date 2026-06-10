import { ChildNodeType } from './constants';
import { context } from './context';
import type { Component, ComponentFn, Child, DelegatedEventTarget, ExprScope } from './types';

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
	const parentComponent = context.currentComponent;

	const component: Component = { cleanups: [], subs: [], components: [] };

	parentComponent?.components.push(component);

	context.currentComponent = component;

	const rootChild = fn(children, props);

	context.currentComponent = parentComponent;

	return rootChild;
};

/**
 * #### Calls all `component.cleanups`.
 * #### Clears subscribers of `component.subs`.
 * #### Recursively runs the logic for all `component.components`.
 *
 * @param component {@link Component} to be disposed.
 */

export const disposeComponent = (component: Component): void => {
	const cleanups = component.cleanups;
	const cleanupsLength = cleanups.length;
	for (let clIndex = 0; clIndex < cleanupsLength; clIndex++) {
		cleanups[clIndex]();
	}

	const subs = component.subs;

	const subsLength = subs.length;
	for (let subIndex = 0; subIndex < subsLength; subIndex++) {}

	const components = component.components;
	const componentsLength = components.length;

	for (let compIndex = 0; compIndex < componentsLength; compIndex++) {
		disposeComponent(components[compIndex]);
	}
};

/**
 * #### Inserts `expr` before `anchor`.
 * #### Turns strings, numbers to {@link Text}.
 * #### For fragments, inserts extra start-anchor.
 * #### If `expr` is falsy, deletes `exprScope.prevExprNode` from DOM.
 * #### If `expr` is string or number and `exprScope.prevExprNode` is {@link Text}, reuses `prevExprNode`.
 *
 *
 * @param expr {@link Child} to be inserted.
 * @param anchor Anchor node (comment in `void-js`) to be as a pivot for `expr` insertion.
 *
 * @param exprScope {@link ExprScope} of expression or `null` if expression is not reactive.
 *
 *
 * @example
 * ```typescript
 * // Reactive expressions
 * const exprScope: ExprScope = { ... };
 * createEffect(() => {
 *     insert(expression, anchor, exprScope);
 * });
 *
 * // Static expressions
 * insert(expression, anchor, null);
 * ```
 */

export const insert = (expr: Child, anchor: Comment, exprScope: ExprScope | null): void => {
	// `anchor` always has a parent 'cause it is from compiled `template` (DocumentFragment)
	const parent = anchor.parentNode as Node;

	const exprType = typeof expr;

	if (exprScope) {
		const prevExprNode = exprScope.prevExprNode;

		if (prevExprNode) {
			if (
				(exprType === 'string' || exprType === 'number') &&
				prevExprNode.nodeType === ChildNodeType.TextNode
			) {
				// Types are checked before
				(prevExprNode as Text).data = expr as string;

				return;
			}

			let currentSibling: ChildNode = prevExprNode;

			while (currentSibling !== anchor) {
				// Siblings are always behind `anchor`

				const nextSibling = currentSibling.nextSibling as ChildNode;

				currentSibling.remove();

				currentSibling = nextSibling;
			}
		}
	}

	let newExprNode: ChildNode | null = null;

	if (exprType === 'string' || exprType === 'number') {
		newExprNode = parent.insertBefore(document.createTextNode(expr as string), anchor);
	}

	if (expr) {
		// Types of `expr` are checked before

		newExprNode =
			(expr as Element | DocumentFragment).nodeType ===
			ChildNodeType.DocumentFragment
				? parent.insertBefore(document.createComment(''), anchor)
				: (expr as Element);

		parent.insertBefore(expr as Element | DocumentFragment, anchor);
	}

	if (exprScope) {
		exprScope.prevExprNode = newExprNode;
	}
};
/**
 *
 * #### Merges `attributes` to `element` attributes.
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
