import type { Binding } from '@babel/traverse';
import * as types from '@babel/types';
import type {
    VariableDeclarator,
    TSTypeAnnotation,
    CallExpression,
    BinaryExpression,
    LogicalExpression,
    Expression,
} from '@babel/types';

import { LOGICAL_OPERATORS } from './constants';

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
            compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE('signal'),
            0,
            0,
        );
    }

    if (originalIdentifier.type !== 'Identifier') {
        throw new CompileError(
            compileErrors.REACTIVE_DESTCRUCTURING('signal'),
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
            compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE('computation'),
            0,
            0,
        );
    }

    if (originalIdentifier.type !== 'Identifier') {
        throw new CompileError(
            compileErrors.REACTIVE_DESTCRUCTURING('computation'),

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
 * #### Replaces all the updates and mutations of `signal` identifier with `void-js` reactivity API calls.
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
    const getterName = runtimeApiNames.get('getValue') as string;
    const setterName = runtimeApiNames.get('setValue') as string;

    const updates = binding.constantViolations;
    const updatesLength = updates.length;

    let updateIndex = 0;

    while (updateIndex < updatesLength) {
        const currentUpdate = updates[updateIndex];

        const updateNode = currentUpdate.node;

        if (updateNode.type === 'AssignmentExpression') {
            let operator: string = '';

            const nodeOperator = updateNode.operator;

            let operatorIndex = 0;
            while (nodeOperator[operatorIndex] !== '=') {
                operator += nodeOperator[operatorIndex];
                operatorIndex++;
            }

            let newSignalValue: Expression;

            if (
                LOGICAL_OPERATORS.has(operator as LogicalExpression['operator'])
            ) {
                newSignalValue = types.logicalExpression(
                    operator as LogicalExpression['operator'],
                    createReactiveReading(
                        signalIdentifierName,
                        runtimeApiNames.get('getValue') as string,
                    ),
                    types.cloneNode(updateNode.right),
                );
            } else if (operator) {
                newSignalValue = types.binaryExpression(
                    operator as BinaryExpression['operator'],
                    createReactiveReading(signalIdentifierName, getterName),
                    types.cloneNode(updateNode.right),
                );
            } else {
                newSignalValue = types.cloneNode(updateNode.right);
            }

            currentUpdate.replaceWith(
                types.callExpression(types.identifier(setterName), [
                    types.identifier(signalIdentifierName),
                    newSignalValue,
                ]),
            );
        } else if (updateNode.type === 'UpdateExpression') {
            /**
             *
             * `UpdateExpression.prefix` means is it a pre-increment or post-increment.
             *
             * There is `postSetValue` for post-increment in `void-js` reactivity API, that is why this variable is needed.
             */
            const updateSetterName: RuntimeApiName = updateNode.prefix
                ? 'setValue'
                : 'postSetValue';

            const operator = updateNode.operator === '++' ? '+' : '-';

            currentUpdate.replaceWith(
                types.callExpression(
                    types.identifier(
                        runtimeApiNames.get(updateSetterName) as string,
                    ),
                    [
                        types.identifier(signalIdentifierName),
                        types.binaryExpression(
                            operator,
                            createReactiveReading(
                                signalIdentifierName,
                                getterName,
                            ),

                            types.numericLiteral(1),
                        ),
                    ],
                ),
            );
        }
        updateIndex++;
    }
};

/**
 *
 * #### Replaces all readings of `signal` identifier binding with `void-js` reactivity API function calls.
 *
 * @param binding `babel` AST binding of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 */

export const replaceSignalReading = (
    binding: Binding,

    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): void => {
    const signalIdentifierName = binding.identifier.name;
    const getterName = runtimeApiNames.get('getValue') as string;

    const readings = binding.referencePaths;

    const readingsLength = readings.length;

    let readingIndex = 0;
    while (readingIndex < readingsLength) {
        const reading = readings[readingIndex];
        const readingParent = reading.parent;

        if (readingParent.type === 'CallExpression') {
            const callee = readingParent.callee;

            if (
                callee.type === 'Identifier' &&
                (callee.name === runtimeApiNames.get('setValue') ||
                    callee.name === runtimeApiNames.get('postSetValue')) &&
                readingParent.arguments[0] === reading
            ) {
                readingIndex++;

                continue;
            }
        }

        reading.replaceWith(
            createReactiveReading(signalIdentifierName, getterName),
        );
        readingIndex++;
    }
};

/**
 *
 * #### Replaces all readings of `computation` identifier with `void-js` reactivity API function calls.
 *
 * @param binding `babel` AST binding of `computation` identifier.
 * @param runtimeApiNamess {@link PreprocessResult.runtimeApiNamess}.
 *
 */
export const replaceComputationReading = (
    binding: Binding,

    runtimeApiNames: PreprocessResult['runtimeApiNames'],
) => {
    const computationIdentifierName = binding.identifier.name;
    const computeName = runtimeApiNames.get('compute') as string;

    const readings = binding.referencePaths;
    const readingsLength = readings.length;

    let readingIndex = 0;
    while (readingIndex < readingsLength) {
        const reading = readings[readingIndex];
        reading.replaceWith(
            createReactiveReading(computationIdentifierName, computeName),
        );
        readingIndex++;
    }
};

/**
 *
 * #### Returns `CallExpression` object with `getterName` as callee and `reactiveIdentfierName` as argument.
 *
 * @param reactiveIdentifierName Name of `signal` or `computation` identifier.
 * @param getterName Name of reactive getter to be as `callee` in `CallExpression`.
 *
 * @returns `CallExpression` object for `babel` AST.
 *
 * @example
 *
 * ```typescript
 * createSignalReading('name', 'getValue');
 * ```
 *
 * Returns something like this:
 *
 * ```typescript
 * getValue(name);
 * ```
 *
 *
 *
 *
 *
 *
 */

export const createReactiveReading = (
    reactiveIdentifierName: string,

    getterName: string,
): CallExpression => {
    return types.callExpression(types.identifier(getterName), [
        types.identifier(reactiveIdentifierName),
    ]);
};
