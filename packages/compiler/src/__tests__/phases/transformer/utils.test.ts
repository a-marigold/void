import { describe, it, expect } from 'bun:test';

import MagicString from 'magic-string';
import { TraceMap, type EncodedSourceMap } from '@jridgewell/trace-mapping';

import type * as types from 'oxc-parser';

import * as nodes from '../../../phases/transformer/nodes';
import {
    createSignalDeclarator,
    createComputationDeclarator,
    createReactiveReading,
    createNodeCompileError,
    createSignalAssignment,
} from '../../../phases/transformer/utils';
import { CompileError } from '../../../errors';

import { generate, mockErrorContext, mockRuntimeApiNames } from './__testingUtils__';

import type { PreprocessResult } from '../../../phases/preprocessor';

describe('createSignalDeclarator', () => {
    it('should return a valid declarator of signal', () => {
        expect(
            generate(
                createSignalDeclarator(
                    mockErrorContext({}),
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

        const generated: string = generate(
            createSignalDeclarator(
                mockErrorContext({}),
                signalIdentifier,
                nodes.identifier(initialValueIdentifierName),
                mockRuntimeApiNames({ Signal: signalRuntimeApiName }),
            ) as types.VariableDeclarator,
        );

        expect(generated).toInclude(signalIdentifierName);
        expect(generated).toInclude(initialValueIdentifierName);

        expect(generated).toInclude(signalIdentifierType);
        expect(generated).toInclude(signalRuntimeApiName);

        expect(generated).toMatchInlineSnapshot(
            `"_$signality: cbcsbc<number> = { subscribers: new Set(), value: initi }"`,
        );
    });
});

describe('createComputationDeclarator', () => {
    it('should return valid `VariableDeclarator` of computation', () => {
        expect(
            generate(
                createComputationDeclarator(
                    mockErrorContext({}),
                    nodes.identifier('multiplied'),
                    nodes.identifier('computator1'),
                    mockRuntimeApiNames({}),
                ) as types.VariableDeclarator,
            ),
        ).toMatchInlineSnapshot(`"multiplied = L_$createComputation(computator1)"`);
    });

    it('should handle name, type of `originalIdentifier` and `initialValue` argument', () => {
        const computationIdentifierName = '_$multiplied_computation';

        const computationIdentifierType = 'number';

        const initialValueIdentifierName = 'computatorFunctionABCABAC';

        const computationRuntimeApiName = '_$CC';

        const computationIdentifier = nodes.identifier(
            computationIdentifierName,
            nodes.tsTypeAnnotation(
                nodes.tsTypeReference(nodes.identifier(computationIdentifierType), null),
            ),
        );

        const generated = generate(
            createComputationDeclarator(
                mockErrorContext({}),
                computationIdentifier,

                nodes.identifier(initialValueIdentifierName),
                mockRuntimeApiNames({
                    createComputation: computationRuntimeApiName,
                }),
            ) as types.VariableDeclarator,
        );

        expect(generated).toInclude(computationIdentifierName);

        expect(generated).toInclude(computationIdentifierType);

        expect(generated).toInclude(initialValueIdentifierName);

        expect(generated).toInclude(computationRuntimeApiName);

        expect(generated).toMatchInlineSnapshot(
            `"_$multiplied_computation = _$CC<number>(computatorFunctionABCABAC)"`,
        );
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

        expect(assignment.callee.type === 'Identifier' && assignment.callee.name).toBe(setValueN);
    });

    it('should return `setValue` with `value` as second argument if `operator` is `=`', () => {
        expect(
            generate(
                createSignalAssignment(new WeakSet(), '=', 'count', nodes.literal('16'), {
                    setValue: 'setv',
                } as PreprocessResult['runtimeApiNames']),
            ),
        ).toMatchInlineSnapshot(`"setv(count, '16')"`);
    });

    it('should return `setValue`, where second argument is with corresponding operator if `operator` is not just `=`', () => {
        expect(
            generate(
                createSignalAssignment(new WeakSet(), '+=', 'count', nodes.literal('16'), {
                    setValue: '_$sv',
                } as PreprocessResult['runtimeApiNames']),
            ),
        ).toMatchInlineSnapshot(`"_$sv(count, count + '16')"`);
        expect(
            generate(
                createSignalAssignment(new WeakSet(), '^=', 'count', nodes.literal('16'), {
                    setValue: '_$sv',
                } as PreprocessResult['runtimeApiNames']),
            ),
        ).toMatchInlineSnapshot(`"_$sv(count, count ^ '16')"`);
    });

    it('should handle logical assignment operators specially', () => {
        expect(
            generate(
                createSignalAssignment(new WeakSet(), '||=', 'count', nodes.literal('16'), {
                    setValue: '_$sv',
                } as PreprocessResult['runtimeApiNames']),
            ),
        ).toMatchInlineSnapshot(`"count || _$sv(count, '16')"`);

        expect(
            generate(
                createSignalAssignment(new WeakSet(), '&&=', 'count', nodes.literal('16'), {
                    setValue: '_$sv',
                } as PreprocessResult['runtimeApiNames']),
            ),
        ).toMatchInlineSnapshot(`"count && _$sv(count, '16')"`);

        expect(
            generate(
                createSignalAssignment(new WeakSet(), '??=', 'count', nodes.literal('16'), {
                    setValue: '_$sv',
                } as PreprocessResult['runtimeApiNames']),
            ),
        ).toMatchInlineSnapshot(`"count ?? _$sv(count, '16')"`);
    });
});

describe('createReactiveReading', () => {
    it('should return correct `CallExpression` node and include `reactiveIdentifierName` and getterName', () => {
        const reactiveIdentifierName = '_$$count';

        const getterName = '_$$get';

        const generated = generate(createReactiveReading(reactiveIdentifierName, getterName));

        expect(generated).toInclude(reactiveIdentifierName);
        expect(generated).toInclude(getterName);
        expect(generated).toMatchInlineSnapshot(`"_$$get(_$$count)"`);
    });
});

describe('createNodeCompileError', () => {
    it('should return CompileError instance with correct message and source positions', () => {
        const source = 'abcName';
        const message = '_error';

        const error = createNodeCompileError(
            mockErrorContext({
                traceMap: new TraceMap(new MagicString(source).generateMap() as EncodedSourceMap),
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
