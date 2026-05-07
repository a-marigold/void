import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';
import { generate, mockPreprocessResult } from '../__testingUtils__';

describe('effect', () => {
	it('should wrap named, anonymous, arrow functions and identifiers to `createEffect` function from runtime API', () => {
		const effectLabel = '_$0';

		expect(
			generate(
				transform(
					mockPreprocessResult({
						code: `let ${effectLabel};
const doNothing = () => undefined;

${effectLabel}; doNothing;
${effectLabel}; () => undefined;
${effectLabel}; function () {};
${effectLabel}; function namedNothingFunciton () {};`,
						labels: { [effectLabel]: 'effect' },
					}),
				).result.program,
			),
		).toMatchInlineSnapshot(`
          "const doNothing = () => undefined;

          ;;

          _$createEffect(doNothing)

          ;;

          _$createEffect(() => undefined)

          ;;

          _$createEffect(function () {})

          ;;

          _$createEffect(function namedNothingFunciton() {})"
        `);
	});
});
