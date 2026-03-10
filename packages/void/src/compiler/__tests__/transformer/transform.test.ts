import { describe, it, expect } from 'bun:test';

import { generate } from '@babel/generator';

import { transform } from '../../transformer';

import {
    generateRuntimeApiNames,
    createPreprocessResult,
} from './__testingUtils__';

describe('transform', () => {
    it('should add imports with aliases from `preprocessed.runtimeApiNames` argument and correct import kinds on the first line', () => {
        const runtimeApiNames = generateRuntimeApiNames();

        const generated = generate(
            transform(createPreprocessResult({ code: '', runtimeApiNames }))
                .ast,
        ).code;

        for (const apiName of runtimeApiNames) {
            expect(generated).toInclude(apiName[1]);
        }
        expect(generated).toMatchInlineSnapshot(
            `"import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";"`,
        );
    });

    it('should delete the first variable declaration with keyword labels in preprocessed.code', () => {
        expect(
            generate(
                transform(
                    createPreprocessResult({
                        code: 'let _$a, _$b, _$c;',
                        keywordLabels: new Map([
                            ['_$a', 'signal'],

                            ['_$b', 'computation'],

                            ['_$c', 'effect'],
                        ]),
                        runtimeApiNames: generateRuntimeApiNames(),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(
            `"import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";"`,
        );
    });

    it('should delete all the keyword labels provided in `preprocessed` argument', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$signal';
        const effectLabel = '_$$$$$$$$$$$$$$$$$$$$$$$Effect';
        const computationLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$computation';

        const code = `let ${signalLabel}, ${effectLabel}, ${computationLabel};
${signalLabel};
let count = 16;
${computationLabel};
const multiplied = () => count * 16;
${effectLabel} = () => {
    console.log(multiplied);
};`;

        const generated = generate(
            transform(
                createPreprocessResult({
                    code,
                    keywordLabels: new Map([
                        [signalLabel, 'signal'],
                        [effectLabel, 'effect'],
                        [computationLabel, 'computation'],
                    ]),
                }),
            ).ast,
        ).code;

        expect(generated).not.toInclude(signalLabel);
        expect(generated).not.toInclude(effectLabel);
        expect(generated).not.toInclude(computationLabel);

        expect(generated).toMatchInlineSnapshot(`
          "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
          const count: _$1610$_Signal = {
            "subscribers": new Set(),
            "value": 16
          };
          const multiplied = _$1610$_createComputation(() => _$1610$_getValue(count) * 16);
          _$1610$_createEffect(() => {
            console.log(_$1610$_compute(multiplied));
          });"
        `);
    });
});
