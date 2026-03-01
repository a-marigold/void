import { describe, it, expect } from 'bun:test';

import * as types from '@babel/types';

import { generate } from '@babel/generator';

import {
    createSignalDeclarator,
    createComputationDeclarator,
} from '../../transformer/utils';

import type { VoidKeyword } from '../../types';

import { CompileError, compileErrors } from '../../errors';

/**
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
                declaratorCreator(
                    types.arrayPattern([types.identifier('abc')]),

                    types.identifier(''),

                    new Map(),
                );
            } catch (error) {
                expect(error).toBeInstanceOf(CompileError);

                expect((error as CompileError).message).toBe(
                    compileErrors.REACTIVE_DESTCRUCTURING(keyword),
                );
            }
        },
    );

    it.serial(
        'should throw CompileError instance if `initialValue` is undefined',
        () => {
            expect.assertions(2);

            try {
                declaratorCreator(types.identifier(''), undefined, new Map());
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

    it('should meet name of `originalIdentifier` and `initialValue`, `runtimeApiNames` arguments', () => {
        const signalIdentifierName = '_$signality';
        const initialValueIdentifierName = 'initi';
        const signalRuntimeApiName = 'cbcsbc';

        const generated: string = generate(
            createSignalDeclarator(
                types.identifier(signalIdentifierName),

                types.identifier(initialValueIdentifierName),
                new Map([['Signal', signalRuntimeApiName]]),
            ),
        ).code;

        expect(generated).toInclude(signalIdentifierName);
        expect(generated).toInclude(initialValueIdentifierName);
        expect(generated).toInclude(signalRuntimeApiName);

        expect(generated).toMatchInlineSnapshot(`
          "_$signality: cbcsbc = {
            "subscribers": new Set(),
            "value": initi
          }"
        `);
    });
});

describe('createComputationDeclarator', () => {
    testCreateDeclarator(createComputationDeclarator, 'computation');
});
