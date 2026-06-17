import type { DelegableEvent } from '@void/shared';

import { ChildNodeType, DELEGABLE_EVENTS } from './constants';
import { context } from './context';
import type {
	Cleanup,
	Component,
	ComponentProps,
	ComponentFn,
	ComponentChild,
	ExprScope,
	VoidElement,
} from './types';

/**
 * #### Sets {@link context.currentComponent} to created {@link Component}.
 * #### Calls `fn`.
 * #### Sets {@link context.currentComponent} to `null`.
 *
 * @param fn {@link ComponentFn} to be called with `children`.
 * @param children Children of component.
 * @param props Props of component.
 * @param childrenRefCleanup Function that clears `ref` attributes of `children`. `null` when `children` has no `ref`.
 *
 *
 *
 * @returns Result of `fn` call.
 */

export const createComponent = <
	P extends ComponentProps<VoidElement<Element>, VoidElement<Element>>,
>(
	fn: ComponentFn<P>,
	props: NoInfer<P>,
	parentCleanups: Component['cleanups'],
	childrenRefsCleanup: Cleanup | null,
): ComponentChild => {
	const parentComponent = context.currentComponent;

	const component: Component = {
		cleanups: childrenRefsCleanup ? [childrenRefsCleanup] : [],

		subs: [],
	};

	context.currentComponent = component;

	const rootChild = fn(props, parentCleanups);

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
 * @param expr {@link ComponentChild} to be inserted.
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

export const insert = (
	expr: ComponentChild,
	anchor: Comment,
	exprScope: ExprScope | null,
): void => {
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

			disposeExprScope(exprScope);
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
 * #### Clears subscribers of `exprScope.subs`.
 * #### Calls {@link disposeComponent} for every `exprScope.components`.
 *
 * @param exprScope {@link ExprScope} to be disposed.
 */
export const disposeExprScope = (exprScope: ExprScope): void => {
	exprScope.refCleanup?.();

	const subs = exprScope.subs;
	const subsLength = subs.length;
	for (let subIndex = 0; subIndex < subsLength; subIndex++) {}

	const components = exprScope.components;
	const componentsLength = components.length;
	for (let compIndex = 0; compIndex < componentsLength; compIndex++) {
		disposeComponent(components[compIndex]);
	}
};

/**
 *
 * #### Merges `attributes` to `element` attributes.
 * #### Handles `aria-*`, `data-*` and event attributes.
 *
 * @param element Element to be merged with `attributes`.
 * @param attributes Attributes to be moved to `element`.
 *
 */

export const mergeAttrs = <T extends VoidElement<HTMLElement>>(
	element: T,
	attributes: NoInfer<Partial<T>>,
): void => {
	for (const name in attributes) {
		const value = attributes[name];
		if (name.includes('-')) {
			element.setAttribute(name, value as string);
		} else if (name[0] + name[1] === 'on') {
			if (DELEGABLE_EVENTS.has(name as DelegableEvent)) {
				element[name as DelegableEvent] = value as () => void;
			} else {
				element[name.toLowerCase() as keyof T] = value as T[keyof T];
			}
		} else {
			element[name as keyof T] = value as T[keyof T];
		}
	}
};

// --- Delegation handlers ---
// All the handlers have identical logic but different events
// They must be variables and not stored to some kind of `delegationHandlers` object for tree-shaking

export const onClick = (event: PointerEvent): void => {
	let element = event.target as VoidElement<HTMLElement> | null;
	while (element) {
		element.onClick?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const onPointerDown = (event: PointerEvent): void => {
	let element = event.target as VoidElement<HTMLElement> | null;
	while (element) {
		element.onPointerDown?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const onPointerUp = (event: PointerEvent): void => {
	let element = event.target as VoidElement<HTMLElement> | null;
	while (element) {
		element.onPointerUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const onInput = (event: Event): void => {
	let element = event.target as VoidElement<HTMLElement> | null;

	while (element) {
		element.onInput?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const onChange = (event: Event): void => {
	let element = event.target as VoidElement<HTMLElement> | null;
	while (element) {
		element.onChange?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const onKeyDown = (event: KeyboardEvent): void => {
	let element = event.target as VoidElement<HTMLElement> | null;

	while (element) {
		element.onKeyDown?.(event);

		if (event.cancelBubble) {
			return;
		}
		element = element.parentElement;
	}
};
export const onKeyUp = (event: KeyboardEvent): void => {
	let element = event.target as VoidElement<HTMLElement> | null;
	while (element) {
		element.onKeyUp?.(event);

		if (event.cancelBubble) {
			return;
		}
		element = element.parentElement;
	}
};

export const onSubmit = (event: SubmitEvent): void => {
	let element = event.target as VoidElement<HTMLElement> | null;

	while (element) {
		element.onSubmit?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
