import { describe, it, expect } from 'bun:test';

import { compileErrors } from '../../../../errors';
import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockPreprocessResult } from '../__testingUtils__';

describe('component', () => {
	it.only('should have errors for every appeared JSX that is outside a component return', () => {
		const compLabel = '_$cpmn';

		let errorCount = 0;

		const errors = transform(
			mockPreprocessResult({
				code: `let _$signal,_$effect,_$mem,${compLabel};
const a = <>error${++errorCount}</>;

function foo (){
  return <form>error${++errorCount}</form>;
}

() => <p>error${++errorCount}</p>;

() => {
  return <br>error${++errorCount}</br>;
};

${compLabel};

export const Button = () => {
  
return <button onClick={() => <div>error${++errorCount}</div>}> 
  	{() => { return <span>error${++errorCount}</span>;}} 

				{function () { <article>error${++errorCount}</article>; }}

  </button>; 
}

(function () {
  return <section>error${++errorCount}</section>;

})();
`,
				labels: { [compLabel]: 'component' },
			}),
			mockCompileContext(),
		).errors;
		expect(errors.length).toBe(errorCount);

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
  return <> <div> {true ? <span> hello </span> : <b> 16 </b>} </div> <button/> <input/> </>;
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
