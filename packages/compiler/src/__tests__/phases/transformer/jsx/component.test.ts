import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';

import type { PreprocessResult } from '../../../../phases/preprocessor';

import { createPreprocessResult } from '../__testingUtils__';

describe('component', () => {
    it('should have errors for every JSX element that is outside a component', () => {
        expect(
            transform(
                createPreprocessResult({
                    code: `
                    
                    let _$signal, _$effect, _$cmp, _$cmpn;
                    
                    
                    
const a = <> </>;

function foo () {
    return <form> </form>;
}
() => <p> </p>;

() => {
  return <br> </br>;

};
`,
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`
          [
            "JSX elements are not allowed outside a component return statement.",
            "JSX elements are not allowed outside a component return statement.",
            "JSX elements are not allowed outside a component return statement.",
            "JSX elements are not allowed outside a component return statement.",
          ]
        `);
    });

    it('should not have errors if JSX is only in component return', () => {
        const compLabel = `_$$$$$$$$$$$$$$$$$$$$$$$$$cmpnnt`;

        expect(
            transform(
                createPreprocessResult({
                    code: `let ${compLabel};

   ;${compLabel};

export const App = () => {
  return <div> </div>;

};`,
                    unassignableLabels: new Map([[compLabel, 'component']]),
                }),
            ).errors.length,
        ).toBe(0);
    });

    it('should have errors if JSX is in a function that is in component return', () => {
        const compLabel = '_$$$$$$$$$$$$$$$$$$$$$$$$$$cmpntt';
        const unassignableLabels: PreprocessResult['unassignableLabels'] =
            new Map([[compLabel, 'component']]);

        expect(
            transform(
                createPreprocessResult({
                    code: `let ${compLabel};
${compLabel};


export const App = () => {
  return (() => <div> </div>)();
}
`,

                    unassignableLabels,
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`
          [
            "JSX elements are not allowed outside a component return statement.",
          ]
        `);

        expect(
            transform(
                createPreprocessResult({
                    code: `let ${compLabel};
                    

;${compLabel};
export const Button = () => {
  return;
}
`,
                    unassignableLabels,
                }),
            ),
        );
    });

    it('should have errors if there is no block statm in the body of component', () => {
        const compLabel = '_$$$$$$$$$$$$$$$$$$$$$c';

        expect(
            transform(
                createPreprocessResult({
                    code: `let ${compLabel};


;${compLabel};
export const App = () => <div> </div>;`,

                    unassignableLabels: new Map([[compLabel, 'component']]),
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`
          [
            "Block statement expected.",
          ]
        `);
    });

    it('should not have errors if there is block statm in the body of component', () => {
        const compLabel = '_$$$$$$$$$$$$$$$$$$$$$c';

        expect(
            transform(
                createPreprocessResult({
                    code: `let ${compLabel};


;${compLabel};
export const App = () => { return <div> </div>; };`,

                    unassignableLabels: new Map([[compLabel, 'component']]),
                }),
            ).errors.length,
        ).toBe(0);
    });
});
