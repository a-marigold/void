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

	it('should do nothing if called with falsy `expr` and `null` in `prevExprNode`', () => {
		for (const falsyExpr of [undefined, null, false as false]) {
			const parent = mockParent();
			const anchor = mockAnchor(parent);

			insert(falsyExpr, parent, anchor, null);

			expect(parent.childElementCount).toBe(0);
			expect(anchor.previousSibling).toBe(null);

			insert(falsyExpr, parent, anchor, null);

			expect(parent.childElementCount).toBe(0);
			expect(anchor.previousSibling).toBe(null);
		}
	});

	it('should delete `prevExprNode` and insert new node to its place', () => {
		const parent = mockParent();
		const anchor = mockAnchor(parent);

		const fragment = document.createDocumentFragment();
		const firstFragmentElement = fragment.appendChild(document.createElement('div'));
		const lastFragmentElement = fragment.appendChild(document.createElement('article'));

		const firstExpr = insert(fragment, parent, anchor, null);

		expect(anchor.previousSibling).toBe(lastFragmentElement);

		const secondExpr = document.createElement('figure');

		insert(secondExpr, parent, anchor, firstExpr);

		expect(firstFragmentElement.isConnected).toBe(false);

		expect(lastFragmentElement.isConnected).toBe(false);

		expect(anchor.previousSibling).toBe(secondExpr);
	});

	it('should reuse Text nodes if `prevExprNode` is Text node and `expr` is string or number', () => {
		for (const textExpr of ['text', 16]) {
			const parent = mockParent();
			const anchor = mockAnchor(parent);

			const prevExprData = 'string';

			const prevExprNode = insert(prevExprData, parent, anchor, null);

			expect(anchor.previousSibling as Node | null).toBe(prevExprNode);

			expect((prevExprNode as Text).data).toBe(prevExprData);

			insert(textExpr, parent, anchor, prevExprNode);

			expect(anchor.previousSibling as Node | null).toBe(prevExprNode);

			expect((prevExprNode as Text).data).toBe(textExpr.toString());
		}
	});

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
			const parent = mockParent();
			const anchor = mockAnchor(parent);

			const expr = document.createElement('span');

			insert(expr, parent, anchor, null);

			expect(parent.firstChild).toBe(expr);

			expect(anchor.previousSibling).toBe(expr);
		});

		it('should insert DOM node correctly', () => {
			const parent = mockParent();

			const domNode = document.createElement('div');

			insert(domNode, parent, mockAnchor(parent), null);
			expect(parent.parentElement).toBe(parent);

			expect(parent.firstChild).toBe(domNode);
		});

		it('should insert Text node for string and number', () => {
			for (const expr of ['hellooo', 16]) {
				const parent = mockParent();

				insert(expr, parent, mockAnchor(parent), null);
				const text = parent.firstChild;
				expect(text?.nodeType).toBe(Node.TEXT_NODE);
				expect(text?.nodeValue).toBe(expr.toString());
			}
		});

		it('should insert extra comment anchor before inserted DocumentFragment', () => {
			const parent = document.createElement('div');
			const anchor = document.createComment('');
			parent.appendChild(anchor);

			const template = document.createElement('template');
			template.innerHTML = '<div></div><span></span>';

			insert(template.content, parent, anchor, null);

			const firstChild = parent.firstChild;

			expect(parent.firstChild?.nodeType).toBe(Node.COMMENT_NODE);

			expect(firstChild?.nextSibling?.nodeName).toBe('DIV');
			expect(firstChild?.nextSibling?.nextSibling?.nodeName).toBe('SPAN');
		});
	});

	describe('deletion', () => {
		it('should just delete `prevExprNode` from DOM if `expr` is falsy', () => {
			for (const falsyExpr of [undefined, null, false as false]) {
				const parent = mockParent();

				const anchor = mockAnchor(parent);

				const prevExprNode = insert(
					document.createElement('article'),
					parent,
					anchor,
					null,
				);

				insert(falsyExpr, parent, mockAnchor(parent), prevExprNode);

				expect(prevExprNode?.parentElement).toBe(null);
				expect(prevExprNode?.isConnected).toBe(false);
			}
		});

		it('should delete previously inserted DocumentFragment correctly', () => {
			const parent = mockParent();
			const anchor = mockAnchor(parent);

			const fragment = document.createDocumentFragment();

			fragment.appendChild(document.createElement('section'));

			const prevExprNode = insert(fragment, parent, anchor, null);

			insert(null, parent, anchor, prevExprNode);

			expect(parent.childNodes.length).toBe(1); // 1 - `anchor`
		});
	});
});
