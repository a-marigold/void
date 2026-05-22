import { describe, it, expect } from 'bun:test';

import { compileErrors } from '../../../../errors';
import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockPreprocessResult } from '../__testingUtils__';

describe('component', () => {
	it.only('should have errors for every appeared JSX that is outside a component return', () => {
		const compLabel = '_$cpmn';

		const errors = transform(
			mockPreprocessResult({
				code: `let _$signal,_$effect,_$mem,${compLabel};
const a = <>error1</>;

function foo (){
  return <form>error2</form>;
}

() => <p>error3</p>;

() => {
  return <br>error4</br>;
};

${compLabel};

export const Button = () => {
  return <button onClick={() => <div>error5</div>}> 
  	{() => { return <span>error6</span>; }} 

  </button>;
}

(function () {
  return <section>error7</section>;
})();
`,
				labels: { [compLabel]: 'component' },
			}),
			mockCompileContext(),
		).errors;

		expect(errors.length).toBe(7);

		expect(
			errors.every(
				(error) =>
					error.message ===
					compileErrors.JSX_OUTSIDE_COMPONENT_RETURN,
			),
		).toBe(true);
	});

	it('should not have errors for JSX in component return', () => {
		const compLabel = `_$cmpn`;

		expect(
			transform(
				mockPreprocessResult({
					code: `let ${compLabel};
;${compLabel};
export const App = () => {
  return <> <div/> <button/> <input/> </>;
};`,
					labels: { [compLabel]: 'component' },
				}),

				mockCompileContext(),
			).errors.length,
		).toBe(0);
	});

	it('should have errors if body of component is not a block', () => {
		const compLabel = '_$cmp';

		expect(
			transform(
				mockPreprocessResult({
					code: `let ${compLabel};



					;${compLabel};
export const App = () => <div> </div>;`,

					labels: { [compLabel]: 'component' },
				}),
				mockCompileContext(),
			).errors.map((error) => error.message),
		).toMatchInlineSnapshot(`
          [
            "Block statement expected.",
          ]
        `);
	});
});
