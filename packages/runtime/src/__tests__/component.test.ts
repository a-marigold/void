import { describe, it, expect } from 'bun:test';

import { mergeAttrs, insert } from '../component';

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

describe('insert', () => {
	const mockParent = () => document.createElement('div');

	const mockAnchor = (parent: Element) => parent.appendChild(document.createComment(''));

	describe('return value', () => {
		it('should return the same `expr` if it is a node', () => {
			const parentMock = mockParent();

			const expr = document.createElement('div');

			expect(insert(expr, parentMock, mockAnchor(parentMock), null)).toBe(expr);
		});

		it('should return an anchor for fragment', () => {
			const parentMock = mockParent();

			const template = document.createElement('template');

			template.innerHTML = '<div> </div> <span> </span>';

			expect(
				insert(template.content, parentMock, mockAnchor(parentMock), null)
					?.nodeType,
			).toBe(Node.COMMENT_NODE);
		});

		it('should return `null` for falsy values', () => {
			const parentMock = mockParent();

			expect(insert(null, parentMock, mockAnchor(parentMock), null));
			expect(insert(undefined, parentMock, mockAnchor(parentMock), null));
			expect(insert(false, parentMock, mockAnchor(parentMock), null));
		});
	});

	describe('insertion', () => {
		it('should insert `expr` just behind `anchor`', () => {
			const parent = document.createElement('div');
			const anchor = document.createComment('');
			parent.appendChild(anchor);

			const expr = document.createElement('span');

			insert(expr, parent, anchor, null);

			expect(parent.firstChild).toBe(expr);

			expect(anchor.previousSibling).toBe(expr);
		});

		it('should insert Text node for string and number', () => {
			{
				// string
				const parent = document.createElement('div');
				const anchor = document.createComment('');

				parent.appendChild(anchor);

				const expr = 'heello';

				insert(expr, parent, anchor, null);
				const text = parent.firstChild;
				expect(text?.nodeType).toBe(Node.TEXT_NODE);
				expect(text?.nodeValue).toBe(expr);
			}

			{
				// number
				const parent = document.createElement('div');
				const anchor = document.createComment('');
				parent.appendChild(anchor);

				const expr = 16;
				insert(expr, parent, anchor, null);

				const text = parent.firstChild;
				expect(text?.nodeType).toBe(Node.TEXT_NODE);
				expect(parent?.nodeValue).toBe(expr.toString());
			}
		});
	});
});
