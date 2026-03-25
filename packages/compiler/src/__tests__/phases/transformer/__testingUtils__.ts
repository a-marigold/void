import type * as types from '@babel/types';

import MagicString from 'magic-string';
import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { PreprocessResult } from '../../../phases/preprocessor';
import type { RuntimeApiName } from '../../../types';

/**
 *
 * Returns `Map` with unique runtime API names ({@link PreprocessResult.runtimeApiNames}) as if it was created by preprocessor.
 *
 *
 *
 * Used to imitate results from preprocessor in transformer tests.
 *
 *
 * @returns {Map} {@link PreprocessResult.runtimeApiNames}.
 */

export const generateRuntimeApiNames =
    (): PreprocessResult['runtimeApiNames'] => {
        const runtimeApiNames: PreprocessResult['runtimeApiNames'] = new Map();

        for (const name of [
            'Signal',

            'getValue',

            'setValue',

            'postSetValue',

            'createEffect',

            'compute',

            'createComputation',
        ] satisfies RuntimeApiName[]) {
            runtimeApiNames.set(name, '_$1610$_' + name);
        }

        return runtimeApiNames;
    };
export const __emptySourceMap__ = new MagicString('').generateMap();

export const __emptyTraceMap__ = new TraceMap(
    __emptySourceMap__ as EncodedSourceMap,
);

export const createEmptyNodeLocation = (): types.SourceLocation => {
    return {
        start: { line: 1, column: 1, index: 1 },

        end: { line: 1, column: 1, index: 1 },

        filename: '',

        identifierName: '',
    };
};

/**
 *
 * Creates `preprocess` function result with empty filled properties (like `errors` are just an empty array and `sourceMap` is an empty source map).
 *
 *
 * @param overrides Properties of {@link PreprocessResult} that override empty filled properties.
 *
 *
 * @returns An imitation of `preprocess` function call.
 *
 */
export const createPreprocessResult = (
    overrides: Partial<PreprocessResult>,
): PreprocessResult => ({
    code: '',
    sourceMap: __emptySourceMap__,
    errors: [],

    assignableLabels: new Map(),
    unassignableLabels: new Map(),
    identifiers: new Set(),

    runtimeApiNames: overrides.runtimeApiNames ?? generateRuntimeApiNames(),

    ...overrides,
});
