import { describe, it, expect } from 'bun:test';

import type { JSXElement } from 'oxc-parser';

import { CompileError, compileErrors } from '../../../../errors';
import { ScopeIdType } from '../../../../phases/transformer/constants';
import { analyzeAttributes, analyzeJsx } from '../../../../phases/transformer/jsx/analyze';
import {
	JSXInfoType,
	AttrInfoType,
	AttrInfoOffset,
} from '../../../../phases/transformer/jsx/constants';
import type { JSXParent } from '../../../../phases/transformer/jsx/types';
import type { TransformContext } from '../../../../phases/transformer/types';
import {
	mockCompileContext,
	mockErrorContext,
	mockGen,
	mockParse,
	mockPreprocessResult,
	mockTransformContext,
} from '../__testingUtils__';

describe('analyzeJsx', () => {
	describe('error handling', () => {
		// Default mocks for tests performance
		const compileContextMock = mockCompileContext();
		const preprocessResultMock = mockPreprocessResult();

		// Only a few errors need their own `TransformContext`

		const transformContextMock = mockTransformContext();

		// Errors can appear twice in the array because some errors have several cases
		for (const { name, jsxCode, transformContext } of [
			{
				name: 'JSX_INVALID_EL_NAME',
				jsxCode: '<obj.div></obj.div>',
				transformContext: transformContextMock,
			},
			{
				name: 'JSX_INVALID_EL_NAME',
				jsxCode: '<obj:div></obj:div>',
				transformContext: transformContextMock,
			},

			{
				name: 'JSX_SPREAD_CHILDREN',

				jsxCode: '<div> {...obj} </div>',
				transformContext: transformContextMock,
			},

			{
				name: 'JSX_NESTED_FRAGMENT',
				jsxCode: '<><></></>',
				transformContext: transformContextMock,
			},

			{
				name: 'JSX_NESTED_FRAGMENT',
				jsxCode: '<div><span><></></span></div>',
				transformContext: transformContextMock,
			},

			{
				name: 'JSX_OUTSIDE_COMPONENT_RETURN',
				jsxCode: '<button onClick={() => { return <div> </div>; }}></button> ',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},
			{
				name: 'JSX_OUTSIDE_COMPONENT_RETURN',
				jsxCode: '<div>{() => { <div> </div> }}</div>',
				transformContext: mockTransformContext({
					fnScopeCount: 1,
					componentFnScope: 1,
				}),
			},

			{
				name: 'JSX_EMPTY_EXPRESSION',
				jsxCode: '<div>{}</div>',
				transformContext: transformContextMock,
			},
			{
				name: 'JSX_EMPTY_EXPRESSION',
				jsxCode: '<input value={} />',
				transformContext: transformContextMock,
			},

			{
				name: 'JSX_WRAPPED_ATTR',
				jsxCode: '<button aria-label="hello"></button>',
				transformContext: transformContextMock,
			},

			{
				name: 'JSX_ATTR_WITHOUT_VALUE',
				jsxCode: '<button disabled></button>',

				transformContext: transformContextMock,
			},
			{
				name: 'JSX_REF_INVALID_VALUE',
				jsxCode: '<input ref={(a, b, fn())} />',

				transformContext: transformContextMock,
			},

			{
				name: 'JSX_NEED_SELF_CLOSING_EL',

				jsxCode: '<div></div>',
				transformContext: transformContextMock,
			},
			{
				name: 'JSX_NEED_SELF_CLOSING_EL',
				jsxCode: '<div>\t    \n\n\r\n    \t</div>',
				transformContext: transformContextMock,
			},
		] satisfies {
			name: keyof typeof compileErrors;
			jsxCode: string;
			transformContext: TransformContext;
		}[]) {
			it(`should handle ${name}`, () => {
				const errors: CompileError[] = [];

				analyzeJsx(
					mockParse(jsxCode) as JSXParent,
					transformContext,
					mockErrorContext({ errors }),
					compileContextMock,

					preprocessResultMock,
				);

				expect(errors.length).toBe(1);
				expect(errors[0].message).toBe(compileErrors[name]);
			});
		}
	});

	it('should add JSXInfoType to the result for every kind of JSX node', () => {
		const defaultIdentifier = 'translation';

		const reactiveIdentifier = 'cond';

		const jsxInfos = analyzeJsx(
			mockParse(
				`<div>{${reactiveIdentifier} ? <span> hello </span> : <p> world </p>} Some Text 1 {${defaultIdentifier}} Some Text 2 <Counter /></div>`,
			) as JSXParent,
			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],
						[reactiveIdentifier, ScopeIdType.Signal],
					]),
				],
			}),
			mockErrorContext(),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		let infoIndex = 0;

		// div
		expect(jsxInfos[++infoIndex]).toBe(JSXInfoType.Attrs);
		expect(jsxInfos[++infoIndex]).toBeArray();

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

	it('should transform JSX in expressions as well as main `transform` does', () => {
		const signalIdentifier = 'name';
		const memoIdentifier = 'cached';

		const jsxRoot =
			mockParse(`<div ariaLabel={${signalIdentifier} + ${memoIdentifier}} onClick={() => {
  signal count = 16;
  memo doubled = () => count * 2;

  count++;
  ++count;
  count = 16;
  count += 159;

  effect () => {
    console.log(count + doubled);
  };
}}> {${signalIdentifier} + ${memoIdentifier}} </div>`) as JSXParent;

		analyzeJsx(
			jsxRoot,
			mockTransformContext({
				scopeStack: [
					new Map([
						[signalIdentifier, ScopeIdType.Signal],

						[memoIdentifier, ScopeIdType.Memo],
					]),
				],
			}),
			mockErrorContext(),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		expect(mockGen(jsxRoot)).toMatchInlineSnapshot();
	});
});

describe('analyzeAttributes', () => {
	it('should add AttrInfoType, name and value of every attribute to the result', () => {
		const defaultIdentifier = 'def';

		const reactiveIdentifier = 'count';

		const attrsInfo = analyzeAttributes(
			(
				mockParse(
					`<div ref={el} contentEditable={${defaultIdentifier}} aria-label={'Literal'} aria-hidden={${reactiveIdentifier}} onClick={() => {}} />`,
				) as JSXElement
			).openingElement.attributes,

			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],

						[reactiveIdentifier, ScopeIdType.Signal],
					]),
				],
			}),
			mockErrorContext(),
			mockCompileContext(),
			mockPreprocessResult(),
		);

		expect(attrsInfo.length).toBe(5);

		let attrIndex = 0;
		expect(attrsInfo[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.StaticRef);
		expect(attrsInfo[attrIndex + AttrInfoOffset.Name]).toBe('ref');

		attrIndex += AttrInfoOffset.Size;
		expect(attrsInfo[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Static);
		expect(attrsInfo[attrIndex + AttrInfoOffset.Name]).toBe('contentEditable');

		attrIndex += AttrInfoOffset.Size;
		expect(attrsInfo[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Literal);
		expect(attrsInfo[attrIndex + AttrInfoOffset.Name]).toBe('aria-label');

		attrIndex += AttrInfoOffset.Size;
		expect(attrsInfo[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Reactive);
		expect(attrsInfo[attrIndex + AttrInfoOffset.Name]).toBe('aria-hidden');

		attrIndex += AttrInfoOffset.Size;
		expect(attrsInfo[attrIndex + AttrInfoOffset.InfoType]).toBe(AttrInfoType.Static);
		expect(attrsInfo[attrIndex + AttrInfoOffset.Name]).toBe('onClick');
	});

	it('should distinguish `StaticRef` and `SignalRef`', () => {
		const defaultIdentifier = 'el';
		expect(
			analyzeAttributes(
				(mockParse(`<div ref={${defaultIdentifier}} />`) as JSXElement)
					.openingElement.attributes,

				mockTransformContext({
					scopeStack: [
						new Map([[defaultIdentifier, ScopeIdType.Default]]),
					],
				}),

				mockErrorContext(),
				mockCompileContext(),
				mockPreprocessResult(),
			)[AttrInfoOffset.InfoType],
		).toBe(AttrInfoType.StaticRef);

		const signalIdentifier = 'sid';
		expect(
			analyzeAttributes(
				(mockParse(`<div ref={${signalIdentifier}} />`) as JSXElement)
					.openingElement.attributes,

				mockTransformContext({
					scopeStack: [
						new Map([[signalIdentifier, ScopeIdType.Default]]),
					],
				}),

				mockErrorContext(),
				mockCompileContext(),
				mockPreprocessResult(),
			)[AttrInfoOffset.InfoType],
		).toBe(AttrInfoType.StaticRef);

		const memoIdentifier = 'mid';
		expect(
			analyzeAttributes(
				(mockParse(`<div ref={${memoIdentifier}} />`) as JSXElement)
					.openingElement.attributes,
				mockTransformContext({
					scopeStack: [
						new Map([[memoIdentifier, ScopeIdType.Default]]),
					],
				}),

				mockErrorContext(),
				mockCompileContext(),
				mockPreprocessResult(),
			)[AttrInfoOffset.InfoType],
		).toBe(AttrInfoType.StaticRef);
	});
});
