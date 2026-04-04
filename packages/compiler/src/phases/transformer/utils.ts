import type {
    Node,
    IdentifierName as Identifier,
    Expression,
    VariableDeclarator,
    CallExpression,
    AssignmentOperator,
    LogicalExpression,
    UpdateExpression,
} from 'oxc-parser';

import * as nodes from './nodes';

import { originalPositionFor } from '@jridgewell/trace-mapping';

import type { TraceMap } from '@jridgewell/trace-mapping';
import type { Scope, ScopeIdType } from './types';
import { LOGICAL_OPERATORS } from './constants';

import type { PreprocessResult } from '../preprocessor';

import { CompileError, compileErrors } from '../../errors';

/**
 *
 *
 * #### Creates variable declarator for `signal` identifier from original identifier and original initial value.
 *
 * @param traceMap {@link TraceMap} from a source map.
 * @param errors Array with {@link CompileError} instances.
 * @param originalId Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns `VariableDeclarator` for `babel` AST or `null` if there is an error.
 */
export const createSignalDeclarator = (
    traceMap: TraceMap,
    errors: CompileError[],
    originalId: VariableDeclarator['id'],
    initialValue: VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator | null => {
    if (!initialValue) {
        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE('signal'),
                originalId.start,
                originalId.end,
            ),
        );

        return null;
    }

    if (originalId.type !== 'Identifier') {
        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_DESTRUCTURING('signal'),
                originalId.start,
                originalId.end,
            ),
        );

        return null;
    }

    const identifier = nodes.identifier(originalId.name);

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
            nodes.objectProperty(
                nodes.identifier('subscribers'), // TODO: remove key names to constants
                nodes.newExpression(nodes.identifier('Set'), []),
            ),

            nodes.objectProperty(
                nodes.identifier('value'),
                nodes.resetNode(initialValue),
            ),
        ]),
    );
};

/**
 *
 *
 * #### Creates `VariableDeclarator` for `computation` from original identifier and initial value (that is a function for `computation`).
 *
 * @param traceMap {@link TraceMap} of a source map.
 * @param errors Array with {@link CompileError} instances.
 * @param originalId Identifier of `computation`.
 * @param initialValue Initial value of `computation`.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns `VariableDeclaration` for `babel` AST.
 *
 */

export const createComputationDeclarator = (
    traceMap: TraceMap,
    errors: CompileError[],
    originalId: VariableDeclarator['id'],
    initialValue: VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator | null => {
    if (!initialValue) {
        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_WITHOUT_INITIAL_VALUE('computation'),

                originalId.start,
                originalId.end,
            ),
        );

        return null;
    }

    if (originalId.type !== 'Identifier') {
        errors.push(
            createNodeCompileError(
                traceMap,
                compileErrors.REACTIVE_DESTRUCTURING('computation'),
                originalId.start,
                originalId.end,
            ),
        );

        return null;
    }

    // const originalTsType = (
    //     originalIdentifier.typeAnnotation as TSTypeAnnotation | undefined
    // )?.typeAnnotation;

    const createComputationCall = nodes.callExpression(
        nodes.identifier(runtimeApiNames.createComputation as string),

        [nodes.resetNode(initialValue)],
    );

    // createComputationCall.typeParameters =
    //     originalTsType &&
    //     nodes.tsTypeParameterInstantiation([nodes.cloneNode(originalTsType)]);

    return nodes.variableDeclarator(
        nodes.identifier(originalId.name),
        createComputationCall,
    );
};

/**
 *
 * #### Creates `signal` setter call (`setValue` function) with correct operator.
 *
 * @param operator Operator of original assignment expression.
 *
 * @param signalIdName Name of signal identifier.
 * @param value Value of assignment.
 *
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns {CallExpression} {@link types.CallExpresssion} of signal setter.
 *
 * @example
 * ```typescript
 * createSignalAssignment('+=', 'count', nodes.number(16), { setValue: '_setValue' });
 * // Output (if generated):
 * `_setValue(count, count + 16);`
 * ```
 */

export const createSignalAssignment = (
    operator: AssignmentOperator,

    signalIdName: string,
    value: Expression,

    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): CallExpression => {
    const binaryOperator = operator.slice(0, operator.length - 1);

    if (binaryOperator) {
        return nodes.callExpression(
            nodes.identifier(runtimeApiNames.setValue),
            [
                nodes.identifier(signalIdName),
                nodes.binaryExpression(
                    LOGICAL_OPERATORS[
                        binaryOperator as LogicalExpression['operator']
                    ]
                        ? 'LogicalExpression'
                        : 'BinaryExpression',
                    binaryOperator as LogicalExpression['operator'],

                    nodes.identifier(signalIdName),

                    nodes.resetNode(value),
                ),
            ],
        );
    }

    return nodes.callExpression(nodes.identifier(runtimeApiNames.setValue), [
        nodes.identifier(signalIdName),
        nodes.resetNode(value),
    ]);
};

/**
 *
 *
 * #### Creates signal setter call from an {@link UpdateExpression}.
 * #### Handles pre or post incerment or decrement.
 *
 * @param signalIdName Name of signal identifier.
 *
 * @param operator Operator of original {@link UpdateExpression}.
 * @param prefix Pre or post Update Expression flag
 * @param runtimeApiNamess {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns {CallExpression} {@link CallExpression} of signal setter.
 *
 * @example
 *
 * ```typescript
 * createSignalUpdate('count', '++', false, { setValue: 'PRE', postSetValue: 'POST' });
 *
 * // Output (if generated):
 *
 * `POST(count, count + 1)`
 * ```
 */
export const createSignalUpdate = (
    signalIdName: string,
    operator: UpdateExpression['operator'],
    prefix: boolean,
    runtimeApiNamess: PreprocessResult['runtimeApiNames'],
): CallExpression =>
    nodes.callExpression(
        nodes.identifier(
            prefix ? runtimeApiNamess.setValue : runtimeApiNamess.postSetValue,
        ),
        [
            nodes.identifier(signalIdName),
            nodes.binaryExpression(
                'BinaryExpression',
                operator[0] as '+' | '-',
                nodes.identifier(signalIdName),
                nodes.literal(1),
            ),
        ],
    );

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
): CallExpression =>
    nodes.callExpression(nodes.identifier(getterName), [
        nodes.identifier(reactiveIdentifierName),
    ]);

/**
 *
 * #### Recursively adds all identifiers appeared in `pattern` to scope.
 *
 * @param pattern {@link VariableDeclarator['id']}.
 * @param scope {@link Scope} of a block.
 * @param scopeIdType {@link ScopeIdType} of all identifiers in `pattern`.
 *
 */

export const addPatternToScope = (
    pattern: VariableDeclarator['id'],
    scope: Scope,

    scopeIdType: ScopeIdType,
): void => {
    const patternType = pattern.type;

    if (patternType === 'Identifier') {
        scope.set(pattern.name, scopeIdType);

        return;
    }

    if (patternType === 'ObjectPattern') {
        const properties = pattern.properties;

        for (let propIndex = 0; propIndex < properties.length; propIndex++) {
            const property = properties[propIndex];

            if (property.type === 'Property') {
                addPatternToScope(property.value, scope, scopeIdType);
            } else {
                addPatternToScope(property.argument, scope, scopeIdType);
            }
        }
        return;
    }

    if (patternType === 'ArrayPattern') {
        const elements = pattern.elements;

        for (let elemIndex = 0; elemIndex < elements.length; elemIndex++) {
            const element = elements[elemIndex];

            if (element) {
                if (element.type === 'RestElement') {
                    addPatternToScope(element.argument, scope, scopeIdType);
                } else {
                    addPatternToScope(element, scope, scopeIdType);
                }
            }
        }

        return;
    }

    if (patternType === 'AssignmentPattern') {
        addPatternToScope(pattern.left, scope, scopeIdType);
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

    while (found === undefined && scopeIndex > 0) {
        scopeIndex--;
        found = scopeStack[scopeIndex].get(name);
    }

    return found;
};

/**
 * #### Sets `parent[key]` to `replacement`.
 *
 * @param replacement A new node to be inserted instead of old.
 * @param parent Parent of node where replacement will happen.
 *
 * @param key Key in `parent`, where to replace node.
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
 * @returns instance of {@link CompileError}.
 */
export const createNodeCompileError = (
    traceMap: TraceMap,

    message: string,

    start: number,
    end: number,
): CompileError => {
    const originalPos = originalPositionFor(traceMap, {
        line: start,

        column: start,
    });

    const originalStartPos = originalPos.column ?? 0;
    return new CompileError(
        message,

        originalPos.line || 1,

        originalStartPos,

        end && originalStartPos + end - start,
    );
};
