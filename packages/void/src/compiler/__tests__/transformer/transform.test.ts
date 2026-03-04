import { describe, it, expect } from 'bun:test';

import { generate } from '@babel/generator';

import { transform } from '../../transformer';

import { generateRuntimeApiNames } from './__testingUtils__';
import { CompileError } from '../../errors';

describe('transform', () => {
    it('should add imports with aliases from `preprocessed.runtimeApiNames` argument and correct import kinds on the first line', () => {
        const runtimeApiNames = generateRuntimeApiNames();

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
            `"import { type Signal as _$1610$_Signal, getValue as _$1610$_getValue, setValue as _$1610$_setValue, postSetValue as _$1610$_postSetValue, createEffect as _$1610$_createEffect, compute as _$1610$_compute, createComputation as _$1610$_createComputation } from "";"`,
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
                    runtimeApiNames: generateRuntimeApiNames(),
                }),
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
            transform({
                code,

                keywordLabels: new Map([
                    [signalLabel, 'signal'],
                    [effectLabel, 'effect'],
                    [computationLabel, 'computation'],
                ]),
                runtimeApiNames: generateRuntimeApiNames(),
            }),
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
    describe('effects', () => {
        it('should wrap named, anonymous, arrow functions and identifiers to `createEffect` function from runtime API', () => {
            const effectLabel = '_$$$$$$$$$$$$$$$$$effect';

            expect(
                generate(
                    transform({
                        code: `let ${effectLabel};

const doNothing = () => undefined;

${effectLabel} = doNothing;
${effectLabel} = () => undefined;
${effectLabel} = function () {};
${effectLabel} = function namedNothingFunciton () {};
`,

                        keywordLabels: new Map([[effectLabel, 'effect']]),
                        runtimeApiNames: generateRuntimeApiNames(),
                    }),
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

    describe('signals', () => {
        it('should handle defined type of signal correctly', () => {
            const signalLabel = '_$$$$$$$$$$$$$$$$$$$$$$signal';

            expect(
                generate(
                    transform({
                        code: `let ${signalLabel};

${signalLabel};
let count: number = 16;`,

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
                        keywordLabels: new Map([[signalLabel, 'signal']]),
                        runtimeApiNames: generateRuntimeApiNames(),
                    });
                } catch (error) {
                    expect(error).toBeInstanceOf(CompileError);

                    expect(
                        (error as CompileError).message,
                    ).toMatchInlineSnapshot(
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

                        keywordLabels: new Map([[signalLabel, 'signal']]),
                        runtimeApiNames: generateRuntimeApiNames(),
                    });
                } catch (error) {
                    expect(error).toBeInstanceOf(CompileError);
                    expect(
                        (error as CompileError).message,
                    ).toMatchInlineSnapshot(
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

    describe('computations', () => {
        it('should handle defined type of computation identifier correctly', () => {
            const computationLabel = '_$$$$$$$$$$$$$$$$$$$$computation';

            expect(
                generate(
                    transform({
                        code: `let ${computationLabel};
${computationLabel};
const multiplied: number = () => 16;`,

                        keywordLabels: new Map([
                            [computationLabel, 'computation'],
                        ]),

                        runtimeApiNames: generateRuntimeApiNames(),
                    }),
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
                    transform({
                        code: `let ${computationLabel};
${computationLabel};
const multiplied: number = () => 16;


console.log(multiplied);


`,

                        keywordLabels: new Map([
                            [computationLabel, 'computation'],
                        ]),

                        runtimeApiNames: generateRuntimeApiNames(),
                    }),
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
                    transform({
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
                        keywordLabels: new Map([
                            [computationLabel, 'computation'],
                        ]),
                        runtimeApiNames: generateRuntimeApiNames(),
                    }),
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
});
