import type {
    Node,
    Position,
    SourceLocation,
    VariableDeclarator,
    SimpleCallExpression,
    Pattern,
} from 'estree';

import * as nodes from '../../utils/estreeNodes';

import { originalPositionFor, type TraceMap } from '@jridgewell/trace-mapping';

import type { Scope, ScopeIdType } from './types';

import type { PreprocessResult } from '../preprocessor';
import { CompileError, compileErrors } from '../../errors';

/**
 *
 *
 * #### Creates variable declarator for `signal` identifier from original identifier and original initial value.
 *
 * @param traceMap {@link TraceMap} from a source map.
 * @param errors Array with {@link CompileError} instances.
 * @param originalIdentifier Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}
 *
 *
 *
 * @returns `VariableDeclarator` for `babel` AST or `null` if there is an error.
 */
export const createSignalDeclarator = (
    traceMap: TraceMap,
    errors: CompileError[],
    originalIdentifier: VariableDeclarator['id'],
    initialValue: VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator | null => {
    if (!initialValue) {
        const originalIdentifierLoc = originalIdentifier.loc as SourceLocation;

        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE('signal'),
                originalIdentifierLoc.start,
                originalIdentifierLoc.end,
            ),
        );

        return null;
    }

    if (originalIdentifier.type !== 'Identifier') {
        const originalIdentifierLoc = originalIdentifier.loc as SourceLocation;

        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_DESTRUCTURING('signal'),
                originalIdentifierLoc.start,
                originalIdentifierLoc.end,
            ),
        );

        return null;
    }

    const identifier = nodes.identifier(originalIdentifier.name);

    // const originalTSType = (
    //     originalIdentifier.typeAnnotation as TSTypeAnnotation | undefined
    // )?.typeAnnotation; // assertion is not dangerous because `void-js` supports only typescript

    // identifier.typeAnnotation = nodes.tsTypeAnnotation(
    //     nodes.tsTypeReference(
    //         nodes.identifier(runtimeApiNames.get('Signal') as string),

    //         originalTSType &&
    //             nodes.tsTypeParameterInstantiation([originalTSType]),
    //     ),
    // );

    return nodes.variableDeclarator(
        identifier,

        nodes.objectExpression([
            nodes.property(
                nodes.identifier('subscribers'), // TODO: remove key names to constants
                nodes.newExpression(nodes.identifier('Set'), []),
            ),

            nodes.property(
                nodes.identifier('value'),
                nodes.resetNode(initialValue),
            ),
        ]),
    );
};

/**
 *
 * #### Creates `VariableDeclarator` for `computation` from original identifier and initial value (that is a function for `computation`).
 *
 * @param traceMap {@link TraceMap} of a source map.
 * @param errors Array with {@link CompileError} instances.
 * @param originalIdentifier Identifier of `computation`.
 *
 *
 *
 * @param initialValue Initial value of `computation`.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames} from preprocessor.
 *
 *
 * @returns `VariableDeclaration` for `babel` AST.
 *
 *
 */

export const createComputationDeclarator = (
    traceMap: TraceMap,
    errors: CompileError[],

    originalIdentifier: VariableDeclarator['id'],

    initialValue: VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator | null => {
    if (!initialValue) {
        const originalIdentifierLoc = originalIdentifier.loc as SourceLocation;

        errors.push(
            createNodeCompileError(
                traceMap,

                compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE('computation'),

                originalIdentifierLoc.start,
                originalIdentifierLoc.end,
            ),
        );

        return null;
    }

    if (originalIdentifier.type !== 'Identifier') {
        const originalIdentifierLoc = originalIdentifier.loc as SourceLocation;

        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_DESTRUCTURING('computation'),
                originalIdentifierLoc.start,
                originalIdentifierLoc.end,
            ),
        );

        return null;
    }

    // const originalTsType = (
    //     originalIdentifier.typeAnnotation as TSTypeAnnotation | undefined
    // )?.typeAnnotation;

    const createComputationCall = nodes.callExpression(
        nodes.identifier(runtimeApiNames.get('createComputation') as string),
        [nodes.resetNode(initialValue)],
    );

    // createComputationCall.typeParameters =
    //     originalTsType &&
    //     nodes.tsTypeParameterInstantiation([nodes.cloneNode(originalTsType)]);

    return nodes.variableDeclarator(
        nodes.identifier(originalIdentifier.name),
        createComputationCall,
    );
};

/**
 *
 * #### Replaces all the updates and mutations of `signal` identifier with `void-js` reactivity API calls.
 *
 * #### Does not replace reading of `signal` identifier.
 *
 * @param binding `babel` AST Binding of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 *
 */
// export const replaceSignalUpdates = (
//     binding: Binding,

//     runtimeApiNames: PreprocessResult['runtimeApiNames'],
// ): void => {
//     const signalIdentifierName = binding.identifier.name;
//     const getterName = runtimeApiNames.get('getValue') as string;
//     const setterName = runtimeApiNames.get('setValue') as string;

//     const updates = binding.constantViolations;

//     for (let updateIndex = 0; updateIndex < updates.length; updateIndex++) {
//         const currentUpdate = updates[updateIndex];

//         const updateNode = currentUpdate.node;

//         if (updateNode.type === 'AssignmentExpression') {
//             let operator: string = '';

//             const nodeOperator = updateNode.operator;

//             let operatorIndex = 0;
//             while (nodeOperator[operatorIndex] !== '=') {
//                 operator += nodeOperator[operatorIndex];
//                 operatorIndex++;
//             }

//             let newSignalValue: Expression;

//             if (
//                 LOGICAL_OPERATORS.has(operator as LogicalExpression['operator'])
//             ) {
//                 newSignalValue = nodes.logicalExpression(
//                     operator as LogicalExpression['operator'],
//                     createReactiveReading(
//                         signalIdentifierName,
//                         runtimeApiNames.get('getValue') as string,
//                     ),
//                     nodes.cloneNode(updateNode.right),
//                 );
//             } else if (operator) {
//                 newSignalValue = nodes.binaryExpression(
//                     operator as BinaryExpression['operator'],
//                     createReactiveReading(signalIdentifierName, getterName),
//                     nodes.cloneNode(updateNode.right),
//                 );
//             } else {
//                 newSignalValue = nodes.cloneNode(updateNode.right);
//             }

//             currentUpdate.replaceWith(
//                 nodes.callExpression(nodes.identifier(setterName), [
//                     nodes.identifier(signalIdentifierName),
//                     newSignalValue,
//                 ]),
//             );
//         } else if (updateNode.type === 'UpdateExpression') {
//             /**
//              *
//              * `UpdateExpression.prefix` means is it a pre-increment or post-increment.
//              *
//              * There is `postSetValue` for post-increment in `void-js` reactivity API, that is why this variable is needed.
//              */
//             const updateSetterName: RuntimeApiName = updateNode.prefix
//                 ? 'setValue'
//                 : 'postSetValue';

//             const operator = updateNode.operator === '++' ? '+' : '-';

//             currentUpdate.replaceWith(
//                 nodes.callExpression(
//                     nodes.identifier(
//                         runtimeApiNames.get(updateSetterName) as string,
//                     ),
//                     [
//                         nodes.identifier(signalIdentifierName),
//                         nodes.binaryExpression(
//                             operator,
//                             createReactiveReading(
//                                 signalIdentifierName,
//                                 getterName,
//                             ),

//                             nodes.numericLiteral(1),
//                         ),
//                     ],
//                 ),
//             );
//         }
//     }
// };
/**
 *
 * #### Replaces all readings of `signal` identifier binding with `void-js` reactivity API function calls.
 *
 *
 * @param binding `babel` AST binding of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 */

// export const replaceSignalReading = (
//     binding: Binding,

//     runtimeApiNames: PreprocessResult['runtimeApiNames'],
// ): void => {
//     const signalIdentifierName = binding.identifier.name;
//     const getterName = runtimeApiNames.get('getValue') as string;

//     const readings = binding.referencePaths;

//     for (let readingIndex = 0; readingIndex < readings.length; readingIndex++) {
//         const reading = readings[readingIndex];
//         const readingParent = reading.parent;

//         if (readingParent.type === 'CallExpression') {
//             const callee = readingParent.callee;

//             if (
//                 callee.type === 'Identifier' &&
//                 (callee.name === runtimeApiNames.get('setValue') ||
//                     callee.name === runtimeApiNames.get('postSetValue')) &&
//                 readingParent.arguments[0] === reading
//             ) {
//                 readingIndex++;

//                 continue;
//             }
//         }

//         reading.replaceWith(
//             createReactiveReading(signalIdentifierName, getterName),
//         );
//     }
// };

/**
 *
 * #### Replaces all readings of `computation` identifier with `void-js` reactivity API function calls.
 *
 * @param binding `babel` AST binding of `computation` identifier.
 * @param runtimeApiNamess {@link PreprocessResult.runtimeApiNamess}.
 *
 */

// export const replaceComputationReading = (
//     binding: Binding,

//     runtimeApiNames: PreprocessResult['runtimeApiNames'],
// ): void => {
//     const computationIdentifierName = binding.identifier.name;
//     const computeName = runtimeApiNames.get('compute') as string;

//     const readings = binding.referencePaths;

//     for (let readingIndex = 0; readingIndex < readings.length; readingIndex++) {
//         const reading = readings[readingIndex];

//         reading.replaceWith(
//             createReactiveReading(computationIdentifierName, computeName),
//         );
//     }
// };

/**
 *
 * #### Returns `CallExpression` object with `getterName` as callee and `reactiveIdentfierName` as argument.
 *
 * @param reactiveIdentifierName Name of `signal` or `computation` identifier.
 * @param getterName Name of reactive getter to be as `callee` in `CallExpression`.
 *
 * @returns `CallExpression` object for AST.
 *
 * @example
 *
 * ```typescript
 * createSignalReading('name', 'getValue'); // `getValue(name)`
 * ```
 */

export const createReactiveReading = (
    reactiveIdentifierName: string,
    getterName: string,
): SimpleCallExpression =>
    nodes.callExpression(nodes.identifier(getterName), [
        nodes.identifier(reactiveIdentifierName),
    ]);

/**
 *
 * #### Recursively adds all identifiers from `pattern` to scope.
 *
 * @param pattern {@link VariableDeclarator['id']}.
 * @param scope {@link Scope} of a block.
 * @param idType {@link ScopeIdType} of all identifiers in `pattern`.
 */
export const addPatternToScope = (
    pattern: Pattern,

    scope: Scope,
    idType: ScopeIdType,
): void => {
    const patternType = pattern.type;

    if (patternType === 'Identifier') {
        scope.set(pattern.name, idType);

        return;
    }

    if (patternType === 'ObjectPattern') {
        const properties = pattern.properties;

        for (let propIndex = 0; propIndex < properties.length; propIndex++) {
            const property = properties[propIndex];

            if (property.type === 'Property') {
                addPatternToScope(property.value, scope, idType);
            } else {
                addPatternToScope(property.argument, scope, idType);
            }
        }

        return;
    }

    if (patternType === 'ArrayPattern') {
        const elements = pattern.elements;

        for (let elemIndex = 0; elemIndex < elements.length; elemIndex++) {
            const element = elements[elemIndex];

            if (element) {
                addPatternToScope(element, scope, idType);
            }
        }
        return;
    }

    if (patternType === 'AssignmentPattern') {
        addPatternToScope(pattern.left, scope, idType);
    }
};

/**
 *
 * #### Finds an identifier in `scopeStack` in its {@link Scope|scopes}.
 *
 * @param name Name of identifier.
 * @param scopeStack Array (stack) with {@link Scope} elements.
 *
 * @returns Found value in `scopeStack` or `undefined`.
 *
 */

export const findInScopes = (
    name: string,
    scopeStack: Scope[],
): ScopeIdType | undefined => {
    let scopeIndex = scopeStack.length - 1;

    let found = scopeStack[scopeIndex].get(name);

    while (scopeIndex > 0 && found === undefined) {
        scopeIndex--;
        found = scopeStack[scopeIndex].get(name);
    }

    return found;
};

/**
 *
 * #### Sets `parent[key]` to `replacement`.
 *
 * @param replacement A new node to be inserted instead of old.
 * @param parent Parent of node where replacement will happen.
 * @param key Key in `parent`, where to replace node.
 *
 *
 *
 *
 */

export const replaceNode = (
    replacement: Node,

    parent: Node | Node[],

    key: string,
): void => {
    (parent as unknown as Record<string, unknown>)[key] = replacement;
};

/**
 *
 * #### Converts `start` and `end` positions to `void-js` source file positions and returns `CompileError` instance with them.
 * #### Uses `traceMap` ({@link TraceMap}) argument to convert positions.
 *
 * @param traceMap generated {@link TraceMap} from a source map.
 * @param message Message of error.
 * @param start `Node.loc.start`.
 * @param end `Node.loc.end`.
 *
 * @returns instance of {@link CompileError}.
 *
 */

export const createNodeCompileError = (
    traceMap: TraceMap,

    message: string,

    start: Position,
    end: Position | null,
): CompileError => {
    const originalPos = originalPositionFor(traceMap, {
        line: start.line,

        column: start.column,
    });

    const originalStartPos = originalPos.column ?? 0;

    return new CompileError(
        message,
        originalPos.line || 1,

        originalStartPos,

        end && originalStartPos + end.column - start.column,
    );
};
