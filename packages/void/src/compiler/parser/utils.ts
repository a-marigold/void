import * as types from '@babel/types';

import type { VariableDeclarator, TSTypeAnnotation } from '@babel/types';

import { CompileError, compileErrors } from '../errors';

/**
 *
 *
 * #### Creates variable declarator for `signal` identifier from original identifier and original initial value.
 *
 *
 *
 *
 *
 * @param originalIdentifier Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier from `void-js` source file.
 * @param signalTypeName Name of imported `Signal` type from runtime `void-js` API. This parameter is needed because of unique import names after preprocessing.
 *
 * @returns `VariableDeclarator` for `babel` AST.
 *
 */
export const createSignalDeclarator = (
    originalIdentifier: types.VariableDeclarator['id'],
    initialValue: types.VariableDeclarator['init'],
    signalTypeName: string,
): VariableDeclarator => {
    if (!initialValue) {
        throw new CompileError(
            compileErrors.SIGNAL_WITHOUT_INITIAL_VALUE(),

            0,

            0,
        );
    }

    if (originalIdentifier.type !== 'Identifier') {
        throw new CompileError(compileErrors.SIGNAL_DESTRUCTURING(), 0, 0);
    }

    const identifier = types.identifier(originalIdentifier.name);

    const originalTSType = (
        originalIdentifier.typeAnnotation as TSTypeAnnotation | undefined
    )?.typeAnnotation; // assertions is not dangerous because `void-js` supports only typescript

    identifier.typeAnnotation = types.tsTypeAnnotation(
        types.tsTypeReference(
            types.identifier(signalTypeName),

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
