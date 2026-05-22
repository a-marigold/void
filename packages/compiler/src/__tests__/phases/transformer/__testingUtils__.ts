import { GenMapping, toDecodedMap } from '@jridgewell/gen-mapping';
import { TraceMap } from '@jridgewell/trace-mapping';
import { print } from 'esrap';
import type { Visitors } from 'esrap';
import ts from 'esrap/languages/ts';
import tsx from 'esrap/languages/tsx';
import { parseSync } from 'oxc-parser';
import type { Node, Statement, Expression, ParserOptions } from 'oxc-parser';

import type { PreprocessResult } from '../../../phases/preprocessor';
import type { TransformContext } from '../../../phases/transformer/types';
import type { CompileContext } from '../../../types';

/**
 *
 * Used to imitate results from preprocessor in transformer tests.
 *
 * @returns {Map} {@link PreprocessResult.runtimeApiNames} with unique runtime API names as if it was created by preprocessor.
 */

export const mockRuntimeApiNames = (): PreprocessResult['runtimeApiNames'] => ({
	getValue: '_$getValue',
	setValue: '_$setValue',
	postSetValue: '_$postSetValue',
	createEffect: '_$createEffect',
	createMemo: '_$createMemo',
	computeMemo: '_$computeMemo',
	insert: '_$insert',
	mergeAttrs: '_$mergeAttrs',
	$ClickHandler: '_$ClickHandler',
	$PointerDownHandler: '_$PointerDownHandler',
	$PointerUpHandler: '_$PointerUpHandler',
	$InputHandler: '_$InputHandler',
	$ChangeHandler: '_$ChangeHandler',
	$KeyDownHandler: '_$KeyDownHandler',
	$KeyUpHandler: '_$KeyUpHandler',
	$SubmitHandler: '_$SubmitHandler',
	Signal: '_$Signal',
});

export const __emptySourceMap__ = toDecodedMap(new GenMapping());

export const __emptyTraceMap__ = new TraceMap(__emptySourceMap__);

/**
 *
 *
 * Creates `preprocess` function result with empty filled properties (like `errors` are just an empty array and `sourceMap` is an empty source map).
 *
 * @returns An imitation of `preprocess` function call.
 */

export const mockPreprocessResult = (overrides?: Partial<PreprocessResult>): PreprocessResult => ({
	code: '',
	sourceMap: __emptySourceMap__,
	errors: [],
	labels: {},
	identifiers: new Set(),
	runtimeApiNames: overrides?.runtimeApiNames ?? mockRuntimeApiNames(),

	...overrides,
});

const __mockParseOptions__: ParserOptions = { lang: 'tsx', preserveParens: false };
/**
 *
 *  @param source
 *
 * @returns If there is an `ExpressionStatement` in the first line of `source`, its `expression` is returned. Otherwise the statement in the first line is returned.
 */

export const mockParse = (source: string): Statement | Expression => {
	const statement = parseSync('', source, __mockParseOptions__).program.body[0];

	return statement.type === 'ExpressionStatement' ? statement.expression : statement;
};

const __mockGenEsrapVisitors__ = Object.assign({}, ts(), tsx());
/**
 * Generates `node` from AST to TSX.
 *
 * @param node node to be generated.
 */
export const mockGen = (node: Node): string =>
	print<Node>(node, __mockGenEsrapVisitors__ as Visitors<Node>, {
		indent: '',
	}).code;

/**
 *
 * {@link TransformContext.isFirstVarDeclaration} is set to `false`,
 * because it is used only in utils when this flag is not needed.
 *
 * Override the flag to change it.
 *
 * @returns {TransformContext} {@link TransformContext}.
 */
export const mockTransformContext = (overrides?: Partial<TransformContext>): TransformContext => ({
	lastLabel: '',
	isFirstVarDeclaration: false,
	scopeStack: [],
	fnScopeCount: 0,
	componentFnScope: -1,
	programBody: [],
	componentBody: null,
	visitedReactives: new WeakSet(),
	errors: [],

	traceMap: __emptyTraceMap__,
	lineIndexes: [],

	...overrides,
});

/**
 * @returns {CompileContext} Imitated {@link CompileContext} with valid values.
 */
export const mockCompileContext = (overrides?: Partial<CompileContext>): CompileContext => ({
	globalDelegatedEvents: overrides?.globalDelegatedEvents ?? new Set(),
});
