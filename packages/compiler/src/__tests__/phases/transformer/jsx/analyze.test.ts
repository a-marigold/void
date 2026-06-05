import { describe, it, expect } from 'bun:test';

import type {
	JSXElement,
	JSXFragment,
	JSXExpressionContainer,
	JSXSpreadAttribute,
} from 'oxc-parser';

import { errorMessages } from '../../../../errors';
import { ScopeIdType } from '../../../../phases/transformer/constants';
import {
	analyzeJsx,
	markParentsDynamic,
	analyzeExpr,
	analyzeAttrs,
} from '../../../../phases/transformer/jsx/analyze';
import {
	JSXInfoType,
	AttrInfoType,
	AttrInfoOffset,
	JSXExprType,
} from '../../../../phases/transformer/jsx/constants';
import type {
	JSXParent,
	JSXInfos,
	AttrInfos,
	IIFEBody,
} from '../../../../phases/transformer/jsx/types';
import * as nodes from '../../../../phases/transformer/nodes';
import type { TransformContext } from '../../../../phases/transformer/types';
import {
	mockCompileContext,
	mockGen,
	mockParse,
	mockPreprocessResult,
	mockTransformContext,
} from '../__testingUtils__';

describe('analyzeJsx', () => {
	it('should handle every JSX error', () => {
		// Default mocks for tests performance
		const compileContextMock = mockCompileContext();
		const preprocessResultMock = mockPreprocessResult();

		// Errors can appear twice in the array because some errors have several cases

		for (const { message, jsxCode, transformContext } of [
			{
				message: errorMessages.JSX_INVALID_EL_NAME,
				jsxCode: '<obj.div>hello</obj.div>',
				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_INVALID_EL_NAME,
				jsxCode: '<obj:div/>',

				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_SPREAD_CHILDREN,

				jsxCode: '<>{...obj}</>',

				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_NESTED_FRAGMENT,
				jsxCode: '<><></></>',
				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_NESTED_FRAGMENT,
				jsxCode: '<div><span><></></span></div>',
				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_OUTSIDE_COMPONENT_RETURN,
				jsxCode: '<button onClick={() => { return <div> </div>; }} />',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
			{
				message: errorMessages.JSX_OUTSIDE_COMPONENT_RETURN,
				jsxCode: '<div>{() => <div> </div>}</div>',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
			{
				message: errorMessages.JSX_OUTSIDE_COMPONENT_RETURN,
				jsxCode: '<div>{() => <div/>}</div>',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},

			{
				message: errorMessages.JSX_EMPTY_EXPRESSION,
				jsxCode: '<div>{}</div>',
				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_EMPTY_EXPRESSION,
				jsxCode: '<input value={} />',
				transformContext: mockTransformContext(),
			},
			{
				message: errorMessages.JSX_WRAPPED_ATTR,
				jsxCode: '<button aria-label="hello"/>',
				transformContext: mockTransformContext(),
			},
			{
				message: errorMessages.JSX_ATTR_WITHOUT_VALUE,
				jsxCode: '<button disabled/>',
				transformContext: mockTransformContext(),
			},

			{
				message: errorMessages.JSX_NEED_SELF_CLOSING_EL,

				jsxCode: '<div></div>',
				transformContext: mockTransformContext(),
			},
		] satisfies {
			message: string;
			jsxCode: string;
			transformContext: TransformContext;
		}[]) {
			const errors = transformContext.errors;

			analyzeJsx(
				mockParse(jsxCode) as JSXParent,

				transformContext,

				compileContextMock,

				preprocessResultMock,
			);

			const customExpectError = `\`${message}\` fault.`;

			expect(errors.length, customExpectError).toBe(1);

			expect(errors[0].message).toBe(message);
		}
	});

	it('should add JSXInfoType to the result for every kind of JSX node if `root` is `JSXElement`', () => {
		const defaultIdentifier = 'translation';
		const reactiveIdentifier = 'cond';

		const jsxInfos = analyzeJsx(
			mockParse(
				`<div><span> Span Text </span>{${reactiveIdentifier} ? <span> hello </span> : <p> world </p>} Some Text 1 {${defaultIdentifier}} Some Text 2 <Counter /></div>`,
			) as JSXParent,

			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],
						[reactiveIdentifier, ScopeIdType.Signal],
					]),
				],
				fnScopeCount: 1,
				componentFnScope: 1,
			}),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		let infoIndex = 0;

		// div
		expect(jsxInfos[infoIndex]).toBe(JSXInfoType.DynamicParent);
		expect(jsxInfos[++infoIndex]).toBeArray();

		// span
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.StaticParent);
		expect(jsxInfos[++infoIndex]).toBeArray();

		// Span Text
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Text);

		// {reactiveIdentifier}
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.ReactiveExpression);

		// Some Text 1
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Text);

		// {defaultIdenitifer}
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.StaticExpression);

		// Some Text 2
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Text);

		// <Counter />
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Component);
		expect(jsxInfos[++infoIndex]).toBeArray();
	});

	it('should add JSXInfoType to the result for every kind of JSX node if `root` is `JSXFragment`', () => {
		const defaultIdentifier = 'translation';
		const reactiveIdentifier = 'cond';

		const jsxInfos = analyzeJsx(
			mockParse(
				`<><span> Span Text </span>{${reactiveIdentifier} ? <span> hello </span> : <p> world </p>} Some Text 1 {${defaultIdentifier}} Some Text 2 <Counter /></>`,
			) as JSXParent,

			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],

						[reactiveIdentifier, ScopeIdType.Signal],
					]),
				],

				fnScopeCount: 1,
				componentFnScope: 1,
			}),

			mockCompileContext(),

			mockPreprocessResult(),
		);

		let infoIndex = 0;

		// span
		expect(jsxInfos[infoIndex]).toBe(JSXInfoType.StaticParent);
		expect(jsxInfos[++infoIndex]).toBeArray();

		// Span Text
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Text);

		// {reactiveIdentifier}
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.ReactiveExpression);

		// Some Text 1
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Text);

		// {defaultIdenitifer}
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.StaticExpression);

		// Some Text 2
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Text);

		// <Counter />
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Component);
		expect(jsxInfos[++infoIndex]).toBeArray();
	});

	it('should add analyzed attributes after `StaticParent` and `DynamicParent`', () => {
		{
			// `StaticParent`

			const jsxInfos = analyzeJsx(
				mockParse(
					'<div className={"dv"} role={"button"} aria-label={"Click"}/>',
				) as JSXElement,

				mockTransformContext(),

				mockCompileContext(),

				mockPreprocessResult(),
			);

			expect(jsxInfos[0]).toBe(JSXInfoType.StaticParent);

			expect(jsxInfos[1]).toMatchInlineSnapshot(`
			  [
			    1,
			    "className",
			    {
			      "end": 20,
			      "raw": ""dv"",
			      "start": 16,
			      "type": "Literal",
			      "value": "dv",
			    },
			    1,
			    "role",
			    {
			      "end": 36,
			      "raw": ""button"",
			      "start": 28,
			      "type": "Literal",
			      "value": "button",
			    },
			    1,
			    "aria-label",
			    {
			      "end": 57,
			      "raw": ""Click"",
			      "start": 50,
			      "type": "Literal",
			      "value": "Click",
			    },
			  ]
			`);
		}

		{
			// `DynamicParent`

			const defaultIdentifier = 'buttonAriaLabels';

			const jsxInfos = analyzeJsx(
				mockParse(
					`<button className={"btn"} aria-label={${defaultIdentifier}[0]} onClick={() => {}} />`,
				) as JSXElement,

				mockTransformContext({
					scopeStack: [
						new Map([[defaultIdentifier, ScopeIdType.Default]]),
					],
					fnScopeCount: 1,
					componentFnScope: 1,
				}),

				mockCompileContext(),

				mockPreprocessResult(),
			);

			expect(jsxInfos[0]).toBe(JSXInfoType.DynamicParent);

			expect(jsxInfos[1]).toMatchInlineSnapshot(`
			  [
			    1,
			    "className",
			    {
			      "end": 24,
			      "raw": ""btn"",
			      "start": 19,
			      "type": "Literal",
			      "value": "btn",
			    },
			    2,
			    "aria-label",
			    {
			      "computed": true,
			      "end": 57,
			      "object": {
			        "decorators": [],
			        "end": 54,
			        "name": "buttonAriaLabels",
			        "optional": false,
			        "start": 38,
			        "type": "Identifier",
			        "typeAnnotation": null,
			      },
			      "optional": false,
			      "property": {
			        "end": 56,
			        "raw": "0",
			        "start": 55,
			        "type": "Literal",
			        "value": 0,
			      },
			      "start": 38,
			      "type": "MemberExpression",
			    },
			    2,
			    "onClick",
			    {
			      "async": false,
			      "body": {
			        "body": [],
			        "end": 76,
			        "start": 74,
			        "type": "BlockStatement",
			      },
			      "end": 76,
			      "expression": false,
			      "generator": false,
			      "id": null,
			      "params": [],
			      "returnType": null,
			      "start": 68,
			      "type": "ArrowFunctionExpression",
			      "typeParameters": null,
			    },
			  ]
			`);
		}
	});
	it("should add IIFE body of transformed JSX of component's children after `Component` and add tempalte of component to `transformContext.programBody`", () => {
		const signalIdentifier = 'name';

		const programBody: TransformContext['programBody'] = [];

		const jsxInfos = analyzeJsx(
			mockParse(
				`<Wrapper> <div className={"dv"}> Hello, {${signalIdentifier}} <input onInput={(event) => { ${signalIdentifier} = event.value; }}/> </div> </Wrapper>`,
			) as JSXElement,
			mockTransformContext({
				scopeStack: [new Map([[signalIdentifier, ScopeIdType.Signal]])],
				fnScopeCount: 1,
				componentFnScope: 1,
				programBody,
			}),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		expect(jsxInfos[0]).toBe(JSXInfoType.Component);

		expect(mockGen(nodes.blockStatement(programBody))).toMatchInlineSnapshot(`
		  "{
		  const _$t = document.createElement('template'),
		  _$tc = _$t.content;
		  _$t.innerHTML = ' <div class="dv"> Hello, <!----> <input /> </div> ';document.addEventListener('input', _$InputHandler);}"
		`);

		expect(mockGen(nodes.blockStatement(jsxInfos[1] as IIFEBody)))
			.toMatchInlineSnapshot(`
		  "{
		  const _$el = _$tc.cloneNode(true),
		  _$el0 = _$el.firstChild.nextSibling,
		  _$el1 = _$el0.firstChild.nextSibling,
		  _$el2 = _$el1.nextSibling.nextSibling;
		  let _$p = null;
		  _$createEffect(() => _$p = _$insert(_$getValue(name), _$el1, _$p));
		  _$el2.$Input = (event) => {_$setValue(name, event.value);};
		  return _$el;}"
		`);
	});

	it("should add empty array for component's children if it is Self Closing and not transform them at all", () => {
		const signalIdentifier = 'name';

		const programBody: TransformContext['programBody'] = [];

		const jsxInfos = analyzeJsx(
			mockParse(`<SomeComp a={'b'}/>`) as JSXElement,
			mockTransformContext({
				scopeStack: [new Map([[signalIdentifier, ScopeIdType.Signal]])],
				fnScopeCount: 1,
				componentFnScope: 1,
			}),

			mockCompileContext(),
			mockPreprocessResult(),
		);

		expect(jsxInfos[0]).toBe(JSXInfoType.Component);

		expect((jsxInfos[1] as IIFEBody).length).toBe(0);

		expect(programBody.length).toBe(0);
	});
});

describe('markParentsDynamic', () => {
	it('should turn every parent of the last element to `DynamicParent`', () => {
		const nodeStack: Parameters<typeof markParentsDynamic>[0] = [];
		const jsxInfos: JSXInfos = [];
		const jsxNodes = (
			mockParse(
				'<><div></div><button></button>{DYNAMIC_EXPRESSION()}</>',
			) as JSXFragment
		).children as (JSXElement | JSXExpressionContainer)[];

		const divInfoIndex = jsxInfos.length;
		nodeStack.push(jsxNodes[0], 0, divInfoIndex);
		jsxInfos.push(JSXInfoType.StaticParent, []);

		const buttonInfoIndex = jsxInfos.length;

		nodeStack.push(jsxNodes[1], 0, buttonInfoIndex);
		jsxInfos.push(JSXInfoType.StaticParent, []);

		// {DYNAMIC_EXPRESSION()}
		nodeStack.push(jsxNodes[2], -1, jsxInfos.length);
		jsxInfos.push(JSXInfoType.ReactiveExpression);

		markParentsDynamic(nodeStack, jsxInfos, true);

		expect(jsxInfos[divInfoIndex]).toBe(JSXInfoType.DynamicParent);

		expect(jsxInfos[buttonInfoIndex]).toBe(JSXInfoType.DynamicParent);
	});

	it('should not affect other infos except parents of last node', () => {
		const nodeStack: Parameters<typeof markParentsDynamic>[0] = [];

		const jsxInfos: JSXInfos = [];

		const jsxNodes = (
			mockParse(
				'<><div></div> TEXT  {"literal"}<button></button>{DYNAMIC_EXPRESSION()}</>',
			) as JSXFragment
		).children as (JSXElement | JSXExpressionContainer)[];

		// div
		const divInfoIndex = jsxInfos.length;
		nodeStack.push(jsxNodes[0], 0, divInfoIndex);
		jsxInfos.push(JSXInfoType.StaticParent, []);

		// another infos except parents of last ndoe
		const textInfoIndex = jsxInfos.length;
		jsxInfos.push(JSXInfoType.Text);

		const literalExprInfoIndex = jsxInfos.length;
		jsxInfos.push(JSXInfoType.LiteralExpression);

		// button
		const buttonInfoIndex = jsxInfos.length;
		nodeStack.push(jsxNodes[3], 0, buttonInfoIndex);
		jsxInfos.push(JSXInfoType.StaticParent);

		// {DYNAMIC_EXPRESSION()}
		const reactiveExprInfoIndex = jsxInfos.length;
		nodeStack.push(jsxNodes[4], -1, reactiveExprInfoIndex);
		jsxInfos.push(JSXInfoType.ReactiveExpression);

		markParentsDynamic(nodeStack, jsxInfos, true);

		expect(jsxInfos[textInfoIndex]).toBe(JSXInfoType.Text);
		expect(jsxInfos[literalExprInfoIndex]).toBe(JSXInfoType.LiteralExpression);
		expect(jsxInfos[reactiveExprInfoIndex]).toBe(JSXInfoType.ReactiveExpression);

		expect(jsxInfos[divInfoIndex]).toBe(JSXInfoType.DynamicParent);
		expect(jsxInfos[buttonInfoIndex]).toBe(JSXInfoType.DynamicParent);
	});

	it('should update the root info when `isRootJSXElement` is `true`', () => {
		const nodeStack: Parameters<typeof markParentsDynamic>[0] = [];

		const jsxInfos: JSXInfos = [];

		const jsxNodes = (
			mockParse(
				'<><div></div><span></span>{DYNAMIC_EXPRESSION()}</>',
			) as JSXFragment
		).children as (JSXElement | JSXExpressionContainer)[];

		const rootInfoIndex = jsxInfos.length;
		nodeStack.push(jsxNodes[0], 0, rootInfoIndex);
		jsxInfos.push(JSXInfoType.StaticParent, []);

		nodeStack.push(jsxNodes[1], 0, jsxInfos.length);
		jsxInfos.push(JSXInfoType.StaticParent, []);

		// {DYNAMIC_EXPRESSION()}
		nodeStack.push(jsxNodes[2], -1, jsxInfos.length);

		jsxInfos.push(JSXInfoType.ReactiveExpression);

		markParentsDynamic(nodeStack, jsxInfos, true);

		expect(jsxInfos[rootInfoIndex]).toBe(JSXInfoType.DynamicParent);
	});

	it('should not update the first info type in `jsxInfos` if `isRootJSXElement` is `false`', () => {
		const nodeStack: Parameters<typeof markParentsDynamic>[0] = [];

		const jsxInfos: JSXInfos = [];

		const jsxNodes = (
			mockParse(
				'<><></><div></div><span></span>{DYNAMIC_EXPRESSION()}</>',
			) as JSXFragment
		).children as (JSXElement | JSXExpressionContainer)[];

		// Imitate a case when an already handled `div` is the first element of `jsxInfos` and the first child of fragment
		// and other fragment's children must NOT cause update `div`'s info type

		const divInfoIndex = 0;

		// fragment
		nodeStack.push(jsxNodes[0], 0, divInfoIndex);

		const divInfoType = JSXInfoType.StaticParent;
		jsxInfos.push(divInfoType, []);

		// span
		nodeStack.push(jsxNodes[2], 0, jsxInfos.length);
		jsxInfos.push(JSXInfoType.StaticParent, []);

		// {DYNAMIC_EXPRESSION()}
		nodeStack.push(jsxNodes[3], -1, jsxInfos.length);
		jsxInfos.push(JSXInfoType.ReactiveExpression);

		markParentsDynamic(nodeStack, jsxInfos, false);

		expect(jsxInfos[divInfoIndex]).toBe(divInfoType);
		expect(jsxInfos[divInfoIndex]).not.toBe(JSXInfoType.DynamicParent);
	});
});

describe('analyzeExpr', () => {
	it('should handle `JSXExpressionContainer` identically to `JSXSpreadAttribute`', () => {
		const signalIdentifier = 'obj';

		const transformContextMock = mockTransformContext({
			scopeStack: [new Map([[signalIdentifier, ScopeIdType.Signal]])],
			fnScopeCount: 1,
			componentFnScope: 1,
		});

		const compileContextMock = mockCompileContext();
		const preprocessResultMock = mockPreprocessResult();

		expect(
			analyzeExpr(
				(
					mockParse(
						`<>{${signalIdentifier} ? 'hello' : 'bye'}</>`,
					) as JSXFragment
				).children[0] as JSXExpressionContainer,

				transformContextMock,
				compileContextMock,
				preprocessResultMock,
			),
		).toBe(
			analyzeExpr(
				(mockParse(`<div {...(${signalIdentifier})}/>`) as JSXElement)
					.openingElement.attributes[0] as JSXSpreadAttribute,

				transformContextMock,
				compileContextMock,
				preprocessResultMock,
			),
		);
	});
	it('should return correct type for every kind of expressions', () => {
		for (const { type, expr, transformContext } of [
			{
				type: JSXExprType.Empty,
				expr: (mockParse('<>{}</>') as JSXFragment)
					.children[0] as JSXExpressionContainer,
				transformContext: mockTransformContext(),
			},
			{
				type: JSXExprType.Literal,

				expr: (mockParse('<>{"hello"}</>') as JSXFragment)
					.children[0] as JSXExpressionContainer,
				transformContext: mockTransformContext(),
			},
			{
				type: JSXExprType.Static,
				expr: (
					mockParse(
						'<>{STATIC_COND ? () => {} : ""}</>',
					) as JSXFragment
				).children[0] as JSXExpressionContainer,
				transformContext: mockTransformContext({
					scopeStack: [
						new Map([['STATIC_COND', ScopeIdType.Default]]),
					],

					fnScopeCount: 1,

					componentFnScope: 1,
				}),
			},
			{
				type: JSXExprType.Reactive,
				expr: (
					mockParse(
						"<>{SIGNAL_COND ? 'hello' : 'bye'}</>",
					) as JSXFragment
				).children[0] as JSXExpressionContainer,
				transformContext: mockTransformContext({
					scopeStack: [
						new Map([['SIGNAL_COND', ScopeIdType.Signal]]),
					],
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
			{
				type: JSXExprType.Reactive,
				expr: (
					mockParse(
						"<>{MEMO_COND ? 'hello' : 'bye'}</>",
					) as JSXFragment
				).children[0] as JSXExpressionContainer,
				transformContext: mockTransformContext({
					scopeStack: [new Map([['MEMO_COND', ScopeIdType.Memo]])],
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
		] satisfies {
			type: JSXExprType;
			expr: JSXExpressionContainer;
			transformContext: TransformContext;
		}[]) {
			expect(
				analyzeExpr(
					expr,
					transformContext,

					mockCompileContext(),

					mockPreprocessResult(),
				),

				`JSXExprType "${type}" has failed `,
			).toBe(type);
		}
	});

	it('should not mark expression as reactive if reactives are in functions or JSX elements', () => {
		const signalIdentifier = 'sig';

		const transformContextMock = mockTransformContext({
			scopeStack: [new Map([[signalIdentifier, ScopeIdType.Signal]])],
			fnScopeCount: 1,
			componentFnScope: 1,
		});

		const compileContextMock = mockCompileContext();

		const preprocessResultMock = mockPreprocessResult();

		expect(
			analyzeExpr(
				(mockParse(`<>{${signalIdentifier} && 'helloo'}</>`) as JSXFragment)
					.children[0] as JSXExpressionContainer,

				transformContextMock,

				compileContextMock,

				preprocessResultMock,
			),
		).toBe(JSXExprType.Reactive);

		expect(
			analyzeExpr(
				(mockParse(`<>{() => ${signalIdentifier}}</>`) as JSXFragment)
					.children[0] as JSXExpressionContainer,

				transformContextMock,

				compileContextMock,

				preprocessResultMock,
			),
		).toBe(JSXExprType.Static);

		expect(
			analyzeExpr(
				(
					mockParse(
						`<>{function () { ${signalIdentifier}; }}</>`,
					) as JSXFragment
				).children[0] as JSXExpressionContainer,

				transformContextMock,
				compileContextMock,
				preprocessResultMock,
			),
		).toBe(JSXExprType.Static);

		expect(
			analyzeExpr(
				(
					mockParse(
						`<>{true ? <span>{${signalIdentifier}}</span> : <div> fallback </div>}</>`,
					) as JSXFragment
				).children[0] as JSXExpressionContainer,

				transformContextMock,
				compileContextMock,
				preprocessResultMock,
			),
		).toBe(JSXExprType.Static);
	});

	it('should transform other nodes as well as main `transform` does', () => {
		const signalIdentifier = 'name';

		const memoIdentifier = 'cached';

		const signalLabel = '_$sgn';
		const memoLabel = '_$m';
		const effectLabel = '_$ef';

		const jsxFragment = mockParse(`<>{() => {

					${signalLabel};  
  let count = 16;
  ${memoLabel};

  let doubled = () => count * 2;
  
  count++;
  ++count;
  count = 16;
  	count += 159;

  ${effectLabel};
  () => {
    console.log(count + doubled);
  };

  		console.log(${signalIdentifier} + ${memoIdentifier});
}}</>`) as JSXFragment;

		analyzeExpr(
			jsxFragment.children[0] as JSXExpressionContainer,
			mockTransformContext({
				scopeStack: [
					new Map([
						[signalIdentifier, ScopeIdType.Signal],

						[memoIdentifier, ScopeIdType.Memo],
					]),
				],

				fnScopeCount: 1,

				componentFnScope: 1,
			}),

			mockCompileContext(),

			mockPreprocessResult({
				labels: {
					[signalLabel]: 'signal',

					[effectLabel]: 'effect',

					[memoLabel]: 'memo',
				},
			}),
		);

		expect(mockGen(jsxFragment)).toMatchInlineSnapshot(`
		  "<>{() => {
		  ;;

		  const count = { subscribers: new Set(), value: 16 };

		  ;;

		  const doubled = _$createMemo(() => _$getValue(count) * 2);

		  _$postSetValue(count, count + 1);
		  _$setValue(count, count + 1);
		  _$setValue(count, 16);
		  _$setValue(count, _$getValue(count) + 159);
		  ;;

		  _$createEffect(() => {
		  console.log(_$getValue(count) + _$computeMemo(doubled));})
		  console.log(_$getValue(name) + _$computeMemo(cached));}}</>"
		`);
	});

	it('should transform JSX to IIFE', () => {
		const defaultIdentifier = 'cond';
		const signalIdentifier = 'name';

		const jsxFragment = mockParse(
			`<>{${defaultIdentifier}
					? <div>\n\t<span>Hello</span>\n\t</div> 
		: <> Hello, <em className={"emphasis"}> {${signalIdentifier}} </em></>}</>`,
		) as JSXFragment;

		analyzeExpr(
			jsxFragment.children[0] as JSXExpressionContainer,
			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],
						[signalIdentifier, ScopeIdType.Signal],
					]),
				],
			}),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		expect(mockGen(jsxFragment)).toMatchInlineSnapshot(`"<>{cond ? ; : ;}</>"`);
	});
});

describe('analyzeAttrs', () => {
	const mockParseAttrs = (attrs: string) =>
		(mockParse('<div ' + attrs + '/>') as JSXElement).openingElement.attributes;

	it('should mutate `jsxInfos` with `JSXInfoType.StaticParent` and return it if there are only literal attributes or there is not any attribute', () => {
		{
			const jsxInfos: JSXInfos = [];

			// Empty
			analyzeAttrs(
				mockParseAttrs(''),
				jsxInfos,
				mockTransformContext({}),
				mockCompileContext(),
				mockPreprocessResult(),
			);
			expect(jsxInfos.length).toBe(2);
			expect(jsxInfos[0]).toBe(JSXInfoType.StaticParent);
			expect(jsxInfos[1]).toBeArray();
		}

		{
			const jsxInfos: JSXInfos = [];

			analyzeAttrs(
				mockParseAttrs('className={"dv"} aria-label={"hello"}'),
				jsxInfos,
				mockTransformContext({}),
				mockCompileContext(),
				mockPreprocessResult(),
			);
			expect(jsxInfos.length).toBe(2);
			expect(jsxInfos[0]).toBe(JSXInfoType.StaticParent);
			expect(jsxInfos[1]).toBeArray();
		}
	});

	it('should mutate `jsxInfos` with `JSXInfoType.DynamicParent` and return it if there is a `ref`, spread or expression attribute', () => {
		{
			const jsxInfos: JSXInfos = [];

			analyzeAttrs(
				mockParseAttrs('{...OBJ}'),
				jsxInfos,
				mockTransformContext({
					scopeStack: [new Map([['OBJ', ScopeIdType.Default]])],
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
				mockCompileContext(),
				mockPreprocessResult(),
			);
			expect(jsxInfos.length).toBe(2);
			expect(jsxInfos[0]).toBe(JSXInfoType.DynamicParent);
			expect(jsxInfos[1]).toBeArray();
		}

		{
			const jsxInfos: JSXInfos = [];

			analyzeAttrs(
				mockParseAttrs('ref={() => {}}'),
				jsxInfos,
				mockTransformContext({}),
				mockCompileContext(),

				mockPreprocessResult(),
			);

			expect(jsxInfos.length).toBe(2);
			expect(jsxInfos[0]).toBe(JSXInfoType.DynamicParent);
			expect(jsxInfos[1]).toBeArray();
		}

		{
			const jsxInfos: JSXInfos = [];

			analyzeAttrs(
				mockParseAttrs('className={GET_CLASS()}'),
				jsxInfos,
				mockTransformContext({
					scopeStack: [new Map([['GET_CLASS', ScopeIdType.Default]])],
				}),
				mockCompileContext(),
				mockPreprocessResult(),
			);
			expect(jsxInfos.length).toBe(2);
			expect(jsxInfos[0]).toBe(JSXInfoType.DynamicParent);
			expect(jsxInfos[1]).toBeArray();
		}
		{
			const signalIdentifier = 'sig';

			const jsxInfos: JSXInfos = [];
			analyzeAttrs(
				mockParseAttrs(`aria-label={${signalIdentifier}}`),
				jsxInfos,
				mockTransformContext({
					scopeStack: [
						new Map([[signalIdentifier, ScopeIdType.Signal]]),
					],
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
				mockCompileContext(),
				mockPreprocessResult(),
			);
			expect(jsxInfos.length).toBe(2);
			expect(jsxInfos[0]).toBe(JSXInfoType.DynamicParent);
			expect(jsxInfos[1]).toBeArray();
		}
	});

	it('should add AttrInfoType, name and value of every attribute type to the result', () => {
		const defaultIdentifier = 'def';
		const reactiveIdentifier = 'count';

		const jsxInfos: JSXInfos = [];

		analyzeAttrs(
			mockParseAttrs(
				`ref={el} 
					contentEditable={${defaultIdentifier}} 
					aria-label={'Literal'} 
					aria-hidden={${reactiveIdentifier}} 
					onClick={() => {}}`,
			),
			jsxInfos,
			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],
						[reactiveIdentifier, ScopeIdType.Signal],
					]),
				],
				fnScopeCount: 1,

				componentFnScope: 1,
			}),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		const attrInfos = jsxInfos[jsxInfos.length - 1] as AttrInfos;

		expect(attrInfos.length).toBe(5 * AttrInfoOffset.Size);

		let attrIndex = 0;

		expect(attrInfos[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Ref);
		expect(attrInfos[attrIndex + AttrInfoOffset.Name]).toBe('ref');

		attrIndex += AttrInfoOffset.Size;
		expect(attrInfos[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Static);
		expect(attrInfos[attrIndex + AttrInfoOffset.Name]).toBe('contentEditable');

		attrIndex += AttrInfoOffset.Size;
		expect(attrInfos[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Literal);
		expect(attrInfos[attrIndex + AttrInfoOffset.Name]).toBe('aria-label');

		attrIndex += AttrInfoOffset.Size;
		expect(attrInfos[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Reactive);
		expect(attrInfos[attrIndex + AttrInfoOffset.Name]).toBe('aria-hidden');

		attrIndex += AttrInfoOffset.Size;
		expect(attrInfos[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Static);
		expect(attrInfos[attrIndex + AttrInfoOffset.Name]).toBe('onClick');
	});
});
