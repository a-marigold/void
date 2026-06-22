import type { DelegableEvent } from '@void/shared';

import { ChildNodeType, DELEGABLE_EVENTS } from './constants';
import { context } from './context';
import type {
	ComponentProps,
	ComponentFn,
	ComponentChild,
	VoidElement,
	Scope,
	Anchor,
} from './types';

/**
 * #### Sets {@link context.currentScope} to created {@link Component}.
 * #### Calls `fn`.
 * #### Sets {@link context.currentScope} to `null`.
 *
 *
 * @param fn {@link ComponentFn} to be called with `children`.
 * @param props Props of component.
 *
 * @returns Result of `fn` call.
 */

export const createComponent = <
	P extends ComponentProps<VoidElement<Element>, VoidElement<Element>>,
>(
	fn: ComponentFn<P>,
	props: NoInfer<P>,
	scopeCleanups: Scope['cleanups'],
): ComponentChild => {
	const rootChild = fn(props, scopeCleanups);

	return rootChild;
};

/**
 *
 *
 * #### Calls all `component.cleanups`.
 * #### Clears subscribers of `component.subs`.
 *
 * @param component {@link Component} to be disposed.
 */

// export const disposeComponent = (component: Component): void => {
// 	const cleanups = component.cleanups;
// 	const cleanupsLength = cleanups.length;
// 	for (let cleanupIndex = 0; cleanupIndex < cleanupsLength; cleanupIndex++) {
// 		cleanups[cleanupIndex]();
// 	}

// 	const subs = component.subs;
// 	const subsLength = subs.length;
// 	for (let subIndex = 0; subIndex < subsLength; subIndex++) {}
// };

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

export const insert = (expr: ComponentChild, anchor: Anchor): ChildNode | null => {
	// `anchor` always has a parent 'cause it is from compiled `template` (DocumentFragment)
	const parent = anchor.parentNode as Node;

	const exprType = typeof expr;
	if (exprType === 'string' || exprType === 'number') {
		return parent.insertBefore(document.createTextNode(expr as string), anchor);
	}

	if (expr) {
		let newNode =
			(expr as Element | DocumentFragment).nodeType ===
			ChildNodeType.DocumentFragment
				? parent.insertBefore(document.createComment(''), anchor)
				: (expr as Element);

		parent.insertBefore(expr as Element, anchor);

		return newNode;
	}

	return null;
};

/**
 * #### Deletes every node from `startAnchor` to `endAnchor`.
 * #### Deletes `startAnchor`, but does not delete `endAnchor`.
 *
 *
 * @param startAnchor Node to start deletion from.
 * @param endAnchor Anchor which ends deletion.
 */
export const deleteFragmentNodes = (startAnchor: ChildNode, endAnchor: Anchor): void => {
	let currentNode: ChildNode = startAnchor;
	while (currentNode !== endAnchor) {
		// There are always nodes from `startNode` to `anchor`, so it is not dangerous
		const nextSibling = currentNode.nextSibling as ChildNode;

		currentNode.remove();

		currentNode = nextSibling;
	}
};

/**
 * #### Calls every cleanup of `scope.cleanups`.
 * #### Clears subscribers of `exprScope.subs`.
 *
 * @param scope {@link Scope} to be disposed.
 */
export const disposeScope = (scope: Scope): void => {
	const cleanups = scope.cleanups;
	const cleanupsLength = cleanups.length;
	for (let cleanupIndex = 0; cleanupIndex < cleanupsLength; cleanupIndex++) {
		cleanups[cleanupIndex]();
	}

	const subs = scope.subs;
	const subsLength = subs.length;
	for (let subIndex = 0; subIndex < subsLength; subIndex++) {}
};

/**
 *
 *
 *
 *
 *
 *
 *
 *
 * #### Merges `attributes` to `element` attributes.
 * #### Handles `aria-*`, `data-*` and event attributes.
 *
 * @param element Element to be merged with `attributes`.
 * @param attributes Attributes to be moved to `element`.
 *
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
