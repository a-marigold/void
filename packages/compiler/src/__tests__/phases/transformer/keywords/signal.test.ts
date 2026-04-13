import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';

import { generate, mockPreprocessResult } from '../__testingUtils__';

describe('signal', () => {
    it('should handle defined type of signal correctly', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: `let ${signalLabel};
${signalLabel};
let count: number = 16;`,

                        unassignableLabels: { [signalLabel]: 'signal' },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const count: L_$Signal<number> = { subscribers: new Set(), value: 16 };"
            `);
    });

    it('should have an error if there is not initial value of signal', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

        const errors = transform(
            mockPreprocessResult({
                code: `let ${signalLabel};

                ${signalLabel};
let count;`,

                unassignableLabels: { [signalLabel]: 'signal' },
            }),
        ).errors;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toMatchInlineSnapshot(
            `"'signal' identifier must have an initial value."`,
        );
    });

    it('should have an error if signal is destructured', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$signal';

        const errors = transform(
            mockPreprocessResult({
                code: `let ${signalLabel};
${signalLabel};
let { value } = { value: 16 };`,
                unassignableLabels: { [signalLabel]: 'signal' },
            }),
        ).errors;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toMatchInlineSnapshot(
            `"Cannot use 'signal' with destructuring."`,
        );
    });

    it('should handle multiple declarators of one signal identifier declaration correctly', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: `let ${signalLabel};
${signalLabel};
let name = 'signal', age = 16, preferredJavaScriptEngine = 'v8';`,

                        unassignableLabels: { [signalLabel]: 'signal' },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const name: L_$Signal = { subscribers: new Set(), value: 'signal' },
              age: L_$Signal = { subscribers: new Set(), value: 16 },
              preferredJavaScriptEngine: L_$Signal = { subscribers: new Set(), value: 'v8' };"
            `);
    });

    it('should replace signal indetifier readings, updates and assignments with runtime API function calls', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';
        expect(
            generate(
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

                        unassignableLabels: { [signalLabel]: 'signal' },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const count: L_$Signal<number> = { subscribers: new Set(), value: 0 };

              console.log(L_$getValue(count));
              L_$postSetValue(count, count + 1);
              L_$setValue(count, count + 1);
              L_$setValue(count, 16);
              L_$setValue(count, L_$getValue(count) + 16);"
            `);
    });

    it('should distinguish assignment operators', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
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

                        unassignableLabels: { [signalLabel]: 'signal' },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const count: L_$Signal<number> = { subscribers: new Set(), value: 0 };

              L_$setValue(count, L_$getValue(count) + 16);
              L_$setValue(count, L_$getValue(count) - 16);
              L_$setValue(count, L_$getValue(count) / 16);
              L_$setValue(count, L_$getValue(count) & 16);
              count && L_$setValue(L_$getValue(count), 16);
              L_$setValue(count, L_$getValue(count) >>> 16);"
            `);
    });

    it('should work with scope and identifier shadowing correctly', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';
        expect(
            generate(
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

                        unassignableLabels: { [signalLabel]: 'signal' },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const count: L_$Signal<number> = { subscribers: new Set(), value: 0 };

              console.log(L_$getValue(count));
              L_$setValue(count, 16);

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
