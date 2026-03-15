import { describe, it, expect } from 'bun:test';

import { transform } from '../../transformer';

import { createPreprocessResult } from './__testingUtils__';

describe('transform', () => {
    it('should have errors for every JSX element if it is outside a component', () => {
        expect(
            transform(
                createPreprocessResult({
                    code: `let _$signal, _$effect, _$cmp, _$cmpn;
                    
                    
                    
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

    it.only('should not have errors if JSX is only in component return', () => {
        const compLabel = `_$$$$$$$$$$$$$$$$$$$$$$$$$cmpnnt`;

        expect(
            transform(
                createPreprocessResult({
                    code: `let ${compLabel};

   ${compLabel};

export const App = () => {
  return <div> </div>;

};`,
                    unassignableLabels: new Map([[compLabel, 'component']]),
                }),
            ).errors.length,
        ).toBe(0);
    });
});
