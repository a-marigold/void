import { parseSync } from 'oxc-parser';
import type { Node, Statement, Expression } from 'oxc-parser';

import { print } from 'esrap';
import ts from 'esrap/languages/ts';

import tsx from 'esrap/languages/tsx';
import type { Visitors } from 'esrap';

import { GenMapping, toDecodedMap } from '@jridgewell/gen-mapping';

import { TraceMap } from '@jridgewell/trace-mapping';

import type { PreprocessResult } from '../../../phases/preprocessor';

import type { ErrorContext } from '../../../phases/transformer/types';

/**
 * Returns {@link PreprocessResult.runtimeApiNames} with unique runtime API names as if it was created by preprocessor.
 *
 * Used to imitate results from preprocessor in transformer tests.
 *
 * @returns {Map} {@link PreprocessResult.runtimeApiNames}.
 */

export const mockRuntimeApiNames = (
    overrides: Partial<PreprocessResult['runtimeApiNames']>,
): PreprocessResult['runtimeApiNames'] => ({
    Signal: 'L_$Signal',
    getValue: 'L_$getValue',
    setValue: 'L_$setValue',
    postSetValue: 'L_$postSetValue',
    createEffect: 'L_$createEffect',
    compute: 'L_$compute',
    createComputation: 'L_$createComputation',
    ...overrides,
});

export const __emptySourceMap__ = toDecodedMap(new GenMapping());

export const __emptyTraceMap__ = new TraceMap(__emptySourceMap__);

/**
 *
 * Creates `preprocess` function result with empty filled properties (like `errors` are just an empty array and `sourceMap` is an empty source map).
 *
 * @returns An imitation of `preprocess` function call.
 *
 *
 */
export const mockPreprocessResult = (overrides: Partial<PreprocessResult>): PreprocessResult => ({
    code: '',

    sourceMap: __emptySourceMap__,

    errors: [],

    labels: {},
    identifiers: new Set(),

    runtimeApiNames: overrides.runtimeApiNames ?? mockRuntimeApiNames({}),

    ...overrides,
});

/**
 * Generates `node` from AST to TSX.
 *
 * @param node node to be generated.
 */
export const generate = (node: Node): string =>
    print<Node>(node, Object.assign({}, ts(), tsx()) as Visitors<Node>, {
        indent: '',
    }).code;

/**
 * @return `transform` {@link ErrorContext} object
 */
export const mockErrorContext = (overrides: Partial<ErrorContext>): ErrorContext => ({
    errors: [],
    traceMap: __emptyTraceMap__,
    lineIndexes: [],
    ...overrides,
});

/**
 * @returns The first parsed expression or statement.
 */
export const mockParse = (source: string): Statement | Expression => {
    const statement = parseSync('', source, { lang: 'tsx', preserveParens: false }).program.body[0];

    return statement.type === 'ExpressionStatement' ? statement.expression : statement;
};
