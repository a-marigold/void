import type { Node } from 'oxc-parser';

import { print } from 'esrap';
import ts from 'esrap/languages/ts';
import tsx from 'esrap/languages/tsx';
import type { Visitors } from 'esrap';

import MagicString from 'magic-string';
import { TraceMap } from '@jridgewell/trace-mapping';
import type { EncodedSourceMap } from '@jridgewell/trace-mapping';

import type { PreprocessResult } from '../../../phases/preprocessor';

import type { RuntimeApiName } from '../../../types';

import type { ErrorContext } from '../../../phases/transformer/types';

/**
 * Returns {@link PreprocessResult.runtimeApiNames} with unique runtime API names as if it was created by preprocessor.
 *
 *
 *
 * Used to imitate results from preprocessor in transformer tests.
 *
 * @returns {Map} {@link PreprocessResult.runtimeApiNames}.
 */

export const mockRuntimeApiNames = (): PreprocessResult['runtimeApiNames'] => {
    const runtimeApiNames: Record<string, string> = {};

    for (const name of [
        'Signal',
        'getValue',
        'setValue',
        'postSetValue',
        'createEffect',
        'compute',
        'createComputation',
    ] satisfies RuntimeApiName[]) {
        runtimeApiNames[name] = '$_$' + name;
    }

    return runtimeApiNames as PreprocessResult['runtimeApiNames'];
};
export const __emptySourceMap__ = new MagicString('').generateMap();

export const __emptyTraceMap__ = new TraceMap(
    __emptySourceMap__ as EncodedSourceMap,
);

/**
 *
 * Creates `preprocess` function result with empty filled properties (like `errors` are just an empty array and `sourceMap` is an empty source map).
 *
 * @param overrides Properties of {@link PreprocessResult} that override empty filled properties.
 *
 * @returns An imitation of `preprocess` function call.
 *
 *
 */
export const mockPreprocessResult = (
    overrides: Partial<PreprocessResult>,
): PreprocessResult => ({
    code: '',
    sourceMap: __emptySourceMap__,
    errors: [],

    assignableLabels: {},
    unassignableLabels: {},
    identifiers: new Set(),

    runtimeApiNames: overrides.runtimeApiNames ?? mockRuntimeApiNames(),

    ...overrides,
});

/**
 *
 * Generates `node` from AST to TSX.
 *
 *
 * @param node node to be generated.
 *
 */

export const generate = (node: Node): string =>
    print<Node>(node, Object.assign({}, ts(), tsx()) as Visitors<Node>, {
        indent: '',
    }).code;

export const mockErrorContext = (
    overrides: Partial<ErrorContext>,
): ErrorContext => ({
    errors: [],
    traceMap: __emptyTraceMap__,
    lineIndexes: [],
    ...overrides,
});
