import { describe, it, expect } from 'bun:test';

import type { VoidKeyword } from '@void/shared';

import { preprocess } from '../../../phases/preprocessor';
import { DECLARATION_KEYWORDS } from '../../../phases/preprocessor/constants';

describe('preprocess', () => {
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
			`"import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;"`,
		);
	});

	describe('result', () => {
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
                "_$17": "signal",
                "_$18": "effect",
                "_$19": "memo",
                "_$20": "component",
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
                "$ChangeHandler": "_$12",
                "$ClickHandler": "_$8",
                "$InputHandler": "_$11",
                "$KeyDownHandler": "_$13",
                "$KeyUpHandler": "_$14",
                "$PointerDownHandler": "_$9",
                "$PointerUpHandler": "_$10",
                "$SubmitHandler": "_$15",
                "Signal": "_$16",
                "computeMemo": "_$5",
                "createEffect": "_$3",
                "createMemo": "_$4",
                "getValue": "_$0",
                "insert": "_$6",
                "mergeAttrs": "_$7",
                "postSetValue": "_$2",
                "setValue": "_$1",
              }
            `);
		});
	});

	describe('`void-js` keywords', () => {
		it('should add `signal`, `effect` and `memo` labels on the first line', () => {
			expect(preprocess('').code).toMatchInlineSnapshot(
				`"import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;"`,
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
                  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
                  					;_$17;let  count = 10;
                                      
                  					;_$18; () => {}; 
                                    
                  					;_$19;let  doubled = () => count * 2;"
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
              "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
              ;_$20;export const App=()=> {
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

		it('should add CompileError to `result.errors` if there is not circle bracket after component name', () => {
			const errors = preprocess('export <App> {\n}').errors;

			expect(errors.length).toBe(1);

			expect(errors[0].message).toMatchInlineSnapshot(`"'(' expected."`);
		});

		it('should have an error if there is not name of a component', () => {
			const errors = preprocess('export <> () {\n}').errors;
			expect(errors.length).toBe(1);
			expect(errors[0].message).toMatchInlineSnapshot(
				`"Identifier of 'component' expected."`,
			);
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
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
						  ;_$17;let  a = 16;function() {};const b = 16"
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
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
						  ;_$17;let  a = 16; {};const b = 16"
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
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
						  ;_$17;let  a = 16; {};const b = 16"
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
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
						  ;_$17;let  a = 16; const b = 16;"
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
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
						  ;_$17;let  a = 16; const b = 16;"
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
						  "import{getValue as _$0,setValue as _$1,postSetValue as _$2,createEffect as _$3,createMemo as _$4,computeMemo as _$5,insert as _$6,mergeAttrs as _$7,$ClickHandler as _$8,$PointerDownHandler as _$9,$PointerUpHandler as _$10,$InputHandler as _$11,$ChangeHandler as _$12,$KeyDownHandler as _$13,$KeyUpHandler as _$14,$SubmitHandler as _$15,type Signal as _$16,}from"___PATH___";let _$17,_$18,_$19,_$20;
						  ;_$17;let  a = 16; const b = 16;"
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
