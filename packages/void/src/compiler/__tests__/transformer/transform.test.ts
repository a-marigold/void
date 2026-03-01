import { describe, it, expect } from 'bun:test';

import { generate } from '@babel/generator';

import { transform } from '../../transformer';
import type { PreprocessResult } from '../../preprocessor';
import type { RuntimeApiName } from '../../types';

describe('transform', () => {
    it('should add imports with aliases from `preprocessed.runtimeApiNames` argument and correct import kinds on the first line', () => {
        const runtimeApiNames: PreprocessResult['runtimeApiNames'] = new Map();
        for (const apiName of [
            'Signal',
            'getValue',
            'setValue',
            'postSetValue',
            'createEffect',
            'createComputation',
            'compute',
        ] satisfies RuntimeApiName[]) {
            runtimeApiNames.set(apiName, '_$' + apiName);
        }

        const generated = generate(
            transform({
                code: '',
                keywordLabels: new Map(),
                runtimeApiNames,
            }),
        ).code;

        for (const apiName of runtimeApiNames) {
            expect(generated).toInclude(apiName[1]);
        }
        expect(generated).toMatchInlineSnapshot(
            `"import { type Signal as _$Signal, getValue as _$getValue, setValue as _$setValue, postSetValue as _$postSetValue, createEffect as _$createEffect, createComputation as _$createComputation, compute as _$compute } from "";"`,
        );
    });

    it('should delete the first variable declaration with keyword labels in preprocessed.code', () => {
        expect(
            generate(
                transform({
                    code: 'let _$a, _$b, _$c;',
                    keywordLabels: new Map([
                        ['_$a', 'signal'],

                        ['_$b', 'computation'],

                        ['_$c', 'effect'],
                    ]),

                    runtimeApiNames: new Map(),
                }),
            ).code,
        ).toMatchInlineSnapshot(`"import "";"`);
    });
});
