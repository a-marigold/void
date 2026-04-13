import { describe, it, expect } from 'bun:test';

import type { JSXIdentifier, JSXElement } from 'oxc-parser';

import { analyzeJsx } from '../../../../phases/transformer/jsx';

import type { CompileError } from '../../../../errors';

import { generate, parseExpr, __emptyTraceMap__ } from '../__testingUtils__';

describe.skip('analyzeJsx', () => {
    describe('template', () => {
        it('should unwrap fragment if it is the `root`', () => {
            expect(
                analyzeJsx(
                    parseExpr(
                        `<>
  <div>
    <button> </button>
  </div>
  <span> </span>
  
</>`,
                    ) as JSXElement,

                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(`"<div><button> </button></div><span> </span>"`);
        });

        it('should skip nested fragments and have errors with them', () => {
            const errors: CompileError[] = [];

            expect(
                analyzeJsx(
                    parseExpr(
                        '<div> <> 1 </>  <> <> 2 </> </> <span> <> 3 </> </span> </div>',
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
                    parseExpr(`<div> <span> </span> <div> </div> </div>`) as JSXElement,

                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(`"<div> <span> </span> <div> </div> </div>"`);
        });

        it('should generate HTML comments for JSX expressions and components', () => {
            expect(
                analyzeJsx(
                    parseExpr(
                        `<div>
  {'abc'}
  {1231616}
  <span> {'count'} </span>
  <p> {<div> </div>} </p>

  <Button />
</div>`,
                    ) as JSXElement,

                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(
                `"<div>abc<!----><span> count </span><p> <!----> </p><!----></div>"`,
            );

            expect(
                analyzeJsx(
                    parseExpr(
                        `<>
  {'abc'}
  {1231616}
  <span> {'count'} </span>

  <p> {<div> </div>} </p>

  <Button />
</>`,
                    ) as JSXElement,
                    __emptyTraceMap__,

                    [],
                ).templateString,
            ).toMatchInlineSnapshot(`"abc<!----><span> count </span><p> <!----> </p><!---->"`);
        });
    });

    describe('dynamicNodes', () => {
        it('should add all parents of JSX expressions and components to `dynamicNodes`', () => {
            expect(
                analyzeJsx(
                    parseExpr(
                        `<div> 
  <header> <button> <TextC/> </button> </header>
  <main> <span> {''} </span> </main>
  <footer> {(() => {})()} </footer>
</div>`,
                    ) as JSXElement,
                    __emptyTraceMap__,
                    [],
                )
                    .dynamicNodes.keys()
                    .map(
                        (node) =>
                            node.type === 'JSXElement' &&
                            (node.openingElement.name as JSXIdentifier).name,
                    )
                    .toArray(),
            ).toMatchInlineSnapshot(`
              [
                "button",
                "header",
                "div",
                "footer",
              ]
            `);
        });
    });
});
