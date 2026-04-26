import { describe, it, expect } from 'bun:test';

import { transform } from '../../../phases/transformer';

import { generate, mockRuntimeApiNames, mockPreprocessResult } from './__testingUtils__';

describe('transform', () => {
    it('should delete only the first variable declaration with keyword labels in preprocessed.code', () => {
        expect(
            generate(
                transform(
                    mockPreprocessResult({
                        code: 'let _$a, _$m, _$c; var a = 27; let b = 16; const c = 16;',

                        labels: {
                            _$a: 'signal',
                            _$e: 'effect',
                            _$m: 'memo',
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
        const signalLabel = '_$0';
        const effectLabel = '_$1';
        const memoLabel = '_$2';
        const componentLab = '_$3';

        const code = `let ${signalLabel}, ${effectLabel}, ${memoLabel}, ${componentLab};
${signalLabel};
let count = 16;
${memoLabel};
const multiplied = () => count * 16;
${effectLabel};
() => {
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

                        [memoLabel]: 'memo',
                        [componentLab]: 'component',
                    },
                }),
            ).result.program,
        );

        expect(generated).not.toInclude(signalLabel);
        expect(generated).not.toInclude(effectLabel);
        expect(generated).not.toInclude(memoLabel);
        expect(generated).not.toInclude(componentLab);
        expect(generated).toMatchInlineSnapshot(`
          ";;

          const count: _$Signal = { subscribers: new Set(), value: 16 };

          ;;

          const multiplied = _$createMemo(() => _$getValue(count) * 16);

          ;;

          _$createEffect(() => {
          console.log(_$computeMemo(multiplied));};)
          ;;
          export const App = () => {return <div> </div>;};"
        `);
    });

    it('should have an error if reactive variable declaration is not in global or component scope', () => {
        const signalLabel = '_$0';
        const memoLabel = '_$1';
        const compLabel = '_$2';

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${signalLabel}, ${memoLabel}, ${compLabel};
{
    ${signalLabel};
    let count = 16;

    ${memoLabel};
    let comput = () => count * 2;
}
() => {
    ${signalLabel};
    let count = 16;

    ${memoLabel};
    let comput = () => count * 2;
}
function a () {
    ${signalLabel};
    let count = 16;

    ${memoLabel};
    let comput = () => count * 2;
}

${compLabel};
export cosnt App = () => {
    {
        ${signalLabel};
        let count = 16;

        ${memoLabel};
        let comput = () => count * 2;
    }
    () => {
        ${signalLabel};
        let count = 16;

        ${memoLabel};
        let comput = () => count * 2;
    }
    function a () {
        ${signalLabel};
        let count = 16;

        ${memoLabel};
        let comput = () => count * 2;
    }

    return <div> </div>;




    }`,

                    labels: {
                        [signalLabel]: 'signal',
                        [memoLabel]: 'memo',
                        [compLabel]: 'component',
                    },
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`[]`);
    });
});
