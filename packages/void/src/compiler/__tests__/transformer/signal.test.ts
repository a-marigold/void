import { describe, it, expect } from 'bun:test';

import generate from '@babel/generator';
import type { SourceMap } from 'magic-string';

import { transform } from '../../transformer';

import { CompileError } from '../../errors';

import {
    generateRuntimeApiNames,
    createEmptySourceMap,
} from './__testingUtils__';

describe('signals', () => {
    it('should handle defined type of signal correctly', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
                transform({
                    code: `let ${signalLabel};

${signalLabel};

let count: number = 16;`,

                    sourceMap: createEmptySourceMap(),

                    keywordLabels: new Map([[signalLabel, 'signal']]),
                    runtimeApiNames: generateRuntimeApiNames(),
                }),
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const count: _$1610$_Signal<number> = {
                "subscribers": new Set(),
                "value": 16
              };"
            `);
    });

    it.serial(
        'should throw CompileError instance if there is not initial value of signal',
        () => {
            expect.assertions(2);

            try {
                const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

                transform({
                    code: `let ${signalLabel};

${signalLabel} ;
let count;`,
                    sourceMap: createEmptySourceMap(),
                    keywordLabels: new Map([[signalLabel, 'signal']]),
                    runtimeApiNames: generateRuntimeApiNames(),
                });
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);

                expect((error as CompileError).message).toMatchInlineSnapshot(
                    `"'signal' identifier must have an initial value."`,
                );
            }
        },
    );

    it.serial(
        'should throw CompileError instance if identifier of signal is destructured',
        () => {
            expect.assertions(2);

            try {
                const signalLabel = '_$$$$$$$$$$$$$$$$$$$signal';

                transform({
                    code: `let ${signalLabel};
${signalLabel};
let { value } = { value: 16 };`,

                    sourceMap: createEmptySourceMap(),
                    keywordLabels: new Map([[signalLabel, 'signal']]),
                    runtimeApiNames: generateRuntimeApiNames(),
                });
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);
                expect((error as CompileError).message).toMatchInlineSnapshot(
                    `"Cannot use 'signal' with destructuring."`,
                );
            }
        },
    );

    it('should handle multiple declarators of one signal identifier declaration correctly', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
                transform({
                    code: `let ${signalLabel};
${signalLabel};
let name = 'signal', age = 16, preferredJavaScriptEngine = 'v8';`,

                    sourceMap: createEmptySourceMap(),
                    keywordLabels: new Map([[signalLabel, 'signal']]),
                    runtimeApiNames: generateRuntimeApiNames(),
                }),
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const name: _$1610$_Signal = {
                  "subscribers": new Set(),
                  "value": 'signal'
                },
                age: _$1610$_Signal = {
                  "subscribers": new Set(),
                  "value": 16
                },
                preferredJavaScriptEngine: _$1610$_Signal = {
                  "subscribers": new Set(),
                  "value": 'v8'
                };"
            `);
    });
    it('should replace signal indetifier readings, updates and assignments with runtime API function calls', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
                transform({
                    code: `let ${signalLabel};
${signalLabel};
let count: number = 0;

console.log(count);

count++;

++count;

count = 16;

count += 16;`,

                    sourceMap: createEmptySourceMap(),
                    keywordLabels: new Map([[signalLabel, 'signal']]),

                    runtimeApiNames: generateRuntimeApiNames(),
                }),
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const count: _$1610$_Signal<number> = {
                "subscribers": new Set(),
                "value": 0
              };
              console.log(_$1610$_getValue(count));
              _$1610$_postSetValue(count, _$1610$_getValue(count) + 1);
              _$1610$_setValue(count, _$1610$_getValue(count) + 1);
              _$1610$_setValue(count, 16);
              _$1610$_setValue(count, _$1610$_getValue(count) + 16);"
            `);
    });

    it('should distingiush assignment operators', () => {
        const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';

        expect(
            generate(
                transform({
                    code: `let ${signalLabel};
${signalLabel};
let count: number = 0;
count += 16;
count -= 16;
count /= 16;
count &= 16;
count &&= 16;
count >>>= 16`,

                    sourceMap: createEmptySourceMap(),
                    keywordLabels: new Map([[signalLabel, 'signal']]),

                    runtimeApiNames: generateRuntimeApiNames(),
                }),
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const count: _$1610$_Signal<number> = {
                "subscribers": new Set(),
                "value": 0
              };
              _$1610$_setValue(count, _$1610$_getValue(count) + 16);
              _$1610$_setValue(count, _$1610$_getValue(count) - 16);
              _$1610$_setValue(count, _$1610$_getValue(count) / 16);
              _$1610$_setValue(count, _$1610$_getValue(count) & 16);
              _$1610$_setValue(count, _$1610$_getValue(count) && 16);
              _$1610$_setValue(count, _$1610$_getValue(count) >>> 16);"
            `);
    });

    it('should work with scope and identifier shadowing correctly', () => {
        const signalLabelSIgnal = '_$$$$$$$$$$$$$$$$$$$$$$$$$$$$$signal';
        expect(
            generate(
                transform({
                    code: `let ${signalLabelSIgnal};
${signalLabelSIgnal}; 
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

                    sourceMap: createEmptySourceMap(),
                    keywordLabels: new Map([[signalLabelSIgnal, 'signal']]),

                    runtimeApiNames: generateRuntimeApiNames(),
                }),
            ).code,
        ).toMatchInlineSnapshot(`
              "import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";
              const count: _$1610$_Signal<number> = {
                "subscribers": new Set(),
                "value": 0
              };
              console.log(_$1610$_getValue(count));
              _$1610$_setValue(count, 16);
              {
                let count = 16;
                count++;
                console.log(count);
              }
              () => {
                let count = 16;
                count++;
              };
              function abcabcabc() {
                const count = 170;
              }
              ;"
            `);
    });
});
