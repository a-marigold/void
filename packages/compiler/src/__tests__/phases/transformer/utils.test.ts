import { describe, it, expect } from 'bun:test';

import { GenMapping, toDecodedMap } from '@jridgewell/gen-mapping';
import { TraceMap } from '@jridgewell/trace-mapping';
import type * as types from 'oxc-parser';

import type { CompileError } from '../../../errors';
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

import { mockParse, mockGen, mockTransformContext } from './__testingUtils__';

describe('createSignalDeclarator', () => {
	it('should return a valid declarator of signal', () => {
		expect(
			mockGen(
				createSignalDeclarator(
					nodes.identifier('count'),
					nodes.literal(16),
					mockTransformContext(),
				) as types.VariableDeclarator,
			),
		).toMatchInlineSnapshot(`"count = { subscribers: new Set(), value: 16 }"`);
	});

	it('should include name and `initialValue` of signal', () => {
		const signalIdentifierName = '';

		const initialValueIdentifierName = 'initi';

		const signalIdentifier = nodes.identifier(signalIdentifierName);

		const generated = mockGen(
			createSignalDeclarator(
				signalIdentifier,
				nodes.identifier(initialValueIdentifierName),

				mockTransformContext(),
			) as types.VariableDeclarator,
		);

		expect(generated).toInclude(signalIdentifierName);
		expect(generated).toInclude(initialValueIdentifierName);
	});
});

describe('createMemoDeclarator', () => {
	it('should return valid `VariableDeclarator` of memo', () => {
		expect(
			mockGen(
				createMemoDeclarator(
					nodes.identifier('multiplied'),
					nodes.identifier('computator1'),
					mockTransformContext(),
					'_$createMemo',
				) as types.VariableDeclarator,
			),
		).toMatchInlineSnapshot(`"multiplied = _$createMemo(computator1)"`);
	});

	it('should include name and `initialValue` of memo', () => {
		const memoIdentifierName = '_$mem';

		const initialValueIdentifierName = 'someFn';

		const createMemoName = '_$CC';

		const memoIdentifier = nodes.identifier(memoIdentifierName);

		const generated = mockGen(
			createMemoDeclarator(
				memoIdentifier,
				nodes.identifier(initialValueIdentifierName),
				mockTransformContext(),
				createMemoName,
			) as types.VariableDeclarator,
		);

		expect(generated).toInclude(memoIdentifierName);

		expect(generated).toInclude(initialValueIdentifierName);
		expect(generated).toInclude(createMemoName);
	});
});

describe('createSignalAssignment', () => {
	it('should return call of `setValue` from `runtimeApiNames` with `signalIdName` as first argument', () => {
		const setValueName = '_$sv';

		const assignment = createSignalAssignment(
			'=',
			'count',
			nodes.literal('16'),
			setValueName,
			new WeakSet(),
		) as types.CallExpression;
		expect(assignment.callee.type === 'Identifier' && assignment.callee.name).toBe(
			setValueName,
		);
	});

	it('should return `setValue` with `value` as second argument if `operator` is `=`', () => {
		expect(
			mockGen(
				createSignalAssignment(
					'=',
					'count',
					nodes.literal('16'),

					'setv',

					new WeakSet(),
				),
			),
		).toMatchInlineSnapshot(`"setv(count, '16')"`);
	});

	it('should return `setValue`, where second argument is with corresponding operator if `operator` is not just `=`', () => {
		expect(
			mockGen(
				createSignalAssignment(
					'+=',

					'count',

					nodes.literal('16'),

					'_$sv',

					new WeakSet(),
				),
			),
		).toMatchInlineSnapshot(`"_$sv(count, count + '16')"`);
		expect(
			mockGen(
				createSignalAssignment(
					'^=',
					'count',
					nodes.literal('16'),
					'_$sv',
					new WeakSet(),
				),
			),
		).toMatchInlineSnapshot(`"_$sv(count, count ^ '16')"`);
	});

	it('should handle logical assignment operators specially', () => {
		expect(
			mockGen(
				createSignalAssignment(
					'||=',
					'count',
					nodes.literal('16'),
					'_$sv',
					new WeakSet(),
				),
			),
		).toMatchInlineSnapshot(`"count || _$sv(count, '16')"`);

		expect(
			mockGen(
				createSignalAssignment(
					'&&=',
					'count',
					nodes.literal('16'),
					'_$sv',
					new WeakSet(),
				),
			),
		).toMatchInlineSnapshot(`"count && _$sv(count, '16')"`);

		expect(
			mockGen(
				createSignalAssignment(
					'??=',
					'count',
					nodes.literal('16'),
					'_$sv',
					new WeakSet(),
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

// TODO: fix positions in errors
describe.todo('createNodeCompileError', () => {
	it('should return CompileError with correct message and source positions', () => {
		const errorPart = '{ a }';
		const source = `;signalLabel;let ${errorPart} = { a: 16 };`;

		const errorPartStartIndex = source.indexOf(errorPart);
		const errorPartEndIndex = source.indexOf(errorPart);

		const message: CompileError['message'] =
			"Cannot declare 'signal' by using destructuring.";

		const error = createNodeCompileError(
			message,
			errorPartStartIndex,
			errorPartEndIndex,
			mockTransformContext({
				traceMap: new TraceMap(toDecodedMap(new GenMapping())),
				lineIndexes: [],
			}),
		);

		expect(error.message).toBe(message);

		expect(error.startLoc.line).toBe(1);
		expect(error.startLoc.column).toBe(errorPartStartIndex);

		expect(error.endLoc.line).toBe(1);
		expect(error.endLoc.column).toBe(errorPartEndIndex);
	});
});
