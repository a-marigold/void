import { describe, it, expect } from 'bun:test';

import type { BlockStatement, JSXElement, JSXFragment } from 'oxc-parser';

import { ScopeIdType } from '../../../../phases/transformer/constants';
import { transformJsx } from '../../../../phases/transformer/jsx';
import * as nodes from '../../../../phases/transformer/nodes';
import type { TransformContext } from '../../../../phases/transformer/types';
import type { CompileContext } from '../../../../types';
import {
	mockCompileContext,
	mockGen,
	mockParse,
	mockPreprocessResult,
	mockTransformContext,
} from '../__testingUtils__';

describe('transformJsx', () => {
	const mockGenBlockBody = (body: BlockStatement['body']): string =>
		mockGen(nodes.blockStatement(body));

	it('should initialize generated template in `transformContext.programBody`', () => {
		const programBody: TransformContext['programBody'] = [];

		transformJsx(
			mockParse(
				'<div className={"dv"}> {(() => {})()} {"   Hello   "}, World! <Counter init={16} /> </div>',
			) as JSXElement,
			[],

			mockCompileContext(),

			mockTransformContext({ programBody }),
			mockPreprocessResult(),
		);
		expect(mockGenBlockBody(programBody)).toMatchInlineSnapshot(`
		  "{
		  const _$t = document.createElement('template'),
		  _$tc = _$t.content;
		  _$t.innerHTML = '<div class="dv"> <!---->    Hello   , World! <!----> </div>';}"
		`);
	});

	describe('event delegation', () => {
		it('should add delegated events that appeared in JSX to `compileContext.globalDelegatedEvents` and add listeners on document with them to `transformContext.programBody`', () => {
			const programBody: TransformContext['programBody'] = [];

			const globalDelegatedEvents: CompileContext['globalDelegatedEvents'] =
				new Set();

			transformJsx(
				mockParse(
					'<> <button onClick={() => {}}>click</button> <input onInput={() => {}}/> </>',
				) as JSXFragment,

				[],

				mockCompileContext({ globalDelegatedEvents }),

				mockTransformContext({ programBody }),

				mockPreprocessResult(),
			);

			expect(globalDelegatedEvents.values().toArray()).toMatchInlineSnapshot(`
			  [
			    "$Click",
			    "$Input",
			  ]
			`);

			expect(mockGenBlockBody(programBody)).toMatchInlineSnapshot(`
			  "{
			  const _$t = document.createElement('template'),
			  _$tc = _$t.content;
			  _$t.innerHTML = ' <button >click</button> <input /> ';document.addEventListener('click', _$ClickHandler);document.addEventListener('input', _$InputHandler);}"
			`);
		});

		it('should not delegate non-delegable events at all', () => {
			const programBody: TransformContext['programBody'] = [];

			const globalDelegatedEvents: CompileContext['globalDelegatedEvents'] =
				new Set();

			transformJsx(
				mockParse(
					'<> <img src={"./abc.png"} onLoad={() => {}}/> <div className={"dv"} onMouseOver={() => {}} /></>',
				) as JSXFragment,

				[],

				mockCompileContext({ globalDelegatedEvents }),

				mockTransformContext({ programBody }),

				mockPreprocessResult(),
			);

			expect(globalDelegatedEvents.size).toBe(0);

			expect(mockGenBlockBody(programBody)).toMatchInlineSnapshot(`
			  "{
			  const _$t = document.createElement('template'),
			  _$tc = _$t.content;
			  _$t.innerHTML = ' <img src="./abc.png"/> <div class="dv"></div>';}"
			`);
		});
	});

	it('should add generated dom operations to `fnBody` argument and add corresponding template to `transformContext.programBody`', () => {
		const fnBody: BlockStatement['body'] = [];

		const programBody: TransformContext['programBody'] = [];

		const defaultIdentifier = 'staticName';
		const signalIdentifier = 'name';

		transformJsx(
			mockParse(`<div>

	<Counter init={16} /> 
	
	<pre className={"code-block"}> 
		<code> 
			{'const size = 16;'}
		</code>
	</pre>
	<h1>{${signalIdentifier}}</h1>

	<input onInput={(event) => { ${defaultIdentifier} = event.target.value; }} />

	<button onClick={() => { ${signalIdentifier} = ${defaultIdentifier};  }}> Set Name </button>
</div>`) as JSXElement,
			fnBody,

			mockCompileContext(),

			mockTransformContext({
				scopeStack: [
					new Map([
						[defaultIdentifier, ScopeIdType.Default],

						[signalIdentifier, ScopeIdType.Signal],
					]),
				],

				fnScopeCount: 1,

				componentFnScope: 1,
				programBody,
			}),

			mockPreprocessResult(),
		);

		expect(mockGenBlockBody(fnBody)).toMatchInlineSnapshot(`
		  "{
		  const _$el = _$tc.cloneNode(true),
		  _$el0 = _$el.firstChild,
		  _$el1 = _$el0.firstChild,
		  _$el2 = _$el1.nextSibling.nextSibling,
		  _$el3 = _$el2.firstChild,
		  _$el4 = _$el2.nextSibling,
		  _$el5 = _$el4.nextSibling;
		  let _$p = null;
		  _$createEffect(() => _$p = _$insert(_$getValue(name), _$el3, _$p));
		  _$el4.$Input = (event) => {staticName = event.target.value;};
		  _$el5.$Click = () => {_$setValue(name, staticName);};
		  return _$el;}"
		`);

		expect(mockGenBlockBody(programBody)).toMatchInlineSnapshot(`
		  "{
		  const _$t = document.createElement('template'),
		  _$tc = _$t.content;
		  _$t.innerHTML = '<div><!----><pre class="code-block"><code>const size = 16;</code></pre><h1><!----></h1><input /><button > Set Name </button></div>';document.addEventListener('input', _$InputHandler);document.addEventListener('click', _$ClickHandler);}"
		`);
	});
});

describe.todo('transformJsxExpr', () => {});
