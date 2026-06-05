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
import type {
	AttrInfos,
	GenerateDOMResult,
	JSXInfos,
} from '../../../../phases/transformer/jsx/types';
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
						[],

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
						[],
					],

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

					new Set(),

					mockRuntimeApiNames(),
				).templateHtml,
			).toMatchInlineSnapshot(`"Text<div>DivText</div>"`);
		});

		it('should not add closing tag for self-closing HTML tags', () => {
			expect(
				generateDom(
					mockParse(
						'<><input value={"Hello"}/><track srclang={expr}/><source/></>',
					) as JSXFragment,
					'tContent',

					[
						JSXInfoType.StaticParent,
						[
							AttrInfoType.Literal,
							'value',
							nodes.literal('Hello'),
						],
						JSXInfoType.DynamicParent,
						[
							AttrInfoType.Static,
							'srclang',
							nodes.identifier('expr'),
						],
						JSXInfoType.StaticParent,
						[],
					],

					new Set(),

					mockRuntimeApiNames(),
				).templateHtml,
			).toMatchInlineSnapshot(`"<input value="Hello"/><track /><source/>"`);
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
							JSXInfoType.DynamicParent,
							[],
							JSXInfoType.StaticExpression,
						],

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
							JSXInfoType.DynamicParent,
							[],

							JSXInfoType.ReactiveExpression,
						],

						new Set(),

						mockRuntimeApiNames(),
					).domOps,
				),
			).toMatchInlineSnapshot(`
			  "{
			  const _$el = tContent.cloneNode(true),
			  _$el0 = _$el.firstChild,
			  _$el1 = _$el0.firstChild;
			  let _$p = null;
			  _$createEffect(() => _$p = _$insert(reactiveCond() ? 16 : 0, _$el1, _$p));
			  return _$el;}"
			`);
		});

		describe('element paths building', () => {
			it('should build paths only to dynamic elements if root is `JSXElement`', () => {
				expect(
					mockGenDomOps(
						generateDom(
							mockParse(
								'<div> Text {" Literal   "}<p> PText <em>{emExpr()}</em></p>{expr()}</div>',
							) as JSXElement,

							'tContent',
							[
								// div
								JSXInfoType.DynamicParent,
								[],

								// Text
								JSXInfoType.Text,

								// {" Literal  "}
								JSXInfoType.LiteralExpression,

								// p
								JSXInfoType.DynamicParent,
								[],

								// PText
								JSXInfoType.Text,

								// em
								JSXInfoType.DynamicParent,
								[],

								// {emExpr()}
								JSXInfoType.ReactiveExpression,

								// {expr()}
								JSXInfoType.StaticExpression,
							],

							new Set(),

							mockRuntimeApiNames(),
						).domOps,
					),
				).toMatchInlineSnapshot(`
				  "{
				  const _$el = tContent.cloneNode(true),
				  _$el0 = _$el.firstChild,
				  _$el1 = _$el0.firstChild.nextSibling,
				  _$el2 = _$el1.firstChild.nextSibling,
				  _$el3 = _$el2.firstChild,
				  _$el4 = _$el1.nextSibling;
				  let _$p = null;
				  _$createEffect(() => _$p = _$insert(emExpr(), _$el3, _$p));_$insert(expr(), _$el4, null);
				  return _$el;}"
				`);
			});

			it('should build paths only to dynamic elements if root is `JSXFragment`', () => {
				expect(
					mockGenDomOps(
						generateDom(
							mockParse(
								'<> Text {" Literal   "}<p> PText <em>{emExpr()}</em></p>{expr()}</>',
							) as JSXElement,
							'tContent',
							[
								// Text
								JSXInfoType.Text,

								// {" Literal  "}
								JSXInfoType.LiteralExpression,

								// p
								JSXInfoType.DynamicParent,
								[],

								// PText
								JSXInfoType.Text,

								// em
								JSXInfoType.DynamicParent,
								[],

								// {emExpr()}
								JSXInfoType.ReactiveExpression,

								// {expr()}
								JSXInfoType.StaticExpression,
							],

							new Set(),

							mockRuntimeApiNames(),
						).domOps,
					),
				).toMatchInlineSnapshot(`
				  "{
				  const _$el = tContent.cloneNode(true),
				  _$el0 = _$el.firstChild.nextSibling,
				  _$el1 = _$el0.firstChild.nextSibling,
				  _$el2 = _$el1.firstChild,
				  _$el3 = _$el0.nextSibling;
				  let _$p = null;
				  _$createEffect(() => _$p = _$insert(emExpr(), _$el2, _$p));_$insert(expr(), _$el3, null);
				  return _$el;}"
				`);
			});

			it('should not build path to any element if the whole `root` is static', () => {
				const rootChildren =
					'<article> Hello World! <p> contents </p></article>';

				const rootChildrenJsxInfos: JSXInfos = [
					// article

					JSXInfoType.StaticParent,
					[],

					// Hello World!
					JSXInfoType.Text,

					// p
					JSXInfoType.StaticParent,
					[],

					// contents
					JSXInfoType.Text,
				];

				expect(
					mockGenDomOps(
						generateDom(
							mockParse(rootChildren) as JSXElement,
							'tContent',
							rootChildrenJsxInfos,

							new Set(),
							mockRuntimeApiNames(),
						).domOps,
					),
				).toMatchInlineSnapshot(`
				  "{
				  const _$el = tContent.cloneNode(true);

				  return _$el;}"
				`);

				expect(
					mockGenDomOps(
						generateDom(
							mockParse(
								`<>${rootChildren}</>`,
							) as JSXElement,
							'tContent',

							[...rootChildrenJsxInfos],

							new Set(),

							mockRuntimeApiNames(),
						).domOps,
					),
				).toMatchInlineSnapshot(`
				  "{
				  const _$el = tContent.cloneNode(true);

				  return _$el;}"
				`);
			});

			it('should take in account merged Text nodes and Literal Expressions', () => {
				const rootChildren = `
	{expr1}
	<span>
		{expr2}
	</span>
	{expr3}
	
	Text
`;

				const rootChildrenJsxInfos: JSXInfos = [
					// empty starting text
					JSXInfoType.Text,

					// {expr1}
					JSXInfoType.StaticExpression,

					// {expr1} ending text
					JSXInfoType.Text,
					// span
					JSXInfoType.DynamicParent,
					[],
					// empty span starting text
					JSXInfoType.Text,
					// {expr2}
					JSXInfoType.StaticExpression,
					// empty span ending text
					JSXInfoType.Text,
					// empty text
					JSXInfoType.Text,
					// {expr3}
					JSXInfoType.ReactiveExpression,
					// Text
					JSXInfoType.Text,
				];

				expect(
					mockGenDomOps(
						generateDom(
							mockParse(
								`<div>${rootChildren}</div>`,
							) as JSXElement,
							'tContent',
							[
								// div
								JSXInfoType.DynamicParent,
								[],

								...rootChildrenJsxInfos,
							],
							new Set(),
							mockRuntimeApiNames(),
						).domOps,
					),
				).toMatchInlineSnapshot(`
				  "{
				  const _$el = tContent.cloneNode(true),
				  _$el0 = _$el.firstChild,
				  _$el1 = _$el0.firstChild,
				  _$el2 = _$el1.nextSibling,
				  _$el3 = _$el2.firstChild,
				  _$el4 = _$el2.nextSibling;
				  _$insert(expr1, _$el1, null);_$insert(expr2, _$el3, null);
				  let _$p = null;
				  _$createEffect(() => _$p = _$insert(expr3, _$el4, _$p));
				  return _$el;}"
				`);

				expect(
					mockGenDomOps(
						generateDom(
							mockParse(
								`<>${rootChildren}</>`,
							) as JSXElement,
							'tContent',

							[...rootChildrenJsxInfos],
							new Set(),
							mockRuntimeApiNames(),
						).domOps,
					),
				).toMatchInlineSnapshot(`
				  "{
				  const _$el = tContent.cloneNode(true),
				  _$el0 = _$el.firstChild,
				  _$el1 = _$el0.nextSibling,
				  _$el2 = _$el1.firstChild,
				  _$el3 = _$el1.nextSibling;
				  _$insert(expr1, _$el0, null);_$insert(expr2, _$el2, null);
				  let _$p = null;
				  _$createEffect(() => _$p = _$insert(expr3, _$el3, _$p));
				  return _$el;}"
				`);
			});
		});
	});
});

describe('generateAttributes', () => {
	it('should translate name of literal attribute, add it to `templateHtml` and nor add it to `domOps`', () => {
		const generateDomResult: GenerateDOMResult = {
			templateHtml: '',
			domOps: [],

			delegableEvents: [],
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
				'className',
				nodes.literal('dv'),
			],
			'_$elid',
			generateDomResult,
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
			delegableEvents: [],
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

			delegableEvents: [],
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

			mockRuntimeApiNames(),
		);

		expect(generateDomResult.templateHtml).toBe('');

		expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
		  "{
		  _$createEffect(() => _$elid.disabled = isDisabled());
		  _$createEffect(() => _$elid.value = inputValue());}"
		`);
	});

	it('should call expression of `ref` attribute with `elIdName` argument', () => {
		const generateDomResult: GenerateDOMResult = {
			templateHtml: '',
			domOps: [],
			delegableEvents: [],
		};

		generateAttrs(
			[AttrInfoType.Ref, 'ref', nodes.arrowFunction(nodes.blockStatement([]))],
			'_$ELidNAME',
			generateDomResult,
			mockRuntimeApiNames(),
		);

		expect(generateDomResult.templateHtml).toBe('');

		expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
		  "{
		  (() => {})(_$ELidNAME);}"
		`);
	});
	describe('events', () => {
		it('should handle all delegable events, handle their `AttrInfoType` and add them to `delegatedEvents`', () => {
			const generateDomResult: GenerateDOMResult = {
				templateHtml: '',
				domOps: [],

				delegableEvents: [],
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
				).reduce<AttrInfos>((result, event, index) => {
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

		it('should add property-handler to element if event is not delegable and should handle their `AttrInfoType`', () => {
			const generateDomResult: GenerateDOMResult = {
				templateHtml: '',

				domOps: [],

				delegableEvents: [],
			};

			generateAttrs(
				[
					AttrInfoType.Static,
					'onMouseOver',
					nodes.identifier('handler'),

					AttrInfoType.Reactive,
					'onLoad',
					nodes.identifier('handler2'),
				],
				'_$elid',
				generateDomResult,
				mockRuntimeApiNames(),
			);

			expect(generateDomResult.templateHtml).toBe('');

			expect(mockGenDomOps(generateDomResult.domOps)).toMatchInlineSnapshot(`
			  "{
			  _$elid.onmouseover = handler;
			  _$createEffect(() => _$elid.onload = handler2);}"
			`);
		});
	});
});

describe('generateChildPath', () => {
	it('should return `parentName.firstChild` if `childIndex` is `0`', () => {
		expect(mockGen(generateChildPath('parentDiv', 0))).toMatchInlineSnapshot(
			`"parentDiv.firstChild"`,
		);
	});
	// <div> <p> </p> {expr} </div>
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

	it('should return empty string if a string that contains only line feeds, spaces and is passed', () => {
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
