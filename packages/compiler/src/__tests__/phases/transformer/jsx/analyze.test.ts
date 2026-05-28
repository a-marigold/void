import { describe, it, expect } from 'bun:test';

import type {
	JSXElement,
	JSXFragment,
	JSXExpressionContainer,
	JSXSpreadAttribute,
} from 'oxc-parser';

import { compileErrors } from '../../../../errors';
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
import type { JSXParent, JSXInfos, AttrInfos } from '../../../../phases/transformer/jsx/types';
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
				message: compileErrors.JSX_INVALID_EL_NAME,
				jsxCode: '<obj.div>hello</obj.div>',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_INVALID_EL_NAME,
				jsxCode: '<obj:div/>',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_SPREAD_CHILDREN,

				jsxCode: '<>{...obj}</>',

				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_NESTED_FRAGMENT,
				jsxCode: '<><></></>',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_NESTED_FRAGMENT,
				jsxCode: '<div><span><></></span></div>',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_OUTSIDE_COMPONENT_RETURN,
				jsxCode: '<button onClick={() => { return <div> </div>; }} />',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
			{
				message: compileErrors.JSX_OUTSIDE_COMPONENT_RETURN,
				jsxCode: '<div>{() => { <div> </div> }}</div>',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
			{
				message: compileErrors.JSX_OUTSIDE_COMPONENT_RETURN,
				jsxCode: '<div>{() => <div />}</div>',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},

			{
				message: compileErrors.JSX_EMPTY_EXPRESSION,
				jsxCode: '<div>{}</div>',
				transformContext: mockTransformContext(),
			},
			{
				message: compileErrors.JSX_EMPTY_EXPRESSION,
				jsxCode: '<input value={} />',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_WRAPPED_ATTR,
				jsxCode: '<button aria-label="hello"/>',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_ATTR_WITHOUT_VALUE,
				jsxCode: '<button disabled />',
				transformContext: mockTransformContext(),
			},

			{
				message: compileErrors.JSX_NEED_SELF_CLOSING_EL,

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

	it('should add JSXInfoType to the result for every kind of JSX node', () => {
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

		markParentsDynamic(nodeStack, jsxInfos);

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

		markParentsDynamic(nodeStack, jsxInfos);

		expect(jsxInfos[textInfoIndex]).toBe(JSXInfoType.Text);
		expect(jsxInfos[literalExprInfoIndex]).toBe(JSXInfoType.LiteralExpression);
		expect(jsxInfos[reactiveExprInfoIndex]).toBe(JSXInfoType.ReactiveExpression);

		expect(jsxInfos[divInfoIndex]).toBe(JSXInfoType.DynamicParent);
		expect(jsxInfos[buttonInfoIndex]).toBe(JSXInfoType.DynamicParent);
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
			).toBe(type);
		}
	});

	it('should handle cases when reactives are in functions and in component fn scope', () => {
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
	});

	it('should transform JSX in expressions as well as main `transform` does', () => {
		const signalIdentifier = 'name';
		const memoIdentifier = 'cached';

		const signalLabel = '_$sgn';
		const memoLabel = '_$m';
		const effectLabel = '_$ef';

		/**
		 * `JSXFragment` and not a direct `JSXExpressionContainer` for deterministic codegen.
		 */
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

		// TODO: update refs approach
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
