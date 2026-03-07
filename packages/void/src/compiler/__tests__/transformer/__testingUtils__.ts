import * as types from '@babel/types';

import MagicString from 'magic-string';
import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { RuntimeApiName } from '../../types';
import type { PreprocessResult } from '../../preprocessor';

/**
 *
 * #### Returns `Map` with unique runtime API names ({@link PreprocessResult.runtimeApiNames}) as if it was created by preprocessor.
 * #### Used to imitate results from preprocessor in transformer tests.
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
