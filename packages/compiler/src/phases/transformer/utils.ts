import type {
    Node,
    IdentifierName as Identifier,
    Expression,
    VariableDeclarator,
    CallExpression,
    AssignmentExpression,
    BinaryExpression,
    LogicalExpression,
    UpdateExpression,
    MemberExpression,
    TSTypeAnnotation,
} from 'oxc-parser';

import * as nodes from './nodes';
import { originalPositionFor } from '@jridgewell/trace-mapping';
import type { TraceMap } from '@jridgewell/trace-mapping';
import type { ErrorContext, Scope, VisitedReactives } from './types';

import { LOGICAL_OPERATORS } from './constants';
import type { ScopeIdType } from './constants';

import type { PreprocessResult } from '../preprocessor';

import { CompileError, compileErrors, getIndexLocation } from '../../errors';
import { reduceEachTrailingCommentRange } from 'typescript';

/**
 *
 * #### Creates `VariableDeclarator` for `signal` identifier from original identifier and original initial value.
 *
 * @param errorContext {@link ErrorContext}.
 * @param originalId Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns `VariableDeclarator` of signal or `null` if there is an error.
 */
export const createSignalDeclarator = (
    errorContext: ErrorContext,
    originalId: VariableDeclarator['id'],
    initialValue: VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator | null => {
    const errors = errorContext.errors;

    if (!initialValue) {
        errors.push(
            createNodeCompileError(
                errorContext,
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
                errorContext,
                compileErrors.REACTIVE_DESTRUCTURING('signal'),
                originalId.start,
                originalId.end,
            ),
        );

        return null;
    }

    const originalIdTsType = originalId.typeAnnotation as TSTypeAnnotation | null;

    const identifier = nodes.identifier(
        originalId.name,

        nodes.tsTypeAnnotation(
            nodes.tsTypeReference(
                nodes.identifier(runtimeApiNames.Signal),
                originalIdTsType &&
                    nodes.tsTypeParameterInstatiation([
                        nodes.resetNode(originalIdTsType).typeAnnotation,
                    ]),
            ),
        ),
    );

    return nodes.variableDeclarator(
        identifier,

        nodes.objectExpression([
            nodes.objectProperty(
                nodes.identifier('subscribers'), // TODO: remove key names to constants
                nodes.newExpression(nodes.identifier('Set'), []),
            ),

            nodes.objectProperty(nodes.identifier('value'), nodes.resetNode(initialValue)),
        ]),
    );
};

/**
 *
 * #### Creates `VariableDeclarator` for `computation` from original identifier and initial value (that is a function for `computation`).
 *
 * @param traceMap {@link TraceMap} of a source map.
 * @param errors Array with {@link CompileError} instances.
 * @param originalId Identifier of `computation`.
 * @param initialValue Initial value of `computation`.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns {VariableDeclaration} {@link VariableDeclaration} of computation or `null` if there is an error.
 *
 */

export const createComputationDeclarator = (
    errorContext: ErrorContext,
    originalId: VariableDeclarator['id'],
    initialValue: VariableDeclarator['init'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): VariableDeclarator | null => {
    const errors = errorContext.errors;

    if (!initialValue) {
        errors.push(
            createNodeCompileError(
                errorContext,
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
                errorContext,

                compileErrors.REACTIVE_DESTRUCTURING('computation'),

                originalId.start,

                originalId.end,
            ),
        );

        return null;
    }

    const originalIdTsType = originalId.typeAnnotation as TSTypeAnnotation | null;

    const createComputationCall = nodes.callExpression(
        nodes.identifier(runtimeApiNames.createComputation as string),
        [nodes.resetNode(initialValue)],

        originalIdTsType &&
            nodes.tsTypeParameterInstatiation([nodes.resetNode(originalIdTsType.typeAnnotation)]),
    );

    return nodes.variableDeclarator(nodes.identifier(originalId.name), createComputationCall);
};

/**
 *
 * #### Creates `signal` setter call (`setValue` function) with correct operator.
 *
 * #### Adds `signal` identifier argument of setter to `visitedReactives` to prevent circular transformation of it.
 *
 * @param visitedReactives {@link VisitedReactives}.
 * @param operator Operator of original assignment expression.
 * @param signalIdName Name of signal identifier.
 * @param value Value of assignment.
 * @param runtimeApiNames {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns {CallExpression | LogicalExpression} {@link CallExpresssion} of signal setter or {@link LogicalExpression} if `operator` is `'||='`,`'??='`, `'&&='`.
 *
 *
 * @example
 *
 * ```typescript
 * createSignalAssignment('+=', 'count', nodes.number(16), { setValue: '_sv' }); // `_sv(count, count + 16);`
 * createSignalAssignment('&&=', 'count', nodes.number(16), { setValue: '_sv' }); // `count && _sv(count, 16);`
 * ```
 *
 *
 *
 */

export const createSignalAssignment = (
    visitedReactives: VisitedReactives,
    operator: AssignmentExpression['operator'],
    signalIdName: string,
    value: Expression,
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
): CallExpression | LogicalExpression => {
    const binaryOperator = operator.slice(0, operator.length - 1);

    const signalArg = nodes.identifier(signalIdName);
    visitedReactives.add(signalArg);

    if (binaryOperator) {
        if (LOGICAL_OPERATORS[binaryOperator as LogicalExpression['operator']]) {
            return nodes.binaryExpression(
                'LogicalExpression',
                binaryOperator as LogicalExpression['operator'],
                signalArg,

                nodes.callExpression(
                    nodes.identifier(runtimeApiNames.setValue),
                    [nodes.identifier(signalIdName), nodes.resetNode(value)],
                    null,
                ),
            );
        } else {
            return nodes.callExpression(
                nodes.identifier(runtimeApiNames.setValue),
                [
                    signalArg,
                    nodes.binaryExpression(
                        'BinaryExpression',
                        binaryOperator as BinaryExpression['operator'],
                        nodes.identifier(signalIdName),
                        nodes.resetNode(value),
                    ),
                ],
                null,
            );
        }
    }

    return nodes.callExpression(
        nodes.identifier(runtimeApiNames.setValue),
        [signalArg, nodes.resetNode(value)],
        null,
    );
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
        nodes.identifier(prefix ? runtimeApiNamess.setValue : runtimeApiNamess.postSetValue),

        [
            nodes.identifier(signalIdName),
            nodes.binaryExpression(
                'BinaryExpression',
                operator[0] as '+' | '-',
                nodes.identifier(signalIdName),
                nodes.literal(1),
            ),
        ],

        null,
    );

/**
 * #### Returns {@link CallExpression} object with `getterName` as callee and `reactiveIdentfierName` as argument.
 *
 * @param reactiveIdentifierName Name of `signal` or `computation` identifier.
 * @param getterName Name of reactive getter to be as `callee` in `CallExpression`.
 *
 * @returns {CallExpression} {@link CallExpression} of `getterName`.
 *
 * @example
 * ```typescript
 * createSignalReading('name', 'getValue'); // `getValue(name)`
 * ```
 */

export const createReactiveReading = (
    reactiveIdentifierName: string,
    getterName: string,
): CallExpression =>
    nodes.callExpression(
        nodes.identifier(getterName),
        [nodes.identifier(reactiveIdentifierName)],
        null,
    );

/**
 *
 * #### Recursively adds all identifiers appeared in `pattern` to `scope`.
 *
 *
 *
 * @param pattern {@link VariableDeclarator['id']}.
 * @param scope {@link Scope} of a block.
 * @param scopeIdType {@link ScopeIdType} of all identifiers in `pattern`.
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

            addPatternToScope(
                property.type === 'Property' ? property.value : property.argument,
                scope,

                scopeIdType,
            );
        }
        return;
    }

    if (patternType === 'ArrayPattern') {
        const elements = pattern.elements;

        for (let elemIndex = 0; elemIndex < elements.length; elemIndex++) {
            const element = elements[elemIndex];

            if (element) {
                addPatternToScope(
                    element.type === 'RestElement' ? element.argument : element,
                    scope,
                    scopeIdType,
                );
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
 * #### Unwraps `Identifier` or `MemberExpression` of {@link UpdateExpression.argument} from `TSTypeAssertion`, `TSNonNullExpression` and other wrappers.
 *
 * @param argument {@link UpdateExpression.argument} to be unwrapped.
 *
 * @returns {Identifier | MemberExpression} Unwrapped {@link Identifier} or {@link MemberExpression}.
 */

export const unwrapUpdateExpression = (
    argument: UpdateExpression['argument'],
): Identifier | MemberExpression => {
    while (argument.type !== 'Identifier' && argument.type !== 'MemberExpression') {
        argument = argument.expression as UpdateExpression['argument'];
    }

    return argument;
};

/**
 *
 * #### Finds an identifier in `scopeStack` in its {@link Scope|scopes}.
 * #### Moves found identifier from depth to the latest scope (mutation) for faster search later.
 *
 *
 * @param name Name of identifier.
 * @param scopeStack Array (stack) with {@link Scope} elements.
 *
 * @returns Found value in `scopeStack` or `undefined`.
 *
 *
 */

export const findInScopes = (name: string, scopeStack: Scope[]): ScopeIdType | undefined => {
    let scopeIndex = scopeStack.length - 1;

    const lastScope = scopeStack[scopeIndex];

    let found = scopeStack[scopeIndex].get(name);

    while (found === undefined && scopeIndex > 0) {
        scopeIndex--;
        found = scopeStack[scopeIndex].get(name);
    }

    if (found !== undefined) {
        lastScope.set(name, found);

        return found;
    }

    return undefined;
};

/**
 * #### Sets `parent[key]` to `replacement`.
 *
 * @param replacement A new node to be inserted instead of old.
 * @param parent parent of node where replacement will happen.
 * @param key key in `parent`, where to replace node.
 */

export const replaceNode = (replacement: Node, parent: Node | Node[], key: string): void => {
    (parent as unknown as Record<string, unknown>)[key] = replacement;
};

/**
 *
 *
 * #### Converts `start` and `end` positions to `void-js` source file positions and returns `CompileError` instance with them.
 *
 * @param errorContext {@link ErrorContext}.
 * @param message message of error.
 * @param start Start absolute position of a node in preprocessed code.
 * @param end End absolute position of a node in preprocessed code.
 *
 * @returns instance of {@link CompileError}.
 */
export const createNodeCompileError = (
    errorContext: ErrorContext,

    message: string,
    start: number,
    end: number,
): CompileError => {
    const traceMap = errorContext.traceMap;
    const lineIndexes = errorContext.lineIndexes;

    const originalStart = originalPositionFor(
        traceMap,

        getIndexLocation(lineIndexes, start),
    );

    const originalEnd = originalPositionFor(traceMap, getIndexLocation(lineIndexes, end));
    return new CompileError(
        message,

        originalStart.line ?? 1,

        originalStart.column ?? 0,

        originalEnd.column,
    );
};
