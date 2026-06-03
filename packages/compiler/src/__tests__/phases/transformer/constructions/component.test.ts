import { describe, it, expect } from 'bun:test';

import { compileErrors } from '../../../../errors';
import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockGen, mockPreprocessResult } from '../__testingUtils__';

describe('component', () => {
	it('should transform JSX returned by component and add delegated events to `compileContext.globalDelegatedEvents`', () => {
		const compileContext = mockCompileContext();

		const signalLabel = '_$sig';

		const componentLabel = '_$cmp';
		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: `let ${signalLabel}, ${componentLabel};

${componentLabel};
export const SearchForm = () => {
	let nameDraft = '';

    ${signalLabel};
	let name = '';

	return <> 
		{name && <h1 role={'presentation'}> You have written a name - {name} </h1>}
		<form role={"search"} onSubmit={() => { name = nameDraft; }}>
			<AutoComplete name={name}/>
			<input placeholder={"Search for name"} onInput={(event) => { nameDraft = event.target.value; }} />
			<button className={"btn"}> Submit </button>
		</form>
	</>;
}`,
						labels: {
							[signalLabel]: 'signal',
							[componentLabel]: 'component',
						},
					}),
					compileContext,
				).result.program,
			),
		).toMatchInlineSnapshot(`
		  ";;

		  export const SearchForm = () => {
		  let nameDraft = '';

		  ;;

		  const name = { subscribers: new Set(), value: '' };

		  const _$el2 = _$tc.cloneNode(true),
		  _$el3 = _$el2.firstChild,
		  _$el4 = _$el3.nextSibling,
		  _$el5 = _$el4.firstChild,
		  _$el6 = _$el5.nextSibling;
		  let _$p0 = null;
		  _$createEffect(() => _$p0 = _$insert(_$getValue(name) && (() => {const _$el = _$tc0.cloneNode(true),_$el0 = _$el.firstChild,_$el1 = _$el0.firstChild.nextSibling;
		  let _$p = null;
		  _$createEffect(() => _$p = _$insert(_$getValue(name), _$el1, _$p));
		  return _$el;})(),_$el3,_$p0));
		  _$el4.$Submit = () => {_$setValue(name, nameDraft);};
		  _$el6.$Input = (event) => {nameDraft = event.target.value;};
		  return _$el2;};
		  const _$t = document.createElement('template'),_$tc0 = _$t.content;
		  _$t.innerHTML = '<h1 role="presentation"> You have written a name - <!----> </h1>';
		  const _$t0 = document.createElement('template'),_$tc = _$t0.content;
		  _$t0.innerHTML = '<!----><form role="search"><!----><input placeholder="Search for name"/><button class="btn"> Submit </button></form>';document.addEventListener('submit', _$SubmitHandler);document.addEventListener('input', _$InputHandler);"
		`);

		expect(
			compileContext.globalDelegatedEvents.values().toArray(),
		).toMatchInlineSnapshot(`
		  [
		    "$Submit",
		    "$Input",
		  ]
		`);
	});

	describe('errors', () => {
		it('should have errors for every appeared JSX that is outside a component return', () => {
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
  return <> <Child icon={<svg></svg>}> {true ? <span> hello </span> : <b> 16 </b>} </Child> <button/> <input/> </>;
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
});
