import { describe, it, expect } from 'bun:test';

import { CompileError, compileErrors } from '../../../../errors';
import { analyzeJsx } from '../../../../phases/transformer/jsx/analyze';
import type { JSXParent } from '../../../../phases/transformer/jsx/types';
import type { TransformContext } from '../../../../phases/transformer/types';
import {
	mockCompileContext,
	mockErrorContext,
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
		] satisfies {
			name: keyof typeof compileErrors;
			jsxCode: string;
			transformContext: TransformContext;
		}[]) {
			it(`should handle ${name}`, () => {
				const errors: CompileError[] = [];

				analyzeJsx(
					mockParse(jsxCode) as JSXParent,
					mockTransformContext(),
					mockErrorContext({ errors }),
					compileContextMock,
					preprocessResultMock,
				);

				expect(errors.length).toBe(1);
				expect(errors[0].message).toBe(compileErrors.JSX_INVALID_EL_NAME);
			});
		}
	});
});
