import { ChildNodeType } from './constants';
import type { Child, DelegatedEventTarget } from './types';

/**
 * #### Merges `attributes` to element attributes.
 * #### Handles `aria-*` and `data-*` attributes.
 *
 * @param element Element to be merged with `attributes`.
 * @param attributes Attributes to be moved to `element`.
 */

export const mergeAttrs = <T extends HTMLElement>(
	element: HTMLElement,
	attributes: Partial<T> & { [name: string]: unknown },
): void => {
	for (const name in attributes) {
		const value = attributes[name];

		if (value === undefined) {
			element.setAttribute(name, '');
		} else if (name.includes('-')) {
			element.setAttribute(name, value as string);
		} else {
			(element as unknown as Record<string, unknown>)[name] = value;
		}
	}
};

export const insert = (
	expr: Child | DocumentFragment,
	parent: Element,
	anchor: Node,
	prevExprNode: Node | null,
): Node | null => {
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

		let currentSibling = prevExprNode;

		while (currentSibling !== anchor) {
			// siblings are always behind `anchor`
			currentSibling = currentSibling.nextSibling as Node;

			parent.removeChild(currentSibling);
		}
	}

	if (exprType === 'string' || exprType === 'number') {
		return parent.insertBefore(document.createTextNode(expr as string), anchor);
	}

	if (expr) {
		let newExprNode: Node;

		if (
			(expr as Element | DocumentFragment).nodeType ===
			ChildNodeType.DocumentFragment
		) {
			newExprNode = parent.insertBefore(document.createComment(''), anchor);
		} else {
			newExprNode = expr as Element;
		}

		parent.insertBefore(expr as Element | DocumentFragment, anchor);

		return newExprNode;
	}

	return null;
};

// TODO: test

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

export const $PointerDownHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$PointerDown'> | null;
	while (element) {
		element.$PointerDown?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const $PointerUpHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$PointerUp'> | null;
	while (element) {
		element.$PointerUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $InputHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$Input'> | null;
	while (element) {
		element.$Input?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const $ChangeHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$Change'> | null;
	while (element) {
		element.$Change?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $KeyDownHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$KeyDown'> | null;
	while (element) {
		element.$KeyDown?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const $KeyUpHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$KeyUp'> | null;
	while (element) {
		element.$KeyUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const $SubmitHandler = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'$Submit'> | null;
	while (element) {
		element.$Submit?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
