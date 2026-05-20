import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';
import { mockGen, mockPreprocessResult } from '../__testingUtils__';

describe('memo', () => {
	it('should handle defined type of memo identifier correctly', () => {
		const memoLabel = '_$0';
		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${memoLabel};
${memoLabel};
const multiplied: number = () => 16;`,
						labels: {
							[memoLabel]: 'memo',
						},
					}),
				).result.program,
			),
		).toMatchInlineSnapshot(
			`
              ";;

              const multiplied = _$createMemo<number>(() => 16);"
            `,
		);
	});
	it('should have an error if there is not an initial value of memo', () => {
		const memoLabel = '_$0';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${memoLabel};

${memoLabel};

const compiutaaa0;`,

				labels: {
					[memoLabel]: 'memo',
				},
			}),
		).errors;

		expect(errors.length).toBe(1);

		expect(errors[0].message).toMatchInlineSnapshot(
			`"'memo' identifier must have an initial value."`,
		);
	});

	it('should have an error if there is a memo destructuring', () => {
		const memoLabel = '_$0';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${memoLabel};

${memoLabel};
const { call, apply, bind } = () => 16;`,

				labels: {
					[memoLabel]: 'memo',
				},
			}),
		).errors;

		expect(errors.length).toBe(1);

		expect(errors[0]).toMatchInlineSnapshot(
			`[CompileError: Cannot use 'memo' with destructuring.]`,
		);
	});

	it('should replace readings of memo identifier with runtime API function calls', () => {
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
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const multiplied = _$createMemo<number>(() => 16);

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
const multiplied = () => {};
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
