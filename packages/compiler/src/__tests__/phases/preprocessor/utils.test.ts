import { describe, it, expect } from 'bun:test';

import { RUNTIME_TYPE_NAMES } from '../../../constants';
import type { PreprocessResult } from '../../../phases/preprocessor';
import { generateUniqueId, getProps, generateImports } from '../../../phases/preprocessor/utils';

import { mockPreprocessContext } from './__testingUtils__';
describe('generateKeywordLabel', () => {
	it('should not have a collision if there is an identifier with the same name in `identifiers` argument', () => {
		expect(
			generateUniqueId(
				'a',

				new Set(['a', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6']),
			),
		).toBe('a7');
	});

	it('should return the same `labelPrefix` if there is not any collision in `identifiers` argument', () => {
		const prefix = 'b';

		expect(
			generateUniqueId(
				prefix,

				new Set(['a' satisfies 'a' extends typeof prefix ? never : string]),
			),
		).toBe(prefix);
	});

	it('should return mutate provided `identifiers` unique identifiers if called with the same prefix multiple times ', () => {
		const iterations = 16;

		let lastId = 'a';

		const identifiers = new Set<string>([lastId]);

		for (let i = 0; i <= iterations; i++) {
			const unique = generateUniqueId(lastId, identifiers);

			expect(unique).not.toBe(lastId);

			lastId = unique;
		}

		expect(identifiers.size).toBe(iterations + 2);
	});
});

describe('getProps', () => {
	it('should return not a full props if brackets in source are interrupted or not valid', () => {
		const unclosedSource = '( ( ( ( ( (';

		expect(getProps(mockPreprocessContext({ source: unclosedSource, pos: 1 }), 0)).toBe(
			unclosedSource,
		);

		const oneMissingSource = '( ( ( ( ( ( ) ) ) ) )';

		expect(
			getProps(mockPreprocessContext({ source: oneMissingSource, pos: 1 }), 0),
		).toBe(oneMissingSource);
	});
});

describe('generateImports', () => {
	it('should include aliases from `runtimeApiNames` argument and import source', () => {
		const runtimeApiNames = {
			getValue: 'gv',
			createEffect: 'crefec',
			Signal: 'typesignal',
		} satisfies Partial<PreprocessResult['runtimeApiNames']>;

		const source = '__________SOURCEE___________';

		const imports = generateImports(runtimeApiNames, { Signal: true }, source);

		expect(imports).toMatchInlineSnapshot(
			`"import{getValue as gv,createEffect as crefec,type Signal as typesignal,}from"__________SOURCEE___________";"`,
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
