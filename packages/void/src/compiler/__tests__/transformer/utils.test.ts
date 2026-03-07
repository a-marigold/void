import { describe, it, expect } from 'bun:test';

import * as types from '@babel/types';

import { generate } from '@babel/generator';
import MagicString from 'magic-string';
import { TraceMap, type EncodedSourceMap } from '@jridgewell/trace-mapping';

import {
    createSignalDeclarator,
    createComputationDeclarator,
    createReactiveReading,
    createCompileErrorFromNode,
} from '../../transformer/utils';

import type { VoidKeyword } from '../../types';

import { CompileError, compileErrors } from '../../errors';

import { __emptyTraceMap__, createEmptyNodeLocation } from './__testingUtils__';

/**
 *
 *
 * @param declaratorCreator {@link createSignalDeclarator} or {@link createComputationDeclarator}.
 *
 * @param keyword Keyword, `create declarator` function of which will be tested.
 */

const testCreateDeclarator = (
    declaratorCreator:
        | typeof createSignalDeclarator
        | typeof createComputationDeclarator,
    keyword: VoidKeyword,
) => {
    it.serial(
        'should throw CompileError instance if `originalIdentifier` argument is an array or object pattern or just is not an `Identifier`',
        () => {
            expect.assertions(2);

            try {
                const originalIdentifier = types.arrayPattern([
                    types.identifier('abc'),
                ]);
                originalIdentifier.loc = createEmptyNodeLocation();

                declaratorCreator(
                    __emptyTraceMap__,
                    originalIdentifier,

                    types.identifier(''),

                    new Map(),
                );
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);

                expect((error as CompileError).message).toBe(
                    compileErrors.REACTIVE_DESTRUCTURING(keyword),
                );
            }
        },
    );

    it.serial(
        'should throw CompileError instance if `initialValue` is undefined',
        () => {
            expect.assertions(2);

            try {
                const originalIdentifier = types.identifier('');
                originalIdentifier.loc = createEmptyNodeLocation();

                declaratorCreator(
                    __emptyTraceMap__,
                    originalIdentifier,
                    undefined,
                    new Map(),
                );
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);
                expect((error as CompileError).message).toBe(
                    compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE(keyword),
                );
            }
        },
    );
};

describe('createSignalDeclarator', () => {
    testCreateDeclarator(createSignalDeclarator, 'signal');

    it('should return a valid declarator of signal', () => {
        expect(
            generate(
                createSignalDeclarator(
                    __emptyTraceMap__,
                    types.identifier('count'),
                    types.numericLiteral(16),

                    new Map([['Signal', 'Signal']]),
                ),
            ).code,
        ).toMatchInlineSnapshot(`
          "count: Signal = {
            "subscribers": new Set(),
            "value": 16
          }"
        `);
    });

    it('should handle name, type of `originalIdentifier` and `initialValue`, `runtimeApiNames` arguments', () => {
        const signalIdentifierName = '_$signality';

        const signalIdentifierType = 'number';
        const initialValueIdentifierName = 'initi';

        const signalRuntimeApiName = 'cbcsbc';

        const signalIdentifier = types.identifier(signalIdentifierName);
        signalIdentifier.typeAnnotation = types.tsTypeAnnotation(
            types.tsTypeReference(types.identifier(signalIdentifierType)),
        );

        const generated: string = generate(
            createSignalDeclarator(
                __emptyTraceMap__,

                signalIdentifier,

                types.identifier(initialValueIdentifierName),
                new Map([['Signal', signalRuntimeApiName]]),
            ),
        ).code;

        expect(generated).toInclude(signalIdentifierName);

        expect(generated).toInclude(initialValueIdentifierName);

        expect(generated).toInclude(signalIdentifierType);

        expect(generated).toInclude(signalRuntimeApiName);

        expect(generated).toMatchInlineSnapshot(`
          "_$signality: cbcsbc<number> = {
            "subscribers": new Set(),
            "value": initi
          }"
        `);
    });
});

describe('createComputationDeclarator', () => {
    testCreateDeclarator(createComputationDeclarator, 'computation');

    it('should return valid variable declarator of computation', () => {
        expect(
            generate(
                createComputationDeclarator(
                    __emptyTraceMap__,

                    types.identifier('multiplied'),

                    types.identifier('computatorFunction'),

                    new Map([['createComputation', 'createComputation']]),
                ),
            ).code,
        ).toMatchInlineSnapshot(
            `"multiplied = createComputation(computatorFunction)"`,
        );
    });

    it('should handle name, type of `originalIdentifier` and `initialValue`, `runtimeApiNames` arguments', () => {
        const computationIdentifierName = '_$multiplied_computation';

        const computationIdentifierType = 'number';

        const initialValueIdentifierName = 'computatorFunctionABCABAC';

        const computationRuntimeApiName = '_$CC';
        const computationIdentifier = types.identifier(
            computationIdentifierName,
        );

        computationIdentifier.typeAnnotation = types.tsTypeAnnotation(
            types.tsTypeReference(types.identifier(computationIdentifierType)),
        );

        const generated: string = generate(
            createComputationDeclarator(
                __emptyTraceMap__,
                computationIdentifier,

                types.identifier(initialValueIdentifierName),
                new Map([['createComputation', computationRuntimeApiName]]),
            ),
        ).code;

        expect(generated).toInclude(computationIdentifierName);

        expect(generated).toInclude(computationIdentifierType);
        expect(generated).toInclude(initialValueIdentifierName);

        expect(generated).toInclude(computationRuntimeApiName);

        expect(generated).toMatchInlineSnapshot(
            `"_$multiplied_computation = _$CC<number>(computatorFunctionABCABAC)"`,
        );
    });
});

describe('createReactiveReading', () => {
    it('should return correct `CallExpression` node and include `reactiveIdentifierName` and getterName', () => {
        const reactiveIdentifierName = '_$$$$count';
        const getterName = '_$$$$$$get';

        const generated = generate(
            createReactiveReading(reactiveIdentifierName, getterName),
        ).code;

        expect(generated).toInclude(reactiveIdentifierName);
        expect(generated).toInclude(getterName);

        expect(generated).toMatchInlineSnapshot(`"_$$$$$$get(_$$$$count)"`);
    });
});

describe('createCompileErrorFromNode', () => {
    it('should return CompileError instance with correct positions', () => {
        const sourceMap = new MagicString('abc').generateMap();
        const traceMap = new TraceMap(sourceMap as EncodedSourceMap);

        const message = 'err';

        const error = createCompileErrorFromNode(traceMap, message, {
            start: { line: 1, column: 0, index: 1 },

            end: { line: 1, column: 3, index: 1 },
            filename: '',
            identifierName: '',
        });

        expect(error).toBeInstanceOf(CompileError);

        expect(error.message).toBe(message);

        expect(error.line).toBe(1);

        expect(error.start).toBe(0);

        expect(error.end).toBe(19 - 16);
    });
});
