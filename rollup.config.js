import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser'
import dts from 'rollup-plugin-dts';

import npmPackage from './package.json' with {type: 'json'};

export default defineConfig([
    {
        input: 'packages/index.ts',

        output: [{ file: npmPackage.module, format: 'esm' }],

        plugins: [
            resolve(),
            typescript({ tsconfig: './tsconfig.json', declaration: false }),
            terser()
        ],
    },
    {
        input: 'packages/index.ts',
        output: [{ file: 'dist/index.d.ts', format: 'esm' }],

        plugins: [dts()],
    },
]);
