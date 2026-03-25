import { describe, it, expect } from 'bun:test';

import generate from '@babel/generator';

import { transform } from '../../../../phases/transformer';

import { createPreprocessResult } from '../__testingUtils__';

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
                        assignableLabels: new Map([[effectLabel, 'effect']]),
                    }),
                ).ast,
            ).code,
        ).toMatchInlineSnapshot(`
              "const doNothing = () => undefined;
              _$1610$_createEffect(doNothing);
              _$1610$_createEffect(() => undefined);
              _$1610$_createEffect(function () {});
              _$1610$_createEffect(function namedNothingFunciton() {});"
            `);
    });
});
