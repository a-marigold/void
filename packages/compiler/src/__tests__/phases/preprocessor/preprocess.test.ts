import { describe, it, expect } from 'bun:test';

import { preprocess } from '../../../phases/preprocessor';

import { DECLARATION_KEYWORDS } from '../../../phases/preprocessor/constants';
import type { VoidKeyword } from '../../../types';

describe('preprocess', () => {
    it('should include unchanged `source` argument in the result if there is not any `void-js` syntax', () => {
        const source = `const num: number = 10; let a: string = '', b: number = 16, c: object = {}; b > num; /* abc */ 
        // comment`;

        expect(preprocess(source).code).toInclude(source);
    });

    it('should add correct imports on the first line', () => {
        const preprocessed = preprocess('').code;

        expect(preprocessed).toMatchInlineSnapshot(
            `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;"`,
        );
    });

    describe('result', () => {
        it('should include identifiers of source and labels, `runtimeApiNames` in `identifiers`', () => {
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
                "_$6",
                "_$7",
                "_$8",
                "_$9",
                "_$a",
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
                "_$7": "signal",
                "_$8": "effect",
                "_$9": "memo",
                "_$a": "component",
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

var _$0, _$1, _$2, _$3, _$4, _$5, _$6;




`).runtimeApiNames,
            ).toMatchInlineSnapshot(`
              {
                "Signal": "_$00",
                "computeMemo": "_$60",
                "createEffect": "_$40",
                "createMemo": "_$50",
                "getValue": "_$10",
                "postSetValue": "_$30",
                "setValue": "_$20",
              }
            `);
        });
    });

    describe('`void-js` keywords', () => {
        it('should add `signal`, `effect` and `memo` labels on the first line', () => {
            expect(preprocess('').code).toMatchInlineSnapshot(
                `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;"`,
            );
        });
        it('should add labels before `signal`, `effect` and `memo` and transform the `void-js` keywords to valid EcmaScript keywords', () => {
            expect(
                preprocess(
                    `signal count = 10;
                    effect () => {}; 
                    memo doubled = () => count * 2;`,
                ).code,
            ).toMatchInlineSnapshot(
                `
                  "import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;;_$7;let  count = 10;
                                      ;_$8; () => {}; 
                                      ;_$9;let  doubled = () => count * 2;"
                `,
            );
        });

        it('should have an error if there is variable or function declaration with `void-js` keyword as name', () => {
            const keyword: VoidKeyword = 'signal';

            for (const declarationKeyword of DECLARATION_KEYWORDS) {
                const errors = preprocess(declarationKeyword + ' ' + keyword).errors;

                expect(errors.length).toBe(1);

                expect(errors[0].message).toMatchInlineSnapshot(
                    `"'signal' is a 'void-js' keyword and is not allowed as variable declaration name."`,
                );
            }
        });
    });

    describe('component', () => {
        it('should transform components syntax to valid jsx', () => {
            expect(preprocess('export <App> () {\n}').code).toMatchInlineSnapshot(`
              "import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;;_$a;export const App=()=> {
              }"
            `);
        });

        it('should save identifier of component', () => {
            const componentName = 'Counter';

            expect(
                preprocess('export <' + componentName + '> () {\n}').code.includes(componentName),
            ).toBe(true);
        });

        it('should not change props of component in no way', () => {
            const props = '(props: ( () => ({ a: b() }) ) ())';

            expect(preprocess('export <App>' + props + '{\n}').code.includes(props)).toBe(true);
        });

        it('should add CompileError instance to `result.errors` if there is not circle bracket after component name', () => {
            const errors = preprocess('export <App> {\n}').errors;

            expect(errors.length).toBe(1);

            expect(errors[0].message).toMatchInlineSnapshot(`"'(' expected."`);
        });

        it('should have an error if there is not name of a component', () => {
            const errors = preprocess('export <> () {\n}').errors;

            expect(errors.map((error) => error.message)).toMatchInlineSnapshot(`
              [
                "Identifier of 'component' expected.",
              ]
            `);
        });

        describe('error recovery', () => {
            it('should recover code correctly if there are recoverable errors in component', () => {
                const withoutName = preprocess('export <> () {}');

                expect(withoutName.code).toMatchInlineSnapshot(
                    `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;function () {}"`,
                );

                expect(withoutName.errors.map((error) => error.message)).toMatchInlineSnapshot(`
              [
                "Identifier of 'component' expected.",
              ]
            `);

                const withoutComponentNameEnd = preprocess('export <Abc () {}');

                expect(withoutComponentNameEnd.code).toMatchInlineSnapshot(
                    `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;export <Abc () {}"`,
                );

                expect(withoutComponentNameEnd.errors.map((error) => error.message))
                    .toMatchInlineSnapshot(`
                  [
                    "'>' expected.",
                    "'(' expected.",
                  ]
                `);

                const withoutPropsStartSymbol = preprocess('export <Abc> ) {}');

                expect(withoutPropsStartSymbol.code).toMatchInlineSnapshot(
                    `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;export <Abc> ) {}"`,
                );

                expect(withoutPropsStartSymbol.errors.map((erorr) => erorr.message))
                    .toMatchInlineSnapshot(`
              [
                "'(' expected.",
              ]
            `);
            });

            it('should recover code correctly if there are fatal errors in component', () => {
                const fatalWithoutIdentifier = preprocess('export <');

                expect(fatalWithoutIdentifier.code).toMatchInlineSnapshot(
                    `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;export <"`,
                );

                expect(fatalWithoutIdentifier.errors.map((error) => error.message))
                    .toMatchInlineSnapshot(`
              [
                "Identifier of 'component' expected.",
              ]
            `);

                const withoutComponentNameEndSymbol = preprocess('export <Abc');

                expect(withoutComponentNameEndSymbol.code).toMatchInlineSnapshot(
                    `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;export <Abc"`,
                );

                expect(withoutComponentNameEndSymbol.errors.map((error) => error.message))
                    .toMatchInlineSnapshot(`
              [
                "'>' expected.",
              ]
            `);

                const withoutPropsStartSymbol = preprocess('export <Abc> ');

                expect(withoutPropsStartSymbol.code).toMatchInlineSnapshot(
                    `"import{type Signal as _$0,getValue as _$1,setValue as _$2,postSetValue as _$3,createEffect as _$4,createMemo as _$5,computeMemo as _$6,}from"___PATH___";let _$7,_$8,_$9,_$a;export <Abc> "`,
                );

                expect(withoutPropsStartSymbol.errors.map((error) => error.message))
                    .toMatchInlineSnapshot(`
              [
                "'(' expected.",
              ]
            `);
            });
        });

        it('should not change body of component in no way', () => {
            const body = '{\n  return "a";\n}';

            expect(preprocess('export <App> () ' + body).code.includes(body)).toBe(true);
        });

        it('should have an error if component name is not capitalized', () => {
            expect(preprocess('export <app> () {}').errors[0].message).toMatchInlineSnapshot(
                `"Component name should be capitalized."`,
            );

            expect(preprocess('export <App> () {}').errors.length).toBe(0);
        });
    });
});
