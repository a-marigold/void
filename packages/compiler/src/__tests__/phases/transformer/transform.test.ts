import { describe, it, expect } from 'bun:test';

import { transform } from '../../../phases/transformer';

import { generate, mockRuntimeApiNames, mockPreprocessResult } from './__testingUtils__';

describe('transform', () => {
    it('should delete only the first variable declaration with keyword labels in preprocessed.code', () => {
        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: 'let _$a, _$b, _$c; var a = 27; let b = 16; const c = 16;',

                        labels: {
                            _$a: 'signal',
                            _$e: 'effect',
                            _$b: 'computation',
                            _$c: 'component',
                        },
                        runtimeApiNames: mockRuntimeApiNames({}),
                    }),
                ).result.program,
            ),
        ).toMatchInlineSnapshot(`
          "var a = 27;
          let b = 16;
          const c = 16;"
        `);
    });

    it('should delete all the keyword labels before contructions in `preprocesed.code`', () => {
        const signalLabel = '_$$signal';
        const effectLabel = '_$$Effect';
        const computationLabel = '_$$computation';
        const componentLab = '_$$component';

        const code = `let ${signalLabel}, ${effectLabel}, ${computationLabel}, ${componentLab};
${signalLabel};
let count = 16;
${computationLabel};
const multiplied = () => count * 16;
${effectLabel} = () => {
    console.log(multiplied);
};

${componentLab};


export const App = () => {
    return <div> </div>;
};`;

        const generated = generate(
            transform(
                mockPreprocessResult({
                    code,
                    labels: {
                        [signalLabel]: 'signal',
                        [effectLabel]: 'effect',
                        [computationLabel]: 'computation',
                        [componentLab]: 'component',
                    },
                }),
            ).result.program,
        );

        expect(generated).not.toInclude(signalLabel);
        expect(generated).not.toInclude(effectLabel);
        expect(generated).not.toInclude(computationLabel);
        expect(generated).not.toInclude(componentLab);
        expect(generated).toMatchInlineSnapshot(`
          ";;

          const count: L_$Signal = { subscribers: new Set(), value: 16 };

          ;;

          const multiplied = L_$createComputation(() => L_$getValue(count) * 16);

          ; = () => {
          console.log(L_$compute(multiplied));};
          L_$createEffect(;;)
          export const App = () => {return <div> </div>;};"
        `);
    });
});
