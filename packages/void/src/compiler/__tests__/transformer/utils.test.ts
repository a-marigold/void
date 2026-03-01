import { describe, it, expect } from 'bun:test';

import * as types from '@babel/types';

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
 * @param keywordName Keyword, `create declarator` function of which will be tested.
 */
const testCreateDeclarator = (
    declaratorCreator:
        | typeof createSignalDeclarator
        | typeof createComputationDeclarator,

    keywordName: VoidKeyword,
) => {
    it('should throw CompileError instance if `originalIdentifier` argument is an array or object pattern or just is not an `Identifier`', () => {
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
                compileErrors.KEYWORD_DESTRUCTURING(keywordName),
            );
        }
    });

    it('should throw CompileError instance if ', () => {});
};

describe('createSignalDeclarator', () => {
    testCreateDeclarator(createSignalDeclarator, 'signal');
});

describe('createComputationDeclarator', () => {
    testCreateDeclarator(createComputationDeclarator, 'computation');
});
