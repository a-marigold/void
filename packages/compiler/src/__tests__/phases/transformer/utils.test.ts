import { describe, it, expect } from 'bun:test';

import { TraceMap, type EncodedSourceMap } from '@jridgewell/trace-mapping';
import MagicString from 'magic-string';
import type * as types from 'oxc-parser';

import { CompileError } from '../../../errors';
import type { PreprocessResult } from '../../../phases/preprocessor';
import * as nodes from '../../../phases/transformer/nodes';
import type { Scope } from '../../../phases/transformer/types';
import {
	createSignalDeclarator,
	createMemoDeclarator,
	createReactiveReading,
	createNodeCompileError,
	createSignalAssignment,
	findInScopes,
	createSignalUpdate,
	addPatternToScope,
} from '../../../phases/transformer/utils';

import { mockParse, mockGen, mockErrorContext, mockRuntimeApiNames } from './__testingUtils__';

describe('createSignalDeclarator', () => {
	it('should return a valid declarator of signal', () => {
		expect(
			mockGen(
				createSignalDeclarator(
					mockErrorContext(),
					nodes.identifier('count'),
					nodes.literal(16),
					mockRuntimeApiNames({ Signal: 'Signal' }),
				) as types.VariableDeclarator,
			),
		).toMatchInlineSnapshot(`"count: Signal = { subscribers: new Set(), value: 16 }"`);
	});

	it('should handle name, type of `originalIdentifier` and `initialValue` argument', () => {
		const signalIdentifierName = '_$signality';

		const signalIdentifierType = 'number';
		const initialValueIdentifierName = 'initi';
		const signalRuntimeApiName = 'cbcsbc';

		const signalIdentifier = nodes.identifier(
			signalIdentifierName,
			nodes.tsTypeAnnotation(
				nodes.tsTypeReference(nodes.identifier(signalIdentifierType), null),
			),
		);

		const generated: string = mockGen(
			createSignalDeclarator(
				mockErrorContext(),
				signalIdentifier,
				nodes.identifier(initialValueIdentifierName),
				mockRuntimeApiNames({ Signal: signalRuntimeApiName }),
			) as types.VariableDeclarator,
		);

		expect(generated).toInclude(signalIdentifierName);
		expect(generated).toInclude(initialValueIdentifierName);

		expect(generated).toInclude(signalIdentifierType);
		expect(generated).toInclude(signalRuntimeApiName);
	});
});

describe('createMemoDeclarator', () => {
	it('should return valid `VariableDeclarator` of memo', () => {
		expect(
			mockGen(
				createMemoDeclarator(
					mockErrorContext(),
					nodes.identifier('multiplied'),

					nodes.identifier('computator1'),
					mockRuntimeApiNames(),
				) as types.VariableDeclarator,
			),
		).toMatchInlineSnapshot(`"multiplied = _$createMemo(computator1)"`);
	});

	it('should handle name, type of `originalIdentifier` and `initialValue` argument', () => {
		const memoIdentifierName = '_$mem';

		const memoIdentifierType = 'number';

		const initialValueIdentifierName = 'computatorFunctionABCABAC';

		const memoRuntimeApiName = '_$CC';

		const memoIdentifier = nodes.identifier(
			memoIdentifierName,
			nodes.tsTypeAnnotation(
				nodes.tsTypeReference(nodes.identifier(memoIdentifierType), null),
			),
		);

		const generated = mockGen(
			createMemoDeclarator(
				mockErrorContext(),

				memoIdentifier,

				nodes.identifier(initialValueIdentifierName),

				mockRuntimeApiNames({
					createMemo: memoRuntimeApiName,
				}),
			) as types.VariableDeclarator,
		);
		expect(generated).toInclude(memoIdentifierName);

		expect(generated).toInclude(memoIdentifierType);

		expect(generated).toInclude(initialValueIdentifierName);

		expect(generated).toInclude(memoRuntimeApiName);
	});
});

describe('createSignalAssignment', () => {
	it('should return call of `setValue` from `runtimeApiNames` with `signalIdName` as first argument', () => {
		const setValueN = '_$sv';

		const assignment = createSignalAssignment(
			new WeakSet(),

			'=',

			'count',

			nodes.literal('16'),

			{
				setValue: setValueN,
			} as PreprocessResult['runtimeApiNames'],
		) as types.CallExpression;

		expect(assignment.callee.type === 'Identifier' && assignment.callee.name).toBe(
			setValueN,
		);
	});

	it('should return `setValue` with `value` as second argument if `operator` is `=`', () => {
		expect(
			mockGen(
				createSignalAssignment(
					new WeakSet(),
					'=',
					'count',
					nodes.literal('16'),
					{
						setValue: 'setv',
					} as PreprocessResult['runtimeApiNames'],
				),
			),
		).toMatchInlineSnapshot(`"setv(count, '16')"`);
	});

	it('should return `setValue`, where second argument is with corresponding operator if `operator` is not just `=`', () => {
		expect(
			mockGen(
				createSignalAssignment(
					new WeakSet(),
					'+=',
					'count',
					nodes.literal('16'),
					{
						setValue: '_$sv',
					} as PreprocessResult['runtimeApiNames'],
				),
			),
		).toMatchInlineSnapshot(`"_$sv(count, count + '16')"`);
		expect(
			mockGen(
				createSignalAssignment(
					new WeakSet(),
					'^=',
					'count',
					nodes.literal('16'),
					{
						setValue: '_$sv',
					} as PreprocessResult['runtimeApiNames'],
				),
			),
		).toMatchInlineSnapshot(`"_$sv(count, count ^ '16')"`);
	});

	it('should handle logical assignment operators specially', () => {
		const runtimeApiNames = {
			setValue: '_$sv',
		} as PreprocessResult['runtimeApiNames'];

		expect(
			mockGen(
				createSignalAssignment(
					new WeakSet(),
					'||=',
					'count',
					nodes.literal('16'),
					runtimeApiNames,
				),
			),
		).toMatchInlineSnapshot(`"count || _$sv(count, '16')"`);

		expect(
			mockGen(
				createSignalAssignment(
					new WeakSet(),
					'&&=',
					'count',
					nodes.literal('16'),

					runtimeApiNames,
				),
			),
		).toMatchInlineSnapshot(`"count && _$sv(count, '16')"`);

		expect(
			mockGen(
				createSignalAssignment(
					new WeakSet(),

					'??=',

					'count',

					nodes.literal('16'),

					runtimeApiNames,
				),
			),
		).toMatchInlineSnapshot(`"count ?? _$sv(count, '16')"`);
	});
});

describe('createReactiveReading', () => {
	it('should return correct `CallExpression` node and include `reactiveIdentifierName` and getterName', () => {
		const reactiveIdentifierName = '_$$count';

		const getterName = '_$$get';

		const generated = mockGen(
			createReactiveReading(reactiveIdentifierName, getterName),
		);

		expect(generated).toInclude(reactiveIdentifierName);

		expect(generated).toInclude(getterName);

		expect(generated).toMatchInlineSnapshot(`"_$$get(_$$count)"`);
	});
});

describe('createSignalUpdate', () => {
	it('should return expression corresponding to `prefix` arg', () => {
		const runtimeApiNames = {
			setValue: 'PRE',

			postSetValue: 'POST',
		} as PreprocessResult['runtimeApiNames'];

		expect(
			mockGen(createSignalUpdate('count', '++', true, runtimeApiNames)),
		).toMatchInlineSnapshot(`"PRE(count, count + 1)"`);

		expect(
			mockGen(createSignalUpdate('count', '--', false, runtimeApiNames)),
		).toMatchInlineSnapshot(`"POST(count, count - 1)"`);
	});
});

describe('addPatternToScope', () => {
	it('should handle identifires correctly', () => {
		const scope: Scope = new Map();

		addPatternToScope(
			mockParse('obje') as types.IdentifierName,

			scope,

			0,
		);

		expect(scope.size).toBe(1);
	});

	it('should handle object patterns correctly', () => {
		const scope: Scope = new Map();

		addPatternToScope(
			(
				mockParse(
					'({ a: b, c: { d: e }, f } = { a: 16, c: { d: 16 }, f: 170 })',
				) as types.AssignmentExpression
			).left as types.BindingPattern,

			scope,

			0,
		);

		expect(scope.size).toBe(3);
	});

	it('should handle array patterns correctly', () => {
		const scope: Scope = new Map();

		addPatternToScope(
			(
				mockParse(
					'([ a, b ] = { a: 16, c: { d: 16 }, f: 170 })',
				) as types.AssignmentExpression
			).left as types.BindingPattern,

			scope,

			0,
		);

		expect(scope.size).toBe(2);
	});

	it('should handle default values in patterns correctly', () => {
		const scope: Scope = new Map();

		addPatternToScope(
			(
				mockParse(
					'({ a = 16, arr: [ b = 16, c ]} = { a: 0, arr: [ 0, 0 ], })',
				) as types.AssignmentExpression
			).left as types.BindingPattern,
			scope,
			0,
		);

		expect(scope.size).toBe(3);
	});
});

describe('find in scopes', () => {
	it('should work correctly when identifier is on the top of stack', () => {
		expect(
			findInScopes('a', [
				new Map([
					['a', 1],
					['b', 0],
				]),
			]),
		).toBe(1);
	});

	it('should work correctly when identifier is in the deep of stack', () => {
		expect(
			findInScopes('a', [
				new Map([
					['a', 1],
					['b', 0],
				]),

				new Map([['c', 0]]),
				new Map(),
			]),
		).toBe(1);
	});

	it('should return undefined if identifier is not found', () => {
		expect(
			findInScopes('a', [
				new Map([['b', 0]]),
				new Map([['c', 0]]),
				new Map([
					['d', 1],
					['e', 0],
				]),
				new Map([]),
			]),
		).toBe(undefined);
	});

	it('should return the first appeared identifier that suits `name` argument (shadowing)', () => {
		expect(
			findInScopes('a', [
				new Map([['a', 0]]),
				new Map([['a', 0]]),
				new Map([
					['a', 1],
					['b', 0],
				]),
				new Map([]),
			]),
		).toBe(1);
	});
});

describe('createNodeCompileError', () => {
	it('should return CompileError instance with correct message and source positions', () => {
		const source = 'abcName';
		const message = '_error';

		const error = createNodeCompileError(
			mockErrorContext({
				traceMap: new TraceMap(
					new MagicString(source).generateMap() as EncodedSourceMap,
				),
			}),

			message,
			0,
			source.length,
		);

		expect(error).toBeInstanceOf(CompileError);

		expect(error.message).toBe(message);

		expect(error.line).toBe(1);
		expect(error.start).toBe(0);
		expect(error.end).toBe(0);
	});
});
