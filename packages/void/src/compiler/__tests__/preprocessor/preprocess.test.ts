import { describe, it, expect } from 'bun:test';

import { preprocess } from '../../preprocessor';

import { DECLARATION_KEYWORDS } from '../../preprocessor/constants';

import type { VoidKeyword } from '../../types';

import { compileErrors } from '../../errors';

describe('preprocess', () => {
    it('should include unchanged `source` argument in the result if there is not any `void-js` syntax', () => {
        const source = `const num: number = 10; let a: string = '', b: number = 16, c: object = {}; b > num; /* abc */ 
        // comment`;

        expect(preprocess(source).code.includes(source)).toBe(true);
    });

    describe('`void-js` keywords', () => {
        it('should add `signal`, `effect` and `computation` labels on the first line', () => {
            expect(preprocess('').code).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp;"`,
            );
        });

        it('should add labels before `signal`, `effect` and `computation`', () => {
            expect(
                preprocess(
                    'signal count = 10; effect () => {}; computation doubled = () => count * 2;',
                ).code,
            ).toMatchInlineSnapshot(
                `"let _$sgn,_$efc,_$cmp;;_$sgn;let  count = 10; _$efc= () => {}; ;_$cmp;let  doubled = () => count * 2;"`,
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
              "let _$sgn,_$efc,_$cmp;export const App=()=> {
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
        it('should add CompileError instance to `result.errors` if there is not circle bracket after component name', () => {
            const errors = preprocess('export <App> {\n}').errors;

            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe(compileErrors.TOKEN_EXPECTED('('));
        });

        it('should add CompileError instance to `result.errors` if there is not component name', () => {
            const errors = preprocess('export <> () {\n}').errors;

            expect(errors.map((error) => error.message)).toContain(
                compileErrors.IDENTIFIER_EXPECTED('component'),
            );
        });
        it('should not change body of component in no way', () => {
            const body = '{\n  return "a";\n}';

            expect(
                preprocess('export <App> () ' + body).code.includes(body),
            ).toBe(true);
        });
    });
});
