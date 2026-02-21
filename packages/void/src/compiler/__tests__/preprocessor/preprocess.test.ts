import { describe, it, expect } from 'bun:test';

import { preprocess } from '../../preprocessor';
import { KEYWORD_LABEL_PREFIXES } from '../../preprocessor/constants';

describe('preprocess', () => {
    it('should include unchanged `source` argument in the result if there is not any `void-js` syntax', () => {
        const source = `const num: number = 10; let a: string = '', b: number = 16, c: object = {}; b > num; /* abc */ 
        // comment`;

        expect(preprocess(source).includes(source)).toBe(true);
    });

    describe('`void-js` keyword labels', () => {
        it('should add `signal`, `effect` and `computation` labels on the first line', () => {
            expect(preprocess('')).toMatchInlineSnapshot(
                `"let _$signal,_$effect,_$computation;"`,
            );
        });

        it('should add labels before `signal`, `effect` and `computation`', () => {
            expect(
                preprocess(
                    'signal count = 10; effect () => {}; computation doubled = () => count * 2;',
                ),
            ).toMatchInlineSnapshot(
                `"let _$signal,_$effect,_$computation;;_$signal;let  count = 10; ;_$effect; () => {}; ;_$computation;const  doubled = () => count * 2;"`,
            );
        });
    });
});
