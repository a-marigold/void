import { defineConfig } from 'rollup';

import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default defineConfig([
    {
        input: './src/index.ts',

        external: ['__tests__'],

        treeshake: 'recommended',

        plugins: [typescript({ exclude: ['**/__tests__/**'] })],

        output: './dist/index.js',
    },
    {
        input: './src/index.ts',

        plugins: [dts()],

        output: './dist/index.d.ts',
    },
]);
