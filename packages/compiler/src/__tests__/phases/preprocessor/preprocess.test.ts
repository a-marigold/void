import { describe, it, expect } from 'bun:test';

import { preprocess } from '../../../phases/preprocessor';
import { DECLARATION_KEYWORDS } from '../../../phases/preprocessor/constants';
import type { VoidKeyword } from '../../../types';

describe.only('preprocess', () => {
	it('should include unchanged `source` argument in the result if there is not any `void-js` syntax', () => {
		const source = `const num: number = 10; 
let a: string = '', b: number = 16, c: object = {}; 
b > num; /* abc */ 
        // comment`;

		expect(preprocess(source).code).toInclude(source);
	});
	it('should add correct imports to the first line', () => {
		const preprocessed = preprocess('').code;

		expect(preprocessed).toMatchInlineSnapshot(
			`"import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;"`,
		);
	});

	describe('result', () => {
		it('should include identifiers of source, labels and runtime api names in `identifiers`', () => {
			expect(
				preprocess(`signal a = 16; 
memo b = () => 16;
effect () => {}

const obj = { a, b, c: () => {} };
const { a: aa, b: bb, c } = obj;

obj.a;


`)
					.identifiers.values()
					.toArray(),
			).toMatchInlineSnapshot(`
              [
                "a",
                "b",
                "const",
                "obj",
                "c",
                "aa",
                "bb",
                "_$0",
                "_$1",
                "_$2",
                "_$3",
                "_$4",
                "_$5",
                "_$16",
                "_$6",
                "_$7",
                "_$8",
                "_$9",
                "_$a",
                "_$b",
                "_$c",
                "_$d",
                "_$e",
                "_$f",
                "_$80",
                "_$90",
                "_$a0",
                "_$b0",
              ]
              `);
		});

		it('should generate unique identifiers in `labels`', () => {
			expect(
				preprocess(`signal a = 16; 
memo b = () => 16;
effect () => {}

const obj = { a, b, c: () => {} };
const { a: aa, b: bb, c } = obj;

obj.a;








{
var _$s, _$ef, _$cmp, _$me;
                }
`).labels,
			).toMatchInlineSnapshot(`
              {
                "_$80": "signal",
                "_$90": "effect",
                "_$a0": "memo",
                "_$b0": "component",
              }
            `);
		});

		it('should generate unique identifiers in `runtimeApiNames`', () => {
			expect(
				preprocess(`signal a = 16; 
memo b = () => 16;
effect () => {}

const obj = { a, b, c: () => {} };
const { a: aa, b: bb, c } = obj;
obj.a;

var _$0, _$1, _$2, _$3, _$4, _$5, _$6;`).runtimeApiNames,
			).toMatchInlineSnapshot(`
              {
                "$ChangeHandler": "_$b",
                "$ClickHandler": "_$7",
                "$InputHandler": "_$a",
                "$KeyDownHandler": "_$c",
                "$KeyUpHandler": "_$d",
                "$PointerDownHandler": "_$8",
                "$PointerUpHandler": "_$9",
                "$SubmitHandler": "_$e",
                "Signal": "_$f",
                "computeMemo": "_$50",
                "createEffect": "_$30",
                "createMemo": "_$40",
                "getValue": "_$00",
                "insert": "_$16",
                "mergeAttrs": "_$60",
                "postSetValue": "_$20",
                "setValue": "_$10",
              }
            `);
		});
	});

	describe('`void-js` keywords', () => {
		it('should add `signal`, `effect` and `memo` labels on the first line', () => {
			expect(preprocess('').code).toMatchInlineSnapshot(
				`"import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;"`,
			);
		});
		it('should add labels before `signal`, `effect` and `memo` and transform the `void-js` keywords to valid EcmaScript keywords', () => {
			expect(
				preprocess(
					`
					signal count = 10;
                    
					effect () => {}; 
                  
					memo doubled = () => count * 2;`,
				).code,
			).toMatchInlineSnapshot(
				`
                  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
                  					;_$80;let  count = 10;
                                      
                  					;_$90; () => {}; 
                                    
                  					;_$a0;let  doubled = () => count * 2;"
                `,
			);
		});

		it('should have an error when `void-js` keyword is used as a variable name', () => {
			const keyword: VoidKeyword = 'signal';

			for (const declarationKeyword of DECLARATION_KEYWORDS) {
				const errors = preprocess(
					declarationKeyword + ' ' + keyword,
				).errors;

				expect(errors.length).toBe(1);

				expect(errors[0].message).toMatchInlineSnapshot(
					`"'signal' is a 'void-js' keyword and is not allowed as variable declaration name."`,
				);
			}
		});
	});

	describe('component', () => {
		it('should transform components syntax to valid jsx and add component label before', () => {
			expect(preprocess('\nexport <App> () {\n}').code).toMatchInlineSnapshot(`
              "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
              ;_$b0;export const App=()=> {
              }"
            `);
		});

		it('should save identifier of component', () => {
			const componentName = 'Counter';

			expect(preprocess('export <' + componentName + '> () {\n}').code).toInclude(
				componentName,
			);
		});

		it('should not change props of component in no way', () => {
			const props = '(props: ( () => ({ a: b() }) ) ())';

			expect(
				preprocess('export <App>' + props + '{\n}').code.includes(props),
			).toBe(true);
		});

		it('should add CompileError instance to `result.errors` if there is not circle bracket after component name', () => {
			const errors = preprocess('export <App> {\n}').errors;

			expect(errors.length).toBe(1);

			expect(errors[0].message).toMatchInlineSnapshot(`"'(' expected."`);
		});

		it('should have an error if there is not name of a component', () => {
			const errors = preprocess('export <> () {\n}').errors;
			expect(errors.length).toBe(1);
			expect(errors[0].message).toMatchInlineSnapshot(`"Identifier of 'component' expected."`);
		});
		describe('error recovery', () => {
			it('should recover recoverable errors', () => {
				/**
				 * Must be prepended to every tested source.
				 */

				const startValidCode = '\nsignal a = 16;';

				/**
				 *
				 * Must be appended to every tested source.
				 *
				 */
				const endValidCode = 'const b = 16';

				{
					// Without name

					const { code, errors } = preprocess(
						startValidCode + 'export <>() {};' + endValidCode,
					);

					expect(code).toMatchInlineSnapshot(
						`
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
						  ;_$80;let  a = 16;function() {};const b = 16"
						`,
					);

					expect(errors.length).toBe(1);
					expect(errors[0].message).toMatchInlineSnapshot(
						`"Identifier of 'component' expected."`,
					);
				}

				{
					// Without component name closing symbol

					const { code, errors } = preprocess(
						startValidCode +
							'export <Abc () {};' +
							endValidCode,
					);

					expect(code).toMatchInlineSnapshot(
						`
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
						  ;_$80;let  a = 16; {};const b = 16"
						`,
					);

					expect(errors.length).toBe(2);

					expect(
						errors[0].message + errors[1].message,
					).toMatchInlineSnapshot(`"'>' expected.'(' expected."`);
				}

				{
					// Without props start symbol

					const { code, errors } = preprocess(
						startValidCode +
							'export <Abc> ) {};' +
							endValidCode,
					);

					expect(code).toMatchInlineSnapshot(
						`
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
						  ;_$80;let  a = 16; {};const b = 16"
						`,
					);

					expect(errors.length).toBe(1);
					expect(errors[0].message).toMatchInlineSnapshot(
						`"'(' expected."`,
					);
				}
			});

			it('should recover fatal errors', () => {
				/**
				 * Must be prepended to every tested source.
				 */

				const validCode = '\nsignal a = 16; const b = 16;';

				{
					// Without name
					const { code, errors } = preprocess(validCode + 'export <');

					expect(code).toMatchInlineSnapshot(
						`
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
						  ;_$80;let  a = 16; const b = 16;"
						`,
					);

					expect(errors.length).toBe(1);
					expect(errors[0].message).toMatchInlineSnapshot(
						`"Identifier of 'component' expected."`,
					);
				}

				{
					// Withoyt name end symobl

					const { code, errors } = preprocess(
						validCode + 'export <Abc',
					);

					expect(code).toMatchInlineSnapshot(
						`
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
						  ;_$80;let  a = 16; const b = 16;"
						`,
					);

					expect(errors[0].message).toMatchInlineSnapshot(
						`"'>' expected."`,
					);
				}

				{
					// Without props start symbol

					const { code, errors } = preprocess(
						validCode + 'export <Abc>',
					);

					expect(code).toMatchInlineSnapshot(
						`
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$16,mergeAttrs as _$6,$ClickHandler as _$7,$PointerDownHandler as _$8,$PointerUpHandler as _$9,$InputHandler as _$a,$ChangeHandler as _$b,$KeyDownHandler as _$c,$KeyUpHandler as _$d,$SubmitHandler as _$e,type Signal as _$f,}from"___PATH___";let _$80,_$90,_$a0,_$b0;
						  ;_$80;let  a = 16; const b = 16;"
						`,
					);

					expect(errors.length).toBe(1);

					expect(errors[0].message).toMatchInlineSnapshot(
						`"'(' expected."`,
					);
				}
			});
		});
		it('should not change body of component in no way', () => {
			const body = '{\n  return "a";\n}';

			expect(preprocess('export <App> () ' + body).code).toInclude(body);
		});

		it('should have an error if component name is not capitalized', () => {
			expect(
				preprocess('export <app> () {}').errors[0].message,
			).toMatchInlineSnapshot(`"Component name must be capitalized."`);

			expect(preprocess('export <App> () {}').errors.length).toBe(0);
		});
	});
});
