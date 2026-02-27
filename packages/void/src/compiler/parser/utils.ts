import type { Binding } from '@babel/traverse';
import * as types from '@babel/types';
import type {
    VariableDeclarator,
    TSTypeAnnotation,
    CallExpression,
} from '@babel/types';

import type { PreprocessResult } from '../preprocessor';
import type { RuntimeApiName } from '../types';

import { CompileError, compileErrors } from '../errors';

/**
 *
 * #### Creates variable declarator for `signal` identifier from original identifier and original initial value.
 *
 * @param originalIdentifier Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}
 *
 * @throws `CompileError` if `originalIdentifier.type !== 'Identifier'`.
 * @returns `VariableDeclarator` for `babel` AST.
 *
 */
export const createSignalDeclarator = (
    originalIdentifier: types.VariableDeclarator['id'],
    initialValue: types.VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator => {
    if (!initialValue) {
        throw new CompileError(
            compileErrors.KEYWORD_WITHOUT_INITIAL_VALUE('signal'),

            0,

            0,
        );
    }

    if (originalIdentifier.type !== 'Identifier') {
        throw new CompileError(
            compileErrors.KEYWORD_DESTRUCTURING('signal'),

            0,

            0,
        );
    }

    const identifier = types.identifier(originalIdentifier.name);

    const originalTSType = (
        originalIdentifier.typeAnnotation as TSTypeAnnotation | undefined
    )?.typeAnnotation; // assertion is not dangerous because `void-js` supports only typescript

    identifier.typeAnnotation = types.tsTypeAnnotation(
        types.tsTypeReference(
            types.identifier(runtimeApiNames.get('Signal') as string),

            originalTSType &&
                types.tsTypeParameterInstantiation([originalTSType]),
        ),
    );

    return types.variableDeclarator(
        identifier,

        types.objectExpression([
            types.objectProperty(
                types.stringLiteral('subscribers'),

                types.newExpression(types.identifier('Set'), []),
            ),

            types.objectProperty(
                types.stringLiteral('value'),

                types.cloneNode(initialValue),
            ),
        ]),
    );
};

/**
 *
 * #### Creates `VariableDeclarator` for `computation` from original identifier and initial value (that is a function for `computation`).
 *
 * @param originalIdentifier Identifier of `computation`.
 * @param initialValue Initial value of `computation` (usually that is a function).
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames} from preprocessor.
 *
 * @throws `CompileError` if `originalIdentifier.type !== 'Identifier'`.
 * @returns `VariableDeclaration` for `babel` AST.
 */
export const createComputationDeclarator = (
    originalIdentifier: VariableDeclarator['id'],
    initialValue: VariableDeclarator['init'],

    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator => {
    if (!initialValue) {
        throw new CompileError(
            compileErrors.KEYWORD_WITHOUT_INITIAL_VALUE('computation'),
            0,
            0,
        );
    }

    if (originalIdentifier.type !== 'Identifier') {
        throw new CompileError(
            compileErrors.KEYWORD_DESTRUCTURING('computation'),

            0,

            0,
        );
    }

    const originalTsType = (
        originalIdentifier.typeAnnotation as TSTypeAnnotation | undefined
    )?.typeAnnotation;

    const createComputationCall = types.callExpression(
        types.identifier(runtimeApiNames.get('createComputation') as string),
        [types.cloneNode(initialValue)],
    );

    createComputationCall.typeParameters =
        originalTsType &&
        types.tsTypeParameterInstantiation([types.cloneNode(originalTsType)]);

    return types.variableDeclarator(
        types.identifier(originalIdentifier.name),
        createComputationCall,
    );
};

/**
 *
 * #### Replaces all the updates of `signal` identifier with `void-js` reactivity API calls.
 * #### Does not replace reading of `signal` identifier.
 *
 * @param binding `babel` AST Binding of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 *
 */
export const replaceSignalUpdates = (
    binding: Binding,

    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
    const signalIdentifierName = binding.identifier.name;

    const updates = binding.constantViolations;

    const updatesLength = updates.length;
    let updateIndex = 0;

    while (updateIndex < updatesLength) {
        const currentUpdate = updates[updateIndex];

        const updateNode = currentUpdate.node;

        if (updateNode.type === 'AssignmentExpression') {
            currentUpdate.replaceWith(
                types.callExpression(
                    types.identifier(runtimeApiNames.get('setValue') as string),
                    [
                        types.identifier(signalIdentifierName),
                        types.cloneNode(updateNode.right),
                    ],
                ),
            );
        } else if (updateNode.type === 'UpdateExpression') {
            /**
             *
             * `UpdateExpression.prefix` means is it a pre-increment or post-increment.
             *
             * There is `postSetValue` for post-increment in `void-js` reactivity API, that is why this variable is needed.
             */
            const setterName: RuntimeApiName = updateNode.prefix
                ? 'setValue'
                : 'postSetValue';

            /**
             *
             *
             * Can be only `+` or `-` because `UpdateExpression.operator` is always `++` or `--`.
             */
            const operator = updateNode.operator[0] as '+' | '-';

            currentUpdate.replaceWith(
                types.callExpression(
                    types.identifier(runtimeApiNames.get(setterName) as string),
                    [
                        createSignalReading(),
                        types.binaryExpression(
                            operator,
                            types.identifier(signalIdentifierName),
                            types.numericLiteral(1),
                        ),
                    ],
                ),
            );
            currentUpdate.skip();
        }

        updateIndex++;
    }
};

/**
 *
 *
 *
 * @param binding
 * @param runtimeApiNames
 */
export const replaceSignalReading = (
    binding: Binding,
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
    const signalIdentifier = binding.identifier;

    const readings = binding.referencePaths;
    const readingsLength = readings.length;

    let readingIndex = 0;

    while (readingIndex < readingsLength) {
        const currentReading = readings[readingIndex];
        const pathParent = currentReading.parent;

        if (pathParent.type === 'CallExpression') {
            const callee = pathParent.callee;
            if (
                callee.type === 'Identifier' &&
                (callee.name === runtimeApiNames.get('setValue') ||
                    callee.name === runtimeApiNames.get('postSetValue')) &&
                pathParent.arguments[0] === currentReading
            ) {
                readingIndex++;

                continue;
            }
        }

        currentReading.replaceWith(
            types.callExpression(
                types.identifier(runtimeApiNames.get('getValue') as string),

                [types.identifier(signalIdentifier.name)],
            ),
        );

        readingIndex++;
    }
};

/**
 *
 *
 * #### Returns `CallExpression` object with `getValue` from `void-js` reactivity API as callee and `signalIdentifierName` as argument (something like (`getValue(signalIdentifierName)`)).
 *
 * @param signalIdentifierName Name of `signal` identifier.
 *
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 *
 * @returns `CallExpression` object for `babel` AST.
 *
 * @example
 *
 * ```typescript
 * createSignalReading('name', new Map([['getValue', '_$gt']]));
 * ```
 *
 * Returns something like this:
 *
 * ```typescript
 * _$gt(name);
 * ```
 */
const createSignalReading = (
    signalIdentifierName: string,

    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): CallExpression => {
    return types.callExpression(
        types.identifier(runtimeApiNames.get('getValue') as string),

        [types.identifier(signalIdentifierName)],
    );
};
