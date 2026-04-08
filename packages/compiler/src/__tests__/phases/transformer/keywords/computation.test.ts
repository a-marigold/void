import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';

import { generate, mockPreprocessResult } from '../__testingUtils__';

describe('computation', () => {
    it('should handle defined type of computation identifier correctly', () => {
        const computationLabel = '_$$compution';
        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: `let ${computationLabel};
${computationLabel};
const multiplied: number = () => 16;`,
                        // TODO: add new tests computation label
                        unassignableLabels: {
                            [computationLabel]: 'computation',
                        },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(
            `
              ";;

              const multiplied = L_$createComputation<number>(() => 16);"
            `,
        );
    });
    it('should have an error if there is not an initial value of computation', () => {
        const computationLabel = '_$$compution';

        const errors = transform(
            mockPreprocessResult({
                code: `let ${computationLabel};

                        ${computationLabel};
const compiutaaa0;`,

                unassignableLabels: {
                    [computationLabel]: 'computation',
                },
            }),
        ).errors;

        expect(errors.length).toBe(1);

        expect(errors[0].message).toMatchInlineSnapshot(
            `"'computation' identifier must have an initial value."`,
        );
    });

    it('should have an error if there is a computation destructuring', () => {
        const computationLabel = '_$$compution';

        const errors = transform(
            mockPreprocessResult({
                code: `let ${computationLabel};
                        ${computationLabel};
const { call, apply, bind } = () => 16;`,

                unassignableLabels: {
                    [computationLabel]: 'computation',
                },
            }),
        ).errors;

        expect(errors.length).toBe(1);

        expect(errors[0]).toMatchInlineSnapshot(
            `[CompileError: Cannot use 'computation' with destructuring.]`,
        );
    });

    it('should replace readings of computation identifier with runtime API function calls', () => {
        const computationLabel = '_$$$$$$$$$$$$$$$$$$$$computation';

        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: `let ${computationLabel};
${computationLabel};
let multiplied: number = () => 16;

console.log(multiplied);`,

                        unassignableLabels: {
                            [computationLabel]: 'computation',
                        },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const multiplied = L_$createComputation<number>(() => 16);

              console.log(L_$compute(multiplied));"
            `);
    });

    it('should work with scopes correctly', () => {
        const computationLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$computation';

        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: `let ${computationLabel};
${computationLabel};
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
                        unassignableLabels: {
                            [computationLabel]: 'computation',
                        },
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
              ";;

              const multiplied = L_$createComputation(() => {});

              console.log(L_$compute(multiplied));

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
