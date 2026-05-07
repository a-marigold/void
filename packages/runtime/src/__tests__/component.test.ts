import { describe, it, expect } from 'bun:test';

import { mergeAttrs } from '../component';

describe('mergeAttrs', () => {
	it('should add attributes correctly', () => {
		const element = document.createElement('div');

		const value = 'hello';

		mergeAttrs(element, {
			className: value,
			ariaLabel: value,

			'aria-atomic': value,

			'data-value': value,
		});

		expect(element.className).toBe(value);

		expect(element.ariaLabel).toBe(value);

		expect(element.getAttribute('aria-atomic')).toBe(value);

		expect(element.dataset.value).toBe(value);
	});

	it('should delete attribute from element if its value is `undefined`', () => {
		const el = document.createElement('div');

		el.className = 'cl';
		el.ariaLabel = 'hello';
		el.dataset.myData = 'data';
		el.setAttribute('custom-attr', 'custom-valuee');

		mergeAttrs(el, {
			className: undefined,
			ariaLabel: undefined,
			'data-my-data': undefined,
			'custom-attr': undefined,
		});

		expect(el.getAttribute('className')).toBe(null);
		expect(el.getAttribute('ariaLabel')).toBe(null);
		expect(el.getAttribute('data-my-data')).toBe(null);
		expect(el.getAttribute('custom-attr')).toBe(null);
	});
});
