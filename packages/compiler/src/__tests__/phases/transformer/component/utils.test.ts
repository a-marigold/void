import { describe, it, expect } from 'bun:test';

import type { JSXElement } from 'oxc-parser';

import {
	generateChildPath,
	generateSiblingPath,
	markParentsDynamic,
	trimJsxText,
} from '../../../../phases/transformer/jsx';
import type { AnalyzeJSXResult } from '../../../../phases/transformer/types';
import { generate, mockParse } from '../__testingUtils__';

describe('generateChildPath', () => {
	it('should return `parentName.firstChild` if `childIndex` is `0`', () => {
		expect(generate(generateChildPath('parentDiv', 0))).toMatchInlineSnapshot(
			`"parentDiv.firstChild"`,
		);
	});
	it('should return correct path with `nextSibling` property accesses', () => {
		expect(generate(generateChildPath('parentEl', 6))).toMatchInlineSnapshot(
			`"parentEl.firstChild.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling"`,
		);
	});
});

describe('generateSiblingPath', () => {
	it('should return identifier node if `siblingIndex` is `0`', () => {
		const anchorName = 'siblingEle';
		expect(generateSiblingPath(anchorName, 0)).toHaveProperty(
			'name',

			anchorName,
		);
	});

	it('should return correct path to sibling', () => {
		expect(generate(generateSiblingPath('anchor', 6))).toMatchInlineSnapshot(
			`"anchor.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling"`,
		);
	});
});

describe('markParentsDynamic', () => {
	it('should add all the parents of `node` to `dynamicNodes`', () => {
		const div = mockParse(
			`<div><header><span>{'dynamic'}</span></header></div>`,
		) as JSXElement;

		const header = div.children[0] as JSXElement;
		const span = header.children[0] as JSXElement;
		const dynamicText = span.children[0];

		const parents = new WeakMap([
			[header, div],
			[span, header],
			[dynamicText, span],
		]);

		const dynamicNodes: AnalyzeJSXResult['dynamicNodes'] = new Map();

		markParentsDynamic(dynamicText, parents, dynamicNodes);

		expect([div, header, span].every((parent) => dynamicNodes.has(parent)));
	});
});

describe('trimJsxText', () => {
	it('should return empty string if an empty string is passed', () => {
		expect(trimJsxText('')).toBe('');
	});

	it('should return empty string if a string that contains only line feeds, spaces and  is passed', () => {
		expect(trimJsxText('\t\t\t\t\t     \n\n\n\n\n')).toBe('');
		expect(trimJsxText('\t\t\t\t\t     \r\n \r\n \r\n \r\n \r\n')).toBe('');
	});

	it('should return the same string if there is not any line feed in the start or in the end', () => {
		expect(trimJsxText('   \t   ')).toBe('   \t   ');

		const lfText = '\t    abc \n def    \t';
		expect(trimJsxText(lfText)).toBe(lfText);

		const crlfText = '\t   abc \r\n def   \t';
		expect(trimJsxText(crlfText)).toBe(crlfText);
	});

	it('should return trimmed string if there is line feed in the start or in the end', () => {
		expect(trimJsxText('\n abc   \t')).toBe('abc   \t');
		expect(trimJsxText('\t   abc \n')).toBe('\t   abc');
		expect(trimJsxText('\n \tabc\t  \n')).toBe('abc');

		expect(trimJsxText('\r\n abc   \t')).toBe('abc   \t');
		expect(trimJsxText('\t   abc \r\n')).toBe('\t   abc');
		expect(trimJsxText('\r\n \tabc\t  \r\n')).toBe('abc');
	});
});
