import { describe, it, expect } from 'bun:test';

import { preprocess } from '../../preprocessor';

import { DECLARATION_KEYWORDS } from '../../preprocessor/constants';

import type { VoidKeyword } from '../../types';

import { CompileError, compileErrors } from '../../errors';

/**
 *
 * Tests `signal` or `computation` on errors about declaration without identifier.
 *
 */
const testKeywordWithoutIdentifier = (keyword: VoidKeyword) => {
    it.serial(
        'should throw CompileError instance if there is only `' +
            keyword +
            '` in source',
        () => {
            expect.assertions(4);

            try {
                preprocess(
                    '                               ' +
                        keyword +
                        '\n\t\n\t                                            ',
                );
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);
                expect((error as CompileError).message).toBe(
                    compileErrors.IDENTIFIER_EXPECTED(keyword),
                );
            }

            try {
                preprocess(keyword + '=');
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);

                expect((error as CompileError).message).toBe(
                    compileErrors.IDENTIFIER_EXPECTED(keyword),
                );
            }
        },
    );
};

describe('preprocess', () => {
    it('should include unchanged `source` argument in the result if there is not any `void-js` syntax', () => {
        const source = `const num: number = 10; let a: string = '', b: number = 16, c: object = {}; b > num; /* abc */ 
        // comment`;

        expect(preprocess(source).transformed.includes(source)).toBe(true);
    });

    describe('`void-js` keywords', () => {
        it('should add `signal`, `effect` and `computation` labels on the first line', () => {
            expect(preprocess('').transformed).toMatchInlineSnapshot(
                `"let _$signal,_$effect,_$computation;"`,
            );
        });

        it('should add labels before `signal`, `effect` and `computation`', () => {
            expect(
                preprocess(
                    'signal count = 10; effect () => {}; computation doubled = () => count * 2;',
                ).transformed,
            ).toMatchInlineSnapshot(
                `"let _$signal,_$effect,_$computation;;_$signal;let  count = 10; _$effect= () => {}; ;_$computation;const  doubled = () => count * 2;"`,
            );
        });

        it.serial(
            'should throw CompileError instance if there is variable or function declaration with `void-js` keyword as name',
            () => {
                expect.assertions(DECLARATION_KEYWORDS.size * 2);

                const keyword: VoidKeyword = 'signal';

                for (const declarationKeyword of DECLARATION_KEYWORDS) {
                    try {
                        preprocess(declarationKeyword + ' ' + keyword);
                    } catch (error) {
                        expect(error).toBeInstanceOf(CompileError);

                        expect((error as CompileError).message).toBe(
                            compileErrors.VOID_KEYWORD_AS_VARIABLE_NAME(
                                keyword,
                            ),
                        );
                    }
                }
            },
        );

        testKeywordWithoutIdentifier('signal');

        testKeywordWithoutIdentifier('computation');
    });

    describe('components', () => {
        it('should transform components syntax to valid jsx', () => {
            expect(preprocess('export <App> () {\n}').transformed)
                .toMatchInlineSnapshot(`
              "let _$signal,_$effect,_$computation;export const App=()=> {
              }"
            `);
        });

        it('should save identifier of component', () => {
            const componentName = 'Counter';

            expect(
                preprocess(
                    'export <' + componentName + '> () {\n}',
                ).transformed.includes(componentName),
            ).toBe(true);
        });

        it('should not change props of component in no way', () => {
            const props = '(props: ( () => ({ a: b() }) ) ())';

            expect(
                preprocess(
                    'export <App>' + props + '{\n}',
                ).transformed.includes(props),
            ).toBe(true);
        });

        it.serial(
            'should throw CompileError instance if there is not circle bracket after component name',
            () => {
                expect.assertions(2);
                try {
                    preprocess('export <App> {\n}');
                } catch (error) {
                    expect(error).toBeInstanceOf(CompileError);
                    expect((error as CompileError)?.message).toBe(
                        compileErrors.TOKEN_EXPECTED('('),
                    );
                }
            },
        );

        it.serial(
            'should throw CompileError instance if there is not component name',
            () => {
                expect.assertions(2);
                try {
                    preprocess('export <> () {\n}');
                } catch (error) {
                    expect(error).toBeInstanceOf(CompileError);
                    expect((error as CompileError).message).toBe(
                        compileErrors.IDENTIFIER_EXPECTED('component'),
                    );
                }
            },
        );

        it('should not change body of component in no way', () => {
            const body = '{\n  return "a";\n}';

            expect(
                preprocess('export <App> () ' + body).transformed.includes(
                    body,
                ),
            ).toBe(true);
        });
    });
});
