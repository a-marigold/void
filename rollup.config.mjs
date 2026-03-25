import { readdirSync } from 'fs';

import { defineConfig } from 'rollup';

import typescript from '@rollup/plugin-typescript';

import dts from 'rollup-plugin-dts';

const PACKAGES_DIR_NAME = 'packages';

const packageDirNames = readdirSync(PACKAGES_DIR_NAME);

export default packageDirNames.flatMap((name) => {
    const packagePath = PACKAGES_DIR_NAME + '/' + name;

    return defineConfig([
        {
            input: packagePath + '/src/index.ts',
            external: ['__tests__'],

            treeshake: 'recommended',

            plugins: [
                typescript({
                    outDir: packagePath + '/dist',
                    exclude: ['**/__tests__/**'],
                }),
            ],

            output: { file: packagePath + '/dist/index.js', format: 'esm' },
        },
        {
            input: packagePath + '/src/index.ts',

            plugins: [dts()],
            output: { file: packagePath + '/dist/index.d.ts', format: 'esm' },
        },
    ]);
});
