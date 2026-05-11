import type { DelegatedEventTarget } from './types';

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

// TODO: test

// --- Delegation handlers ---
// All the handlers have identical logic but different events
// They must be variables and not stored to `delegationHandlers` object for tree shaking

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
