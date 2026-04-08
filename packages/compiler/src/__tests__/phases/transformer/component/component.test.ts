import { describe, it, expect } from 'bun:test';

import { transform } from '../../../../phases/transformer';

import type { PreprocessResult } from '../../../../phases/preprocessor';

import { mockPreprocessResult } from '../__testingUtils__';

describe.skip('component', () => {
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

    it('should not have errors if JSX is only in component return', () => {
        const compLabel = `_$$$$$$$$$$$$$$$$$$$$$$$$$cmpnnt`;

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};

   ;${compLabel};

export const App = () => {
  return <div> </div>;

};`,
                    unassignableLabels: { [compLabel]: 'component' },
                }),
            ).errors.length,
        ).toBe(0);
    });

    it('should have errors if JSX is in a function that is in component return', () => {
        const compLabel = '_$$cmpntt';
        const unassignableLabels: PreprocessResult['unassignableLabels'] = {
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

                    unassignableLabels,
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
                    unassignableLabels,
                }),
            ),
        );
    });

    it('should have errors if there is no block statm in the body of component', () => {
        const compLabel = '_$$$$$$$$$$$$$$$$$$$$$c';

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};


;${compLabel};
export const App = () => <div> </div>;`,

                    unassignableLabels: { [compLabel]: 'component' },
                }),
            ).errors.map((error) => error.message),
        ).toMatchInlineSnapshot(`[]`);
    });

    it('should not have errors if there is block statm in the body of component', () => {
        const compLabel = '_$$$$$$$$$$$$$$$$$$$$$c';

        expect(
            transform(
                mockPreprocessResult({
                    code: `let ${compLabel};

;${compLabel};
export const App = () => { return <div> </div>; };`,

                    unassignableLabels: { [compLabel]: 'component' },
                }),
            ).errors.length,
        ).toBe(0);
    });
});
