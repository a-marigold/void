import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockGen, mockPreprocessResult } from '../__testingUtils__';

describe('memo', () => {
	it('should have an error if there is not initial value of memo', () => {
		const memoLabel = '_$0';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${memoLabel};


${memoLabel};
let compiutaaans;`,

				labels: {
					[memoLabel]: 'memo',
				},
			}),

			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(1);

		expect(errors[0].message).toMatchInlineSnapshot(
			`"'memo' must have an initial value."`,
		);
	});

	it('should have an error if there is a memo destructuring', () => {
		const memoLabel = '_$0';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${memoLabel};

${memoLabel};
let { call, apply, bind } = () => 16;`,

				labels: {
					[memoLabel]: 'memo',
				},
			}),

			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(1);

		expect(errors[0]).toMatchInlineSnapshot(
			`[CompileError: Cannot use 'memo' with destructuring.]`,
		);
	});

	it('should have an error if there are multiple declarators of memo', () => {
		const memoLabel = '_$memo';
		const errors = transform(
			mockPreprocessResult({
				code: `let ${memoLabel}; 
${memoLabel};
let doubled = 16, tripled = 24, quadrupled = 32;`,
				labels: { [memoLabel]: 'memo' },
			}),
			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(1);
		expect(errors[0].message).toMatchInlineSnapshot(`"'memo' cannot have more than 1 declarator."`);
	});

	it('should replace reading of memo identifier with runtime API function calls', () => {
		const memoLabel = '_$0';

		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${memoLabel};

${memoLabel};
let multiplied: number = () => 16;

console.log(multiplied);`,

						labels: {
							[memoLabel]: 'memo',
						},
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const multiplied = _$createMemo(() => 16);

              console.log(_$computeMemo(multiplied));"
            `);
	});

	it('should work with scopes correctly', () => {
		const memoLabel = '_$0';

		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${memoLabel};
${memoLabel};
let multiplied = () => {};
console.log(multiplied);


{



const multiplied = 16;
  
		multiplied;
}

() => {
const multiplied = 166;

  multiplied;
};

(function() {
const mulitplied = 10;

      mutliplied;
});`,
						labels: {
							[memoLabel]: 'memo',
						},
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const multiplied = _$createMemo(() => {});

              console.log(_$computeMemo(multiplied));

              {
              const multiplied = 16;

              multiplied;}
              () => {const multiplied = 166;
              multiplied;};
              (function () {const mulitplied = 10;
              mutliplied;});"
            `);
	});
});
