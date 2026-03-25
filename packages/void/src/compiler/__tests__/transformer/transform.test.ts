import { describe, it, expect } from 'bun:test';

import { generate } from '@babel/generator';

import { transform } from '../../transformer';

import {
    generateRuntimeApiNames,
    createPreprocessResult,
} from './__testingUtils__';

describe('transform', () => {
    it('should delete the first variable declaration with keyword labels in preprocessed.code', () => {
        expect(
            generate(
                transform(
                    createPreprocessResult({
                        code: 'let _$a, _$b, _$c;',
                        assignableLabels: new Map([['_$c', 'effect']]),

                        unassignableLabels: new Map([
                            ['_$a', 'signal'],

                            ['_$b', 'computation'],
                        ]),
                        runtimeApiNames: generateRuntimeApiNames(),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(`""`);
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
                    assignableLabels: new Map([[effectLabel, 'effect']]),
                    unassignableLabels: new Map([
                        [signalLabel, 'signal'],
                        [computationLabel, 'computation'],
                    ]),
                }),
            ).ast,
        ).code;

        expect(generated).not.toInclude(signalLabel);
        expect(generated).not.toInclude(effectLabel);
        expect(generated).not.toInclude(computationLabel);

        expect(generated).toMatchInlineSnapshot(`
          "const count: _$1610$_Signal = {
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
