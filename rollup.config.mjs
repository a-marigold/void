import { readdirSync } from 'node:fs';

import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';

const PACKAGES_PATH = './packages';

const TYPE_ONLY_PACKAGES = ['shared'];

// const packageDirNames = readdirSync(PACKAGES_PATH);
const packageDirNames = TYPE_ONLY_PACKAGES;
const createTypeOnlyConfig = (packagePath) =>
	defineConfig([
		{
			input: packagePath + '/src/index.ts',
			plugins: [dts()],

			output: { file: packagePath + '/dist/index.d.ts', format: 'esm' },
		},
	]);

const createDefaultConfig = (packagePath) =>
	defineConfig([
		{
			input: packagePath + '/src/index.ts',

			external: ['__tests__'],

			treeshake: 'recommended',

			plugins: [
				typescript({
					outDir: packagePath + '/dist',
					exclude: ['**/__tests__/**'],
					verbatimModuleSyntax: false,
					preserveConstEnums: false,
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

// biome-ignore lint: lint/style/noDefaultExport
export default packageDirNames.flatMap((name) =>
	TYPE_ONLY_PACKAGES.includes(name)
		? createTypeOnlyConfig(PACKAGES_PATH + '/' + name)
		: createDefaultConfig(PACKAGES_PATH + '/' + name),
);
