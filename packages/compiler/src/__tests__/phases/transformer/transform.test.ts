import { describe, it, expect } from 'bun:test';

import { transform } from '../../../phases/transformer';

import {
    generate,
    mockRuntimeApiNames,
    mockPreprocessResult,
} from './__testingUtils__';

describe('transform', () => {
    it('should delete only the first variable declaration with keyword labels in preprocessed.code', () => {
        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: 'let _$a, _$b, _$c; var a = 27; let b = 16; const c = 16;',
                        assignableLabels: { _$c: 'effect' },

                        unassignableLabels: {
                            _$a: 'signal',

                            _$b: 'computation',
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

    it('should delete all the keyword labels provided in `preprocessed` argument', () => {
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
};
`;

        const generated = generate(
            transform(
                mockPreprocessResult({
                    code,
                    assignableLabels: { [effectLabel]: 'effect' },
                    unassignableLabels: {
                        [signalLabel]: 'signal',
                        [computationLabel]: 'computation',
                        [componentLab]: 'component',
                    },
                }),
            ).result.program,
        );

        // TODO: components computationlabel

        expect(generated).not.toInclude(signalLabel);
        expect(generated).not.toInclude(effectLabel);
        expect(generated).not.toInclude(computationLabel);
        expect(generated).not.toInclude(componentLab);
        expect(generated).toMatchInlineSnapshot(`
          ";;

          const count: L_$Signal = { subscribers: new Set(), value: 16 };

          ;;

          const multiplied = L_$createComputation(() => L_$getValue(count) * 16);

          L_$createEffect(() => {
          console.log(L_$compute(multiplied));});
          ;;
          export const App = () => {return <div> </div>;};"
        `);
    });
});
