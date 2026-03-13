import { describe, it, expect } from 'bun:test';

import generate from '@babel/generator';

import { transform } from '../../transformer';

import { createPreprocessResult } from './__testingUtils__';

describe('effects', () => {
    it('should wrap named, anonymous, arrow functions and identifiers to `createEffect` function from runtime API', () => {
        const effectLabel = '_$$$$$$$$$$$$$$$$$effect';

        expect(
            generate(
                transform(
                    createPreprocessResult({
                        code: `let ${effectLabel};

const doNothing = () => undefined;

${effectLabel} = doNothing;
${effectLabel} = () => undefined;
${effectLabel} = function () {};
${effectLabel} = function namedNothingFunciton () {};
`,
                        keywordLabels: new Map([[effectLabel, 'effect']]),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const doNothing = () => undefined;
              _$1610$_createEffect(doNothing);
              _$1610$_createEffect(() => undefined);
              _$1610$_createEffect(function () {});
              _$1610$_createEffect(function namedNothingFunciton() {});"
            `);
    });
});
