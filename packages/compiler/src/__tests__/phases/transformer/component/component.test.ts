import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';

import type { PreprocessResult } from '../../../../phases/preprocessor';

import { mockPreprocessResult } from '../__testingUtils__';

describe('component', () => {
    it('should have errors for every JSX element that is outside a component', () => {
        expect(
            transform(
                mockPreprocessResult({
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
        ).toMatchInlineSnapshot(`[]`);
    });

    it('should not have errors for JSX in component return', () => {
        const compLabel = `_$$$$$$$$$$$$$$$$$$$$$$$$$cmpnnt`;

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};

   ;${compLabel};


export const App = () => {
  return <div> </div>;
};`,
                    labels: { [compLabel]: 'component' },
                }),
            ).errors.length,
        ).toBe(0);
    });

    it('should have errors if JSX is in a function that is in component return', () => {
        const compLabel = '_$$cmpntt';
        const labels: PreprocessResult['labels'] = {
            [compLabel]: 'component',
        };

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};
${compLabel};

export const App = () => {
  return (() => <div> </div>)();
};`,

                    labels,
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`[]`);

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};
                
${compLabel};
export const Button = () => {

  return;
};`,
                    labels,
                }),
            ),
        );
    });

    it('should have errors if there are multiple components, but no error for the first component', () => {
        const compLabel = '_$cmp';

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};

                    ${compLabel};
export const First = () => { return <div> </div>; };


${compLabel};
export const Button = () => { return <button> </button>; };


${compLabel};
export const Input = () => { return <input />; };`,
                    labels: { [compLabel]: 'component' },
                }),
            ).errors.map((error) => `${error.line}:${error.start} - ${error.message}`),
        ).toMatchInlineSnapshot(`
          [
            "1:0 - Multiple components are not allowed.",
            "1:0 - Multiple components are not allowed.",
          ]
        `);
    });

    it('should have errors if there is no block statm in the body of component', () => {
        const compLabel = '_$cmp';

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};


;${compLabel};
export const App = () => <div> </div>;`,

                    labels: { [compLabel]: 'component' },
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`
          [
            "Block statement expected.",
          ]
        `);
    });
});
