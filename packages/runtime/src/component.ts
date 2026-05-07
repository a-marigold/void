/**
 * #### Merges `attributes` to element attributes.
 * #### Handles `aria-*` and `data-*` attributes.
 *
 * @param element Element to be merged with `attributes`.
 * @param attributes Attributes to be removed to `element`.
 */

export const mergeAttrs = <T extends HTMLElement>(
	element: HTMLElement,
	attributes: Partial<T> & { [name: string]: unknown },
): void => {
	for (const name in attributes) {
		const value = attributes[name];
		if (value === undefined || value === null) {
			element.setAttribute(name, '');
		} else if (name.includes('-')) {
			element.setAttribute(name, value as string);
		} else {
			(element as unknown as Record<string, unknown>)[name] = value;
		}
	}
};

// TODO: test
