import * as types from '@babel/types';
import type { VariableDeclarator, TSTypeAnnotation } from '@babel/types';

import type { PreprocessResult } from '../preprocessor';

import { CompileError, compileErrors } from '../errors';

/**
 *
 *
 *
 * #### Creates variable declarator for `signal` identifier from original identifier and original initial value.
 *
 *
 *
 * @param originalIdentifier Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}
 *
 * @returns `VariableDeclarator` for `babel` AST.
 *
 */
export const createSignalDeclarator = (
    originalIdentifier: types.VariableDeclarator['id'],
    initialValue: types.VariableDeclarator['init'],
    runtimeApiNames: string,
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
    )?.typeAnnotation; // assertions is not dangerous because `void-js` supports only typescript

    identifier.typeAnnotation = types.tsTypeAnnotation(
        types.tsTypeReference(
            types.identifier(runtimeApiNames),

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
