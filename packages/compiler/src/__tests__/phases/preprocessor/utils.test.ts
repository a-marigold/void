import { describe, it, expect } from 'bun:test';

import {
    generateUniqueIdentifier,
    handleProps,
    generateImports,
} from '../../../phases/preprocessor/utils';

import { RUNTIME_TYPE_NAMES } from '../../../constants';
import type { PreprocessResult } from '../../../phases/preprocessor';

describe('generateKeywordLabel', () => {
    it('should not have a collision if there is an identifier with the same name in `identifiers` argument', () => {
        const a = 1;
        expect(
            generateUniqueIdentifier(
                new Set(['a', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6']),

                'a',
            ),
        ).toBe('a7');
    });

    it('should return the same `labelPrefix` if there is not any collision in `identifiers` argument', () => {
        const prefix = 'b';

        expect(
            generateUniqueIdentifier(
                new Set([
                    'a' satisfies 'a' extends typeof prefix ? never : string,
                ]),
                prefix,
            ),
        ).toBe(prefix);
    });

    it('should return mutate provided `identifiers` unique identifiers if called with the same prefix multiple times ', () => {
        const iterations = 16;

        let lastId = 'a';

        const identifiers = new Set<string>([lastId]);

        for (let i = 0; i <= iterations; i++) {
            const unique = generateUniqueIdentifier(identifiers, lastId);

            expect(unique).not.toBe(lastId);

            lastId = unique;
        }

        expect(identifiers.size).toBe(iterations + 2);
    });
});

describe('handleProps', () => {
    it('should return not a full props if brackets in source are interrupted or not valid', () => {
        const unclosedSource = '( ( ( ( ( (';

        expect(
            handleProps(
                { source: unclosedSource, pos: 1, isRegExpAllowed: true },
                0,
            ),
        ).toBe(unclosedSource);

        const oneMissingSource = '( ( ( ( ( ( ) ) ) ) )';

        expect(
            handleProps(
                {
                    source: oneMissingSource,

                    pos: 1,

                    isRegExpAllowed: true,
                },

                0,
            ),
        ).toBe(oneMissingSource);
    });
});

describe('generateRuntimeApiImports', () => {
    it('should return add aliases from `runtimeApiNames` argument and generate correct import source', () => {
        const runtimeApiNames: PreprocessResult['runtimeApiNames'] = new Map([
            ['getValue', 'gv'],
            ['setValue', 'sv'],
            ['createEffect', 'crefec'],
            ['Signal', 'typesignal'],
        ]);

        const source = '__________SOURCEE___________';

        const imports = generateImports(runtimeApiNames, source);

        expect(imports).toMatchInlineSnapshot(
            `"import {getValue as gv,setValue as sv,createEffect as crefec,type Signal as typesignal,} from "__________SOURCEE___________";"`,
        );

        expect(imports).toInclude(source);

        for (const apiName of runtimeApiNames) {
            expect(imports).toInclude(apiName[0] + ' as ' + apiName[1]);
        }
    });

    it('should distinguish standard and type imports', () => {
        const imports = generateImports(
            new Map([
                ['getValue', 'gvl'],
                ['Signal', 'sgt'],
            ]),

            'SOURCE',
        );

        for (const typeName of RUNTIME_TYPE_NAMES) {
            expect(imports).toInclude('type ' + typeName);
        }
    });
});
