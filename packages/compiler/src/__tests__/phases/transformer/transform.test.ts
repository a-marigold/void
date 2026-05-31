import { describe, it, expect } from 'bun:test';

import { transform } from '../../../phases/transformer';

import {
	mockGen,
	mockRuntimeApiNames,
	mockPreprocessResult,
	mockCompileContext,
} from './__testingUtils__';

describe('transform', () => {
	it('should delete only the first variable declaration with keyword labels in preprocessed.code', () => {
		expect(
			mockGen(
				transform(
					mockPreprocessResult({
						code: 'let _$a, _$m, _$c; var a = 27; let b = 16; const c = 16;',

						labels: {
							_$a: 'signal',
							_$e: 'effect',
							_$m: 'memo',
							_$c: 'component',
						},
						runtimeApiNames: mockRuntimeApiNames(),
					}),
					mockCompileContext(),
				).result.program,
			),
		).toMatchInlineSnapshot(`
          "var a = 27;
          let b = 16;
          const c = 16;"
        `);
	});

	it('should delete all keyword labels before contructions in `preprocesed.code`', () => {
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
		const generated = mockGen(
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
				mockCompileContext(),
			).result.program,
		);

		expect(generated).not.toInclude(signalLabel);
		expect(generated).not.toInclude(effectLabel);
		expect(generated).not.toInclude(memoLabel);
		expect(generated).not.toInclude(componentLab);
		expect(generated).toMatchInlineSnapshot(`
		  ";;

		  const count = { subscribers: new Set(), value: 16 };

		  ;;

		  const multiplied = _$createMemo(() => _$getValue(count) * 16);

		  ;;

		  _$createEffect(() => {
		  console.log(_$computeMemo(multiplied));})
		  ;;
		  export const App = () => {const _$el = _$tc.cloneNode(true);
		  return _$el;};
		  const _$t = document.createElement('template'),_$tc = _$t.content;
		  _$t.innerHTML = '<div> </div>';"
		`);
	});
});
