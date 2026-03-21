import { describe, it, expect } from 'bun:test';

import { parseExpression } from '@babel/parser';

import type { JSXElement } from '@babel/types';

import { analyzeJsx } from '../../../transformer/jsx';

import { __emptyTraceMap__ } from '../__testingUtils__';

import type { CompileError } from '../../../errors';

describe('analyzeJsx', () => {
    describe('template', () => {
        it('should unwrap fragment if it is the `root`', () => {
            expect(
                analyzeJsx(
                    parseExpression(
                        `<>
  <div>
    <button> </button>
  </div>
  <span> </span>
</>`,

                        { plugins: ['jsx'] },
                    ) as JSXElement,

                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(`
              "
                <div>
                  <button> </button>
                </div>
                <span> </span>
              "
            `);
        });

        it('should skip nested fragments and have errors with them', () => {
            const errors: CompileError[] = [];

            expect(
                analyzeJsx(
                    parseExpression(
                        '<div> <> 1 </>  <> <> 2 </> </> <span> <> 3 </> </span> </div>',

                        { plugins: ['jsx'] },
                    ) as JSXElement,

                    __emptyTraceMap__,

                    errors,
                ).templateString,
            ).toMatchInlineSnapshot(`"<div>    <span>  </span> </div>"`);

            expect(errors.map((error) => error.message)).toMatchInlineSnapshot(`
          [
            "JSX fragment should not appear here.",
            "JSX fragment should not appear here.",
            "JSX fragment should not appear here.",
          ]
        `);
        });

        it('should generate template with inclusion of the root if it is not a fragment', () => {
            expect(
                analyzeJsx(
                    parseExpression(
                        `<div> <span> </span> <div> </div> </div>`,
                        {
                            plugins: ['jsx'],
                        },
                    ) as JSXElement,

                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(
                `"<div> <span> </span> <div> </div> </div>"`,
            );
        });

        it('should generate HTML comments for JSX expressions', () => {
            expect(
                analyzeJsx(
                    parseExpression(
                        `<div>
  {'abc'}
  {1231616}
  <span> {'count'} </span>
  <p> {<div> </div>} </p>
</div>`,
                        { plugins: ['jsx'] },
                    ) as JSXElement,
                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(`
              "<div>
                <!---->
                <!---->
                <span> <!----> </span>
                <p> <!----> </p>
              </div>"
            `);

            expect(
                analyzeJsx(
                    parseExpression(
                        `<>
  {'abc'}
  {1231616}
  <span> {'count'} </span>
  <p> {<div> </div>} </p>
</>`,
                        { plugins: ['jsx'] },
                    ) as JSXElement,
                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(`
              "
                <!---->
                <!---->
                <span> <!----> </span>
                <p> <!----> </p>
              "
            `);
        });
    });
});
