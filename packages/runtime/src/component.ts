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
export const delegatedOnClick = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onClick'> | null;
	while (element) {
		element.$Click?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const delegatedOnPointerDown = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onPointerDown'> | null;
	while (element) {
		element.$PointerDown?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const delegatedOnPointerUp = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onPointerUp'> | null;
	while (element) {
		element.$PointerUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const delegatedOnInput = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onInput'> | null;
	while (element) {
		element.$Input?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const delegatedOnChange = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onChange'> | null;
	while (element) {
		element.$Change?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const delegatedOnKeyDown = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onKeyDown'> | null;
	while (element) {
		element.$KeyDown?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
export const delegatedOnKeyUp = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onKeyUp'> | null;
	while (element) {
		element.$KeyUp?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};

export const delegatedOnSubmit = (event: MouseEvent): void => {
	let element = event.target as DelegatedEventTarget<'onSubmit'> | null;
	while (element) {
		element.$Submit?.(event);

		if (event.cancelBubble) {
			return;
		}

		element = element.parentElement;
	}
};
