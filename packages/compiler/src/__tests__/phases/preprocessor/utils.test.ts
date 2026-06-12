import { describe, it, expect } from 'bun:test';

import { RUNTIME_TYPE_NAMES } from '../../../constants';
import type { PreprocessResult } from '../../../phases/preprocessor';
import { generateUniqueId, parseProps, generateImports } from '../../../phases/preprocessor/utils';
import { mockIdContext } from '../transformer/__testingUtils__';

import { mockPreprocessContext } from './__testingUtils__';
describe('generateUniqueId', () => {
	it('should return identifier with `VoidIdPrefix` and current value of `uniqueIdCount`', () => {
		expect(generateUniqueId(mockIdContext()));
	});

	it('should mutate `idContext` and increment its `uniqueIdCount`', () => {
		const idContext = mockIdContext();
		const startUniqueIdCount = idContext.uniqueIdCount;

		generateUniqueId(idContext);

		expect(idContext.uniqueIdCount - startUniqueIdCount).toBe(1);
	});
});

describe('getProps', () => {
	it('should return not a full props if brackets in source are interrupted or not valid', () => {
		const unclosedSource = '( ( ( ( ( (';

		expect(
			parseProps(mockPreprocessContext({ source: unclosedSource, pos: 1 }), 0),
		).toBe(unclosedSource);

		const oneMissingSource = '( ( ( ( ( ( ) ) ) ) )';

		expect(
			parseProps(mockPreprocessContext({ source: oneMissingSource, pos: 1 }), 0),
		).toBe(oneMissingSource);
	});
});

describe('generateImports', () => {
	it('should include aliases from `runtimeApiNames` argument and import source', () => {
		const runtimeApiNames = {
			getValue: '_$0',
			createEffect: '_$1',
			Signal: '_$2',
		} satisfies Partial<PreprocessResult['runtimeApiNames']>;

		const source = '__________SOURCEE___________';

		const imports = generateImports(runtimeApiNames, { Signal: true }, source);

		expect(imports).toMatchInlineSnapshot(
			`"import{getValue as _$0,createEffect as _$1,type Signal as _$2,}from"__________SOURCEE___________";"`,
		);

		expect(imports).toInclude(source);
	});

	it('should distinguish standard and type imports', () => {
		const imports = generateImports(
			{
				getValue: 'gvl',

				Signal: 'sgt',
			},
			{ Signal: true },

			'SOURCE',
		);

		for (const typeName in RUNTIME_TYPE_NAMES) {
			expect(imports).toInclude('type ' + typeName);
		}
	});
});
