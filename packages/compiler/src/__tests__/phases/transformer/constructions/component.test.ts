import { describe, it, expect } from 'bun:test';

import { errorMessages } from '../../../../errors';
import { transform } from '../../../../phases/transformer';
import { mockCompileContext, mockGen, mockPreprocessResult } from '../__testingUtils__';

describe('component', () => {
	it('should transform JSX returned by component and add delegated events to `compileContext.globalDelegatedEvents`', () => {
		const compileContext = mockCompileContext();

		const signalLabel = '_$0';

		const componentLabel = '_$1';

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

		  const _$7 = _$0.cloneNode(true),
		  _$8 = _$7.firstChild,
		  _$10 = _$8.nextSibling,
		  _$11 = _$10.firstChild,
		  _$12 = _$11.nextSibling;
		  let _$9 = null;
		  _$createEffect(() => _$9 = _$insert(_$getValue(name) && (() => {const _$2 = _$1.cloneNode(true),_$3 = _$2.firstChild,_$4 = _$3.firstChild.nextSibling;
		  let _$5 = null;
		  _$createEffect(() => _$5 = _$insert(_$getValue(name), _$4, _$5));
		  return _$2;})(),_$8,_$9));
		  _$10.$Submit = () => {_$setValue(name, nameDraft);};
		  _$12.$Input = (event) => {nameDraft = event.target.value;};
		  return _$7;};
		  const _$6 = document.createElement('template'),_$1 = _$6.content;
		  _$6.innerHTML = '<h1 role="presentation"> You have written a name - <!----> </h1>';
		  const _$13 = document.createElement('template'),_$0 = _$13.content;
		  _$13.innerHTML = '<!----><form role="search"><!----><input placeholder="Search for name"/><button class="btn"> Submit </button></form>';document.addEventListener('submit', _$SubmitHandler);document.addEventListener('input', _$InputHandler);"
		`);

		expect(compileContext.globalDelegatedEvents.values().toArray())
			.toMatchInlineSnapshot(`
		  [
		    "$Submit",
		    "$Input",
		  ]
		`);
	});

	describe('errors', () => {
		it('should have errors for every appeared JSX that is outside a component return', () => {
			const compLabel = '_$0';

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
						errorMessages.JSX_OUTSIDE_COMPONENT_RETURN,
				),
			).toBe(true);
		});

		it('should not have errors for JSX in component return', () => {
			const compLabel = `_$0`;
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
			const compLabel = '_$0';

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
