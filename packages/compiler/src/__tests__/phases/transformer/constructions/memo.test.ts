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

		expect(errors[0].message).toMatchInlineSnapshot(
			`"Cannot declare 'memo' by using destructuring."`,
		);
	});

	it('should have an error if there are multiple declarators of memo', () => {
		const memoLabel = '_$0';
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
		expect(errors[0].message).toMatchInlineSnapshot(
			`"'memo' cannot have more than 1 declarator."`,
		);
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

	it.only('should take in account scopes and identifier shadowing', () => {
		const memoLabel = '_$1';
		const componentLabel = '_$0';

		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${memoLabel}, ${componentLabel};
${memoLabel};
let mult = () => {};
console.log(mult);

${memoLabel};
let doubled = () => {};

{
	const mult = 16;
	console.log(mult);
}
(doubled) => {
	const mult = 166;
	console.log(mult + doubled);
};
function abc (mult) {
	console.log(mult);
}
(function(doubled) {
	const mult = 16;

	mult + doubled;
});

${componentLabel};
export const App = (mult: number) => {
    mult + doubled;
};`,
						labels: {
							[memoLabel]: 'memo',

							[componentLabel]: 'component',
						},
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const mult = _$createMemo(() => {});

              console.log(_$computeMemo(mult));
              ;;

              const doubled = _$createMemo(() => {});

              {
              const mult = 16;

              console.log(mult);}
              (doubled) => {const mult = 166;
              console.log(mult + doubled);};
              function abc(mult) {console.log(mult);}
              (function (doubled) {const mult = 16;
              mult + doubled;});
              ;;
              export const App = (mult: number) => {mult + _$computeMemo(doubled);};"
            `);
	});
});
