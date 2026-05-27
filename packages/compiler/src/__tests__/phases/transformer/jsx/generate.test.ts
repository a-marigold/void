import { describe, it, expect } from 'bun:test';

import type { DelegableEvent } from '@void/shared';
import type { JSXElement, JSXFragment } from 'oxc-parser';

import { AttrInfoType, JSXInfoType } from '../../../../phases/transformer/jsx/constants';
import {
	generateDom,
	generateChildPath,
	generateSiblingPath,
	trimJsxText,
	generateAttrs,
} from '../../../../phases/transformer/jsx/generate';
import type { AttrsInfo, GenerateDOMResult } from '../../../../phases/transformer/jsx/types';
import * as nodes from '../../../../phases/transformer/nodes';
import { mockGen, mockParse, mockRuntimeApiNames } from '../__testingUtils__';

/**
 *
 *
 * Testing utility.
 *
 * @param domOps {@link GenerateDOMResult.domOps}.
 *
 * @returns String with generated `domOps`.
 */
const mockGenDomOps = (domOps: GenerateDOMResult['domOps']): string =>
	mockGen(nodes.blockStatement(domOps));

describe('generateDom', () => {
	describe('templateHtml', () => {
		it('should handle every type of JSX child', () => {
			expect(
				generateDom(
					mockParse(
						'<div> Text {staticExpr}<Counter />{reactiveExpr}<p> PText </p>{"  Literal Expression  "}</div>',
					) as JSXElement,
					'tContent',
					[
						// div
						JSXInfoType.StaticParent,
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
						JSXInfoType.StaticParent,
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
						'<> Text1 {expr}<div> DivText {reactiveExpr}</div><Counter /></>',
					) as JSXFragment,
					'tContent',

					[
						// Text1
						JSXInfoType.Text,

						// {expr}
						JSXInfoType.StaticExpression,

						// div
						JSXInfoType.StaticParent,
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
			).toMatchInlineSnapshot(
				`" Text1 <!----><div> DivText <!----></div><!---->"`,
			);
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

				'tContent',
				[
					JSXInfoType.StaticParent,
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
</>`) as JSXElement,

					'tContent',

					[
						JSXInfoType.Text,
						JSXInfoType.StaticParent,
						[],
						JSXInfoType.Text,
					],
					new WeakSet(),

					new Set(),

					mockRuntimeApiNames(),
				).templateHtml,
			).toMatchInlineSnapshot(`"Text<div>DivText</div>"`);
		});
	});

	describe('domOps', () => {
		it('should use `insert` runtime fn for `StaticExpression`', () => {
			expect(
				mockGenDomOps(
					generateDom(
						mockParse(
							'<div>{staticCond() ? "hello" : "bye"}</div>',
						) as JSXElement,
						'tContent',
						[
							JSXInfoType.StaticParent,
							[],
							JSXInfoType.StaticExpression,
							JSXInfoType.ReactiveExpression,
						],
						new WeakSet(),
						new Set(),
						mockRuntimeApiNames(),
					).domOps,
				),
			).toMatchInlineSnapshot(`
			  "{
			  const _$el = tContent.cloneNode(true),
			  _$el0 = _$el.firstChild,
			  _$el1 = _$el0.firstChild;
			  _$insert(staticCond() ? "hello" : "bye", _$el1, null);
			  return _$el;}"
			`);
		});

		it('should use `insert` and `createEffect` runtime fn for `ReactiveExpression`', () => {
			expect(
				mockGenDomOps(
					generateDom(
						mockParse(
							'<div>{reactiveCond() ? 16 : 0}</div>',
						) as JSXElement,
						'tContent',
						[
							JSXInfoType.StaticParent,
							[],
							JSXInfoType.StaticExpression,

							JSXInfoType.ReactiveExpression,
						],

						new WeakSet(),
						new Set(),
						mockRuntimeApiNames(),
					).domOps,
				),
			).toMatchInlineSnapshot(`
			  "{
			  const _$el = tContent.cloneNode(true),
			  _$el0 = _$el.firstChild,
			  _$el1 = _$el0.firstChild;
			  _$insert(reactiveCond() ? 16 : 0, _$el1, null);
			  return _$el;}"
			`);
		});

		// TODO: fix path building via filtering nodes by dynamism
		it.todo('should build correct paths to elements if `root` is `JSXElement`', () => {
			expect(
				mockGenDomOps(
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
				mockGenDomOps(
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
			).toMatchInlineSnapshot();
		});
	});
});

describe('generateAttributes', () => {
	it('should translate name of literal attribute, add it to `templateHtml` and nor add it to `domOps`', () => {
		const generateDomResult: GenerateDOMResult = {
			templateHtml: '',
			domOps: [],
			delegatedEvents: [],
		};
		generateAttrs(
			[
				AttrInfoType.Literal,
				'httpEquiv',
				nodes.literal('Refresh'),

				AttrInfoType.Literal,
				'minLength',
				nodes.literal(16),

				AttrInfoType.Literal,
				'class',
				nodes.literal('dv'),
			],

			'_$elid',
			generateDomResult,
			new WeakSet(),
			mockRuntimeApiNames(),
		);

		expect(generateDomResult.templateHtml).toMatchInlineSnapshot(
			`"http-equiv="Refresh"minlength="16"class="dv""`,
		);

		expect(generateDomResult.domOps.length).toBe(0);
	});

	it('should handle `Static` attributes correctly', () => {
		const generateDomResult: GenerateDOMResult = {
			templateHtml: '',

			domOps: [],
			delegatedEvents: [],
		};

		generateAttrs(
			[
				AttrInfoType.Static,
				'className',
				nodes.callExpression(nodes.identifier('getClass'), [], null),

				AttrInfoType.Static,
				'minLength',
				nodes.callExpression(nodes.identifier('getMinLength'), [], null),
			],
			'_$elid',

			generateDomResult,
			new Set(),
			mockRuntimeApiNames(),
		);

		expect(generateDomResult.templateHtml).toBe('');

		expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
		  "{
		  _$elid.className = getClass();
		  _$elid.minLength = getMinLength();}"
		`);
	});

	it('should handle `Reactive` attributes correctly', () => {
		const generateDomResult: GenerateDOMResult = {
			templateHtml: '',

			domOps: [],

			delegatedEvents: [],
		};

		generateAttrs(
			[
				AttrInfoType.Reactive,
				'disabled',
				nodes.callExpression(nodes.identifier('isDisabled'), [], null),

				AttrInfoType.Reactive,
				'value',
				nodes.callExpression(nodes.identifier('inputValue'), [], null),
			],
			'_$elid',
			generateDomResult,
			new Set(),
			mockRuntimeApiNames(),
		);

		expect(generateDomResult.templateHtml).toBe('');
		expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
		  "{
		  _$createEffect(() => _$elid.disabled = isDisabled());
		  _$createEffect(() => _$elid.value = inputValue());}"
		`);
	});

	describe('events', () => {
		it('should handle all delegable events, handle their `AttrInfoType` and add them to `delegatedEvents`', () => {
			const generateDomResult: GenerateDOMResult = {
				templateHtml: '',
				domOps: [],

				delegatedEvents: [],
			};

			generateAttrs(
				(
					[
						'onClick',
						'onPointerDown',
						'onPointerUp',
						'onInput',
						'onChange',
						'onKeyDown',
						'onKeyUp',
						'onSubmit',
					] satisfies DelegableEvent[]
				).reduce<AttrsInfo>((result, event, index) => {
					result.push(
						index > 3.2
							? AttrInfoType.Reactive
							: AttrInfoType.Static,
						event,
						nodes.identifier('handler'),
					);

					return result;
				}, []),
				'_$elid',

				generateDomResult,
				new Set(),
				mockRuntimeApiNames(),
			);

			expect(generateDomResult.templateHtml).toBe('');
			expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
			  "{
			  _$elid.$Click = handler;
			  _$elid.$PointerDown = handler;
			  _$elid.$PointerUp = handler;
			  _$elid.$Input = handler;
			  _$createEffect(() => _$elid.$Change = handler);
			  _$createEffect(() => _$elid.$KeyDown = handler);
			  _$createEffect(() => _$elid.$KeyUp = handler);
			  _$createEffect(() => _$elid.$Submit = handler);}"
			`);
		});

		it('should add property-handler to element if event is not delegable and handle their `AttrInfoType`', () => {
			const generateDomResult: GenerateDOMResult = {
				templateHtml: '',

				domOps: [],

				delegatedEvents: [],
			};

			generateAttrs(
				[
					AttrInfoType.Static,
					'onMouseOver',
					nodes.identifier('handler'),

					AttrInfoType.Static,
					'onLoad',
					nodes.identifier('handler2'),
				],
				'_$elid',

				generateDomResult,

				new Set(),

				mockRuntimeApiNames(),
			);

			expect(generateDomResult.templateHtml).toBe('');

			expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
			  "{
			  _$elid.onmouseover = handler;
			  _$elid.onload = handler2;}"
			`);
		});
	});

	describe.todo('refs', () => {});
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
