import { describe, it, expect } from 'bun:test';

import type { JSXElement, JSXFragment } from 'oxc-parser';

import { JSXInfoType } from '../../../../phases/transformer/jsx/constants';
import {
	generateDom,
	generateChildPath,
	generateSiblingPath,
	trimJsxText,
} from '../../../../phases/transformer/jsx/generate';
import * as nodes from '../../../../phases/transformer/nodes';
import { mockGen, mockParse, mockRuntimeApiNames } from '../__testingUtils__';

describe('generateDom', () => {
	describe('templateHtml', () => {
		it('should handle every type of JSX child', () => {
			expect(
				generateDom(
					mockParse(
						'<div> Text {staticExpr}<Counter />{reactiveExpr}<p> PText </p>{"  Literal Expression  "}</div>',
					) as JSXElement,
					'tc',
					[
						// div
						JSXInfoType.Attrs,
						[],

						// Text
						JSXInfoType.Text,

						// {staticExpr}
						JSXInfoType.StaticExpression,

						// <Counter />
						JSXInfoType.Component,

						// {reactiveExpr}
						JSXInfoType.ReactiveExpression,

						// p
						JSXInfoType.Attrs,
						[],

						// PText
						JSXInfoType.Text,

						// {"  Literal Expression  "}
						JSXInfoType.LiteralExpression,
					],

					new WeakSet(),

					new Set(),

					mockRuntimeApiNames(),
				).templateHtml,
			).toMatchInlineSnapshot(
				`"<div> Text <!----><!----><!----><p> PText </p>  Literal Expression  </div>"`,
			);
		});

		it('should flatten JSXFragment in `templateHtml`', () => {
			expect(
				generateDom(
					mockParse(
						'<> Text1 {expr}<div> DivText {reactiveExpr}</div><Counter />s</>',
					) as JSXFragment,
					'tc',

					[
						// Text1
						JSXInfoType.Text,

						// {expr}
						JSXInfoType.StaticExpression,

						// div
						JSXInfoType.Attrs,
						[],

						// DivText

						JSXInfoType.Text,

						// {reactiveExpr}
						JSXInfoType.ReactiveExpression,

						// <Counter />
						JSXInfoType.Component,
					],

					new WeakSet(),

					new Set(),

					mockRuntimeApiNames(),
				).templateHtml,
			).toMatchInlineSnapshot(`"s<!----><div> DivText <!----></div><!---->"`);
		});

		it('should insert literals from expressions as they are to `templateHtml`', () => {
			const strLiteral = '      LITERAL        EXPRESSION   \t\t\t\t\t\t';
			const nullLiteral = 'null';
			const numLiteral = '16';
			const undefinedLiteral = 'undefined';

			const templateHtml = generateDom(
				mockParse(
					`<div>{ ${'"' + strLiteral + '"'} }{ ${nullLiteral} }{ ${numLiteral} }{ ${undefinedLiteral} }</div>`,
				) as JSXElement,
				'tc',
				[
					JSXInfoType.Attrs,
					[],
					JSXInfoType.LiteralExpression,
					JSXInfoType.LiteralExpression,
					JSXInfoType.LiteralExpression,
					JSXInfoType.LiteralExpression,
				],
				new WeakSet(),

				new Set(),

				mockRuntimeApiNames(),
			).templateHtml;

			expect(templateHtml).toInclude(strLiteral);
			expect(templateHtml).toInclude(nullLiteral);
			expect(templateHtml).toInclude(numLiteral);
			expect(templateHtml).toInclude(undefinedLiteral);

			expect(templateHtml).toMatchInlineSnapshot(
				`"<div>      LITERAL        EXPRESSION   						null16undefined</div>"`,
			);
		});

		it('should trim Text by rules', () => {
			expect(
				generateDom(
					// Imitate formatted JSX code
					mockParse(`<>
  Text
  
  <div> 
    DivText
  </div>
</?`) as JSXElement,

					'tc',

					[JSXInfoType.Text, JSXInfoType.Attrs, [], JSXInfoType.Text],
					new WeakSet(),

					new Set(),

					mockRuntimeApiNames(),
				).templateHtml,
			).toMatchInlineSnapshot(`"<div>DivText</div>"`);
		});
	});

	describe('domOps', () => {
		// TODO: fix path building via filtering nodes by dynamism
		it.todo('should build correct paths to elements if `root` is `JSXElement`', () => {
			expect(
				mockGen(
					nodes.blockStatement(
						generateDom(
							mockParse(
								'<div> Text <p> PText  <em> EMText </em></p>{expr}</div>',
							) as JSXElement,

							'tContent',

							[],

							new WeakSet(),

							new Set(),

							mockRuntimeApiNames(),
						).domOps,
					),
				),
			).toMatchInlineSnapshot(`
			  "{
			  const _$el = tContent.cloneNode(true),
			  _$el0 = _$el.firstChild,
			  _$el1 = _$el0.firstChild,
			  _$el2 = .firstChild,
			  _$el3 = _$el2.firstChild,
			  _$el4 = .firstChild,
			  _$el5 = _$el4.firstChild,
			  _$el6 = .firstChild;
			  return _$el;}"
			`);
		});

		it.todo('should build correct paths to elements if `root` is `JSXFragment`', () => {
			expect(
				mockGen(
					nodes.blockStatement(
						generateDom(
							mockParse(
								'Text <p> PText  <em> EMText </em></p>{expr}',
							) as JSXElement,

							'tContent',

							[],

							new WeakSet(),

							new Set(),

							mockRuntimeApiNames(),
						).domOps,
					),
				),
			).toMatchInlineSnapshot();
		});
	});

	it('should add all appeared events to `delegatedEvents`', () => {});
});
describe('generateChildPath', () => {
	it('should return `parentName.firstChild` if `childIndex` is `0`', () => {
		expect(mockGen(generateChildPath('parentDiv', 0))).toMatchInlineSnapshot(
			`"parentDiv.firstChild"`,
		);
	});

	it('should return correct path with `nextSibling` property accesses', () => {
		expect(mockGen(generateChildPath('parentEl', 6))).toMatchInlineSnapshot(
			`"parentEl.firstChild.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling"`,
		);
	});
});

describe('generateSiblingPath', () => {
	it('should return identifier node if `siblingIndex` is `0`', () => {
		const anchorName = 'siblingEle';

		expect(generateSiblingPath(anchorName, 0)).toHaveProperty('name', anchorName);
	});

	it('should return correct path to sibling', () => {
		expect(mockGen(generateSiblingPath('anchor', 6))).toMatchInlineSnapshot(
			`"anchor.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling.nextSibling"`,
		);
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
