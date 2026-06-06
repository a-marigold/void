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
						code: 'let _$0, _$1, _$2, _$3; var a = 27; let b = 16; const c = 16;',

						labels: {
							_$0: 'signal',
							_$1: 'effect',
							_$2: 'memo',
							_$3: 'component',
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
		const signalLabel = '_$16';
		const effectLabel = '_$17';
		const memoLabel = '_$18';
		const componentLab = '_$19';

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
		  export const App = () => {const _$1 = _$0.cloneNode(true);
		  return _$1;};
		  const _$2 = document.createElement('template'),_$0 = _$2.content;
		  _$2.innerHTML = '<div> </div>';"
		`);
	});
});
