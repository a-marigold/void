import { describe, it, expect } from 'bun:test';

import { errorMessages } from '../../../../errors';
import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockGen, mockPreprocessResult } from '../__testingUtils__';

describe('effect', () => {
	it('should wrap arrow function to `createEffect` runtime call`', () => {
		const effectLabel = '_$0';

		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${effectLabel};
${effectLabel}; () => undefined;
${effectLabel}; (() => { console.log(); })`,
						labels: { [effectLabel]: 'effect' },
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
		  ";;
		  _$createEffect(() => undefined);
		  ;;

		  _$createEffect(() => {
		  console.log();});"
		`);
	});

	it('should have an error if there is something instead of arrow function', () => {
		const effectLabel = '_$0';

		for (const source of [
			`const identifier = () => {};
${effectLabel}; identifier;`,
			`${effectLabel}; ('hello', () => undefined);`,
			`${effectLabel}; function () {}`,
			`${effectLabel}; function a () {}`,
		]) {
			const errors = transform(
				mockPreprocessResult({
					code: `let ${effectLabel};
${source}`,

					labels: {
						[effectLabel]: 'effect',
					},
				}),

				mockCompileContext(),
			).errors;

			expect(errors.length).toBe(1);

			expect(errors[0].message).toBe(errorMessages.NON_ARROW_EFFECT);
		}
	});
});
