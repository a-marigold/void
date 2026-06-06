import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockGen, mockPreprocessResult } from '../__testingUtils__';

describe('signal', () => {
	it('should have an error if there is not initial value of signal', () => {
		const signalLabel = '_$signal';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${signalLabel};

                ${signalLabel};
let count;`,
				labels: { [signalLabel]: 'signal' },
			}),
			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(1);

		expect(errors[0].message).toMatchInlineSnapshot(
			`"'signal' must have an initial value."`,
		);
	});

	it('should have an error if signal is destructured', () => {
		const signalLabel = '_$signal';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${signalLabel};
${signalLabel};
let { value } = { value: 16 };`,

				labels: { [signalLabel]: 'signal' },
			}),
			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(1);

		expect(errors[0].message).toMatchInlineSnapshot(
			`"Cannot declare 'signal' by using destructuring."`,
		);
	});

	it('should have an error when there are multiple declarators of signal', () => {
		const signalLabel = '_$signal';

		const errors = transform(
			mockPreprocessResult({
				code: `let ${signalLabel};
${signalLabel};


let name = 'signal', age = 16, preferredJavaScriptEngine = 'v8';`,

				labels: { [signalLabel]: 'signal' },
			}),

			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(1);
		expect(errors[0].message).toMatchInlineSnapshot(
			`"'signal' cannot have more than 1 declarator."`,
		);
	});

	it('should replace signal indetifier readings, updates and assignments with runtime API function calls', () => {
		const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';
		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${signalLabel};
${signalLabel};
let count: number = 0;

console.log(count);

count++;
++count;


count = 16;
count += 16;`,

						labels: { [signalLabel]: 'signal' },
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const count = { subscribers: new Set(), value: 0 };

              console.log(_$getValue(count));
              _$postSetValue(count, count + 1);
              _$setValue(count, count + 1);
              _$setValue(count, 16);
              _$setValue(count, _$getValue(count) + 16);"
            `);
	});

	it('should distinguish assignment operators', () => {
		const signalLabel = '_$signal';

		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${signalLabel};

                 ${signalLabel};
let count: number = 0;

count += 16;
count -= 16;
count /= 16;
count &= 16;
count &&= 16;
count >>>= 16`,

						labels: { [signalLabel]: 'signal' },
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const count = { subscribers: new Set(), value: 0 };

              _$setValue(count, _$getValue(count) + 16);
              _$setValue(count, _$getValue(count) - 16);
              _$setValue(count, _$getValue(count) / 16);
              _$setValue(count, _$getValue(count) & 16);
              count && _$setValue(_$getValue(count), 16);
              _$setValue(count, _$getValue(count) >>> 16);"
            `);
	});

	it('should work with scope and identifier shadowing correctly', () => {
		const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${signalLabel};
${signalLabel}; 
let count: number = 0;

console.log(count);

count = 16;

{
  let count = 16;

  count++;

  console.log(count);
}

() => {
  let count = 16;
  count++;
};

function abcabcabc () {
  const count =170;
};`,

						labels: { [signalLabel]: 'signal' },
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
              ";;

              const count = { subscribers: new Set(), value: 0 };

              console.log(_$getValue(count));
              _$setValue(count, 16);

              {
              let count = 16;

              count++;
              console.log(count);}
              () => {let count = 16;
              count++;};
              function abcabcabc() {const count = 170;}"
            `);
	});
});
