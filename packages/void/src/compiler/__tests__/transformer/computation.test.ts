import { describe, it, expect } from 'bun:test';

import generate from '@babel/generator';

import { transform } from '../../transformer';

import { createPreprocessResult } from './__testingUtils__';

describe('computations', () => {
    it('should handle defined type of computation identifier correctly', () => {
        const computationLabel = '_$$$$$$$$$$$$$$$$$$$$computation';
        expect(
            generate(
                transform(
                    createPreprocessResult({
                        code: `let ${computationLabel};
${computationLabel};
const multiplied: number = () => 16;`,

                        unassignableLabels: new Map([
                            [computationLabel, 'computation'],
                        ]),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const multiplied = _$1610$_createComputation<number>(() => 16);"
            `);
    });

    it('should replace readings of computation identifier with runtime API function calls', () => {
        const computationLabel = '_$$$$$$$$$$$$$$$$$$$$computation';

        expect(
            generate(
                transform(
                    createPreprocessResult({
                        code: `let ${computationLabel};
${computationLabel};
let multiplied: number = () => 16;




console.log(multiplied);












`,

                        unassignableLabels: new Map([
                            [computationLabel, 'computation'],
                        ]),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const multiplied = _$1610$_createComputation<number>(() => 16);
              console.log(_$1610$_compute(multiplied));"
            `);
    });

    it('should work with scopes correctly', () => {
        const computationLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$computation';

        expect(
            generate(
                transform(
                    createPreprocessResult({
                        code: `let ${computationLabel};
${computationLabel};
const multiplied = () => {};

multiplied;

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
                        unassignableLabels: new Map([
                            [computationLabel, 'computation'],
                        ]),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const multiplied = _$1610$_createComputation(() => {});
              _$1610$_compute(multiplied);
              {
                const multiplied = 16;
                multiplied;
              }
              () => {
                const multiplied = 166;
                multiplied;
              };
              (function () {
                const mulitplied = 10;
                mutliplied;
              });"
            `);
    });
});
