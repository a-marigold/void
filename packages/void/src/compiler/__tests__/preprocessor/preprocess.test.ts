import { describe, it, expect } from 'bun:test';

import { preprocess } from '../../preprocessor';

import { DECLARATION_KEYWORDS } from '../../preprocessor/constants';

import type { VoidKeyword } from '../../types';

import { compileErrors } from '../../errors';

describe('preprocess', () => {
    it('should include unchanged `source` argument in the result if there is not any `void-js` syntax', () => {
        const source = `const num: number = 10; let a: string = '', b: number = 16, c: object = {}; b > num; /* abc */ 
        // comment`;

        expect(preprocess(source).code).toInclude(source);
    });

    describe('`void-js` keywords', () => {
        it('should add `signal`, `effect` and `computation` labels on the first line', () => {
            expect(preprocess('').code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn;"`,
            );
        });

        it('should add labels before `signal`, `effect` and `computation`', () => {
            expect(
                preprocess(
                    'signal count = 10; effect () => {}; computation doubled = () => count * 2;',
                ).code,
            ).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn;;_$sgn;let  count = 10; _$efc= () => {}; ;_$cmp;let  doubled = () => count * 2;"`,
            );
        });

        it('should have CompileError instance in `result.errors` if there is variable or function declaration with `void-js` keyword as name', () => {
            const keyword: VoidKeyword = 'signal';

            for (const declarationKeyword of DECLARATION_KEYWORDS) {
                const errors = preprocess(
                    declarationKeyword + ' ' + keyword,
                ).errors;

                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe(
                    compileErrors.KEYWORD_AS_VARIABLE_NAME(keyword),
                );
            }
        });
    });

    describe('components', () => {
        it('should transform components syntax to valid jsx', () => {
            expect(preprocess('export <App> () {\n}').code)
                .toMatchInlineSnapshot(`
              "let _$sgn,_$efc,_$cmp,_$cmpn;;_$cmpn; export const App=()=> {
              }"
            `);
        });

        it('should save identifier of component', () => {
            const componentName = 'Counter';

            expect(
                preprocess(
                    'export <' + componentName + '> () {\n}',
                ).code.includes(componentName),
            ).toBe(true);
        });

        it('should not change props of component in no way', () => {
            const props = '(props: ( () => ({ a: b() }) ) ())';

            expect(
                preprocess('export <App>' + props + '{\n}').code.includes(
                    props,
                ),
            ).toBe(true);
        });

        it('should have error for every component except the first if there are multiple components in source', () => {
            expect(
                preprocess(`export <App> () {};

export <Button> () {};

export <E> () {}`).errors.map((error) => error.message),
            ).toMatchInlineSnapshot(`
              [
                "Multiple components are not allowed.",
                "Multiple components are not allowed.",
              ]
            `);
        });
        it('should add CompileError instance to `result.errors` if there is not circle bracket after component name', () => {
            const errors = preprocess('export <App> {\n}').errors;

            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe(compileErrors.TOKEN_EXPECTED('('));
        });

        it('should have an error if there is not name of a component', () => {
            const errors = preprocess('export <> () {\n}').errors;

            expect(errors.map((error) => error.message)).toContain(
                compileErrors.IDENTIFIER_EXPECTED('component'),
            );
        });

        it('should recover code correctly if there are recoverable errors in component', () => {
            const withoutName = preprocess('export <> () {}');

            expect(withoutName.code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn;function () {}"`,
            );

            expect(withoutName.errors.map((error) => error.message))
                .toMatchInlineSnapshot(`
              [
                "Identifier of 'component' expected.",
              ]
            `);

            const withoutComponentNameEnd = preprocess('export <Abc () {}');

            expect(withoutComponentNameEnd.code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn; {}"`,
            );
            expect(withoutComponentNameEnd.errors.map((erorr) => erorr.message))
                .toMatchInlineSnapshot(`
              [
                "'>' expected.",
                "'(' expected.",
              ]
            `);

            const withoutPropsStartSymbol = preprocess('export <Abc> ) {}');

            expect(withoutPropsStartSymbol.code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn; {}"`,
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
                `"let _$sgn,_$efc,_$cmp,_$cmpn;"`,
            );

            expect(fatalWithoutIdentifier.errors.map((error) => error.message))
                .toMatchInlineSnapshot(`
              [
                "Identifier of 'component' expected.",
              ]
            `);

            const withoutComponentNameEndSymbol = preprocess('export <Abc');

            expect(withoutComponentNameEndSymbol.code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn;"`,
            );

            expect(
                withoutComponentNameEndSymbol.errors.map(
                    (error) => error.message,
                ),
            ).toMatchInlineSnapshot(`
              [
                "'>' expected.",
              ]
            `);

            const withoutPropsStartSymbol = preprocess('export <Abc> ');

            expect(withoutPropsStartSymbol.code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp,_$cmpn;"`,
            );

            expect(withoutPropsStartSymbol.errors.map((error) => error.message))
                .toMatchInlineSnapshot(`
              [
                "'(' expected.",
              ]
            `);
        });

        it('should not change body of component in no way', () => {
            const body = '{\n  return "a";\n}';

            expect(
                preprocess('export <App> () ' + body).code.includes(body),
            ).toBe(true);
        });

        it('should have an error if component name is not capitalized', () => {
            expect(
                preprocess('export <app> () {}').errors[0].message,
            ).toMatchInlineSnapshot(`"Component name should be capitalized."`);

            expect(preprocess('export <App> () {}').errors.length).toBe(0);
        });
    });
});
