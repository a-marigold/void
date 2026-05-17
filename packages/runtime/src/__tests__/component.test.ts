import { describe, it, expect, vi } from 'bun:test';

import { mergeAttrs, insert, $ClickHandler, $PointerUpHandler, $InputHandler } from '../component';
import type { DelegatedEventTarget } from '../types';

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

	it.skip('should delete attribute from element if its value is `undefined`', () => {
		// correct attribute deletion will be handled when logic of `rest` attributes is added

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

		expect(el.className).toBe(null);

		expect(el.ariaLabel).toBe(null);

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

			insert(falsyExpr, anchor, null);

			expect(parent.childElementCount).toBe(0);
			expect(anchor.previousSibling).toBe(null);

			insert(falsyExpr, anchor, null);

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

		const firstExpr = insert(fragment, anchor, null);

		expect(anchor.previousSibling).toBe(lastFragmentElement);

		const secondExpr = document.createElement('figure');

		insert(secondExpr, anchor, firstExpr);

		expect(firstFragmentElement.isConnected).toBe(false);

		expect(lastFragmentElement.isConnected).toBe(false);

		expect(anchor.previousSibling).toBe(secondExpr);
	});

	it('should reuse Text nodes if `prevExprNode` is Text node and `expr` is string or number', () => {
		for (const textExpr of ['text', 16]) {
			const parent = mockParent();
			const anchor = mockAnchor(parent);

			const prevExprData = 'string';

			const prevExprNode = insert(prevExprData, anchor, null);

			expect(anchor.previousSibling as Node | null).toBe(prevExprNode);

			expect((prevExprNode as Text).data).toBe(prevExprData);

			insert(textExpr, anchor, prevExprNode);

			expect(anchor.previousSibling as Node | null).toBe(prevExprNode);

			expect((prevExprNode as Text).data).toBe(textExpr.toString());
		}
	});

	describe('return value', () => {
		it('should return the same `expr` if it is a node', () => {
			const expr = document.createElement('div');

			expect(insert(expr, mockAnchor(mockParent()), null)).toBe(expr);
		});

		it('should return an anchor for fragment', () => {
			const template = document.createElement('template');

			template.innerHTML = '<div> </div> <span> </span>';

			expect(
				insert(template.content, mockAnchor(mockParent()), null)?.nodeType,
			).toBe(Node.COMMENT_NODE);
		});

		it('should return `null` for falsy values', () => {
			expect(insert(null, mockAnchor(mockParent()), null));
			expect(insert(undefined, mockAnchor(mockParent()), null));

			expect(insert(false, mockAnchor(mockParent()), null));
		});
	});

	describe('insertion', () => {
		it('should insert `expr` just behind `anchor`', () => {
			const parent = mockParent();

			const anchor = mockAnchor(parent);

			const expr = document.createElement('span');

			insert(expr, anchor, null);

			expect(parent.firstChild).toBe(expr);

			expect(anchor.previousSibling).toBe(expr);
		});

		it('should insert DOM node correctly', () => {
			const parent = mockParent();

			const domNode = document.createElement('div');

			insert(domNode, mockAnchor(parent), null);

			expect(domNode.parentElement).toBe(parent);

			expect(parent.firstChild).toBe(domNode);
		});

		it('should insert Text node for string and number', () => {
			for (const expr of ['hellooo', 16]) {
				const parent = mockParent();

				insert(expr, mockAnchor(parent), null);
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

			insert(template.content, anchor, null);

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
					anchor,

					null,
				);

				insert(falsyExpr, mockAnchor(parent), prevExprNode);

				expect(prevExprNode?.parentElement).toBe(null);

				expect(prevExprNode?.isConnected).toBe(false);
			}
		});

		it('should delete previously inserted DocumentFragment correctly', () => {
			const parent = mockParent();

			const anchor = mockAnchor(parent);

			const fragment = document.createDocumentFragment();

			fragment.appendChild(document.createElement('section'));

			const prevExprNode = insert(fragment, anchor, null);

			insert(null, anchor, prevExprNode);

			expect(parent.childNodes.length).toBe(1); // 1 - `anchor`
		});
	});
});

describe('delegation handlers', () => {
	const mockEl = <K extends keyof HTMLElementTagNameMap>(
		tagName: K,
	): HTMLElementTagNameMap[K] => document.createElement(tagName);

	const connectEls = <T extends HTMLElement>(el: T, parent: HTMLElement): T =>
		parent.appendChild(el);

	it('should bubble up from target to document even if registered on document', () => {
		const parent = connectEls(mockEl('div'), document.body);

		const child = connectEls(mockEl('button'), parent);

		const handler = vi.fn();

		(parent as DelegatedEventTarget<'$Click'>).$Click = (
			child as DelegatedEventTarget<'$Click'>
		).$Click = handler;

		document.addEventListener('click', $ClickHandler);

		child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('should stop immediatly when `event.stopPropagation` is called', () => {
		const container = connectEls(mockEl('div'), document.body);
		const form = connectEls(mockEl('form'), container);

		const element = connectEls(mockEl('input'), form);

		const handler = vi.fn((event: Event) => {
			event.stopPropagation();
		});

		(container as DelegatedEventTarget<'$Input'>).$Input =
			(form as DelegatedEventTarget<'$Input'>).$Input =
			(element as DelegatedEventTarget<'$Input'>).$Input =
				handler;

		document.addEventListener('input', $InputHandler);

		element.dispatchEvent(new Event('input', { bubbles: true }));

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('should call handlers on elements with unchanged `event`', () => {
		const parent = connectEls(mockEl('div'), document.body);
		const child = connectEls(mockEl('button'), parent);

		const expectedEvent = new PointerEvent('pointerup', { bubbles: true });

		let receivedEvent: Event | null = null;

		(parent as DelegatedEventTarget<'$PointerUp'>).$PointerUp = (
			child as DelegatedEventTarget<'$PointerUp'>
		).$PointerUp = (event) => {
			receivedEvent = event;
		};

		document.addEventListener('pointerup', $PointerUpHandler);

		child.dispatchEvent(expectedEvent);

		expect(receivedEvent as Event | null).toBe(expectedEvent);
	});
});
