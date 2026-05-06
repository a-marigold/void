import { parseSync } from 'oxc-parser';
import type {
    Node,
    IdentifierName as Identifier,
    ArrowFunctionExpression,
    MemberExpression,
    Expression,
    VariableDeclaration,
    VariableDeclarator,
    ExportNamedDeclaration,
} from 'oxc-parser';

import { traverse, SKIP } from 'polyast';

import * as nodes from './nodes';
import { TraceMap } from '@jridgewell/trace-mapping';

import type { TransformResult, TransformContext, ErrorContext } from './types';

import { oxcParserOptions, ScopeIdType, MEMBER_EXPRESSION_PROPERTY_KEY } from './constants';

import type { PreprocessResult } from '../preprocessor';

import { compileErrors, getLineIndexes } from '../../errors';

import {
    createSignalDeclarator,
    createMemoDeclarator,
    createReactiveReading,
    createSignalAssignment,
    createSignalUpdate,
    unwrapUpdateExpression,
    findInScopes,
    addPatternToScope,
    replaceNode,
    createNodeCompileError,
    createEffectCall,
} from './utils';

/**
 *
 * #### Parses preprocessed code and transforms signals, effects, memos and components to `void-js` runtime.
 *
 * @param preprocessed Result of preprocessor.
 *
 *
 *
 *
 *
 * @returns Transformed `ast` argument.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

export const transform = (preprocessed: PreprocessResult): TransformResult => {
    const labels = preprocessed.labels;
    const runtimeApiNames = preprocessed.runtimeApiNames;

    const errors = preprocessed.errors;
    const errorContext: ErrorContext = {
        errors,
        traceMap: new TraceMap(preprocessed.sourceMap),
        lineIndexes: getLineIndexes(preprocessed.code),
    };

    const scopeStack: TransformContext['scopeStack'] = [new Map()];

    const transformContext: TransformContext = {
        lastLabel: '',

        isFirstVarDeclaration: true,
        isComponentAppeared: false,

        scopeStack,
        visitedReactives: new WeakSet(),
    };

    const parsed = parseSync('', preprocessed.code, oxcParserOptions);

    traverse<Node>(
        parsed.program,

        (node, parent, key) => {
            const nodeType = node.type;

            if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
                errors.push(
                    createNodeCompileError(
                        errorContext,

                        compileErrors.JSX_OUTSIDE_COMPONENT,

                        node.start,

                        node.end,
                    ),
                );

                return nodes.emptyStatement();
            }

            if (nodeType === 'ImportDeclaration') {
                // it is useless to traverse
                return SKIP;
            }

            return transformEnterBase(
                node,
                parent,
                key,
                transformContext,
                labels,
                runtimeApiNames,
                errorContext,
            );
        },

        (node) => {
            transformExitBase(node, scopeStack);
        },
    );

    return { result: parsed, errors };
};

/**
 * #### Applies core transformation logic.
 * #### Must be used inside `onEnter` visitor.
 * #### The call of it must be returned in traversal to replace nodes.
 *
 *
 * @returns A replacement for node, traversal flag {@link SKIP} or undefined.
 */
export const transformEnterBase = (
    node: Node,
    parent: Node | Node[] | undefined,
    key: string,
    transformContext: TransformContext,
    labels: PreprocessResult['labels'],
    runtimeApiNames: PreprocessResult['runtimeApiNames'],
    errorContext: ErrorContext,
) => {
    const nodeType = node.type;

    const errors = errorContext.errors;

    const scopeStack = transformContext.scopeStack;
    const visitedReactives = transformContext.visitedReactives;

    if (
        nodeType === 'Identifier' &&
        (key !== MEMBER_EXPRESSION_PROPERTY_KEY || (parent as MemberExpression).computed)
    ) {
        if (visitedReactives.has(node)) {
            return SKIP;
        }

        const idName = node.name;
        const label = labels[idName];

        if (label) {
            transformContext.lastLabel = label;

            return nodes.emptyStatement();
        }

        const scopeIdType = findInScopes(idName, scopeStack);
        if (scopeIdType) {
            replaceNode(
                createReactiveReading(
                    idName,

                    scopeIdType === ScopeIdType.Signal
                        ? runtimeApiNames.getValue
                        : runtimeApiNames.computeMemo,
                ),
                parent as Node,
                key,
            );
        }

        return SKIP;
    }

    if (nodeType === 'BlockStatement') {
        scopeStack.push(new Map());

        return;
    }

    const lastLabel = transformContext.lastLabel;

    if (lastLabel) {
        const lastScope = scopeStack[scopeStack.length - 1];

        if (lastLabel === 'signal') {
            const declarators: VariableDeclarator[] = [];

            const origDeclarators = (node as VariableDeclaration).declarations;
            for (let decIndex = 0; decIndex < origDeclarators.length; decIndex++) {
                const origDeclarator = origDeclarators[decIndex];

                const signalDeclarator = createSignalDeclarator(
                    errorContext,
                    origDeclarator.id,
                    origDeclarator.init,
                    runtimeApiNames,
                );

                if (signalDeclarator) {
                    const signalId = signalDeclarator.id as Identifier;

                    declarators.push(signalDeclarator);

                    lastScope.set(signalId.name, ScopeIdType.Signal);

                    visitedReactives.add(signalId);
                }
            }

            transformContext.lastLabel = '';

            return nodes.variableDeclaration('const', declarators);
        }

        if (lastLabel === 'memo') {
            const declarators: VariableDeclarator[] = [];

            const origDeclarators = (node as VariableDeclaration).declarations;

            for (let decIndex = 0; decIndex < origDeclarators.length; decIndex++) {
                const origDeclarator = origDeclarators[decIndex];

                const memoDeclarator = createMemoDeclarator(
                    errorContext,
                    origDeclarator.id,
                    origDeclarator.init,
                    runtimeApiNames,
                );
                if (memoDeclarator) {
                    const memoIdentifier = memoDeclarator.id as Identifier;

                    declarators.push(memoDeclarator);
                    lastScope.set(memoIdentifier.name, ScopeIdType.Memo);

                    visitedReactives.add(memoIdentifier);
                }
            }
            transformContext.lastLabel = '';

            return nodes.variableDeclaration('const', declarators);
        }

        if (lastLabel === 'effect') {
            transformContext.lastLabel = '';

            return createEffectCall(
                runtimeApiNames.createEffect,

                nodes.resetNode(
                    node.type === 'ExpressionStatement' ? node.expression : (node as Expression),
                ),
            );
        }

        if (lastLabel === 'component') {
            if (transformContext.isComponentAppeared) {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.MULTIPLE_COMPONENTS,
                        node.start,
                        node.end,
                    ),
                );
                transformContext.lastLabel = '';

                return SKIP;
            }

            transformContext.isComponentAppeared = true;

            const body = (
                ((node as ExportNamedDeclaration).declaration as VariableDeclaration)
                    .declarations[0].init as ArrowFunctionExpression
            ).body;

            if (body.type !== 'BlockStatement') {
                errors.push(
                    createNodeCompileError(
                        errorContext,
                        compileErrors.COMPONENT_CONSICE_BODY,
                        body.start,
                        body.end,
                    ),
                );

                transformContext.lastLabel = '';

                return SKIP;
            }

            transformContext.lastLabel = '';

            return;
        }
    }
    if (nodeType === 'AssignmentExpression') {
        const left = node.left;

        if (left.type === 'Identifier') {
            const idName = left.name;

            if (findInScopes(idName, scopeStack) === ScopeIdType.Signal) {
                return createSignalAssignment(
                    visitedReactives,
                    node.operator,

                    left.name,

                    node.right,
                    runtimeApiNames,
                );
            }
        }

        return;
    }

    if (nodeType === 'VariableDeclaration') {
        if (transformContext.isFirstVarDeclaration) {
            // the first `VariableDeclaration` in preprocessed code is always an initialization of labels
            replaceNode(nodes.emptyStatement(), parent as Node, key);
            transformContext.isFirstVarDeclaration = false;

            return SKIP;
        }
        const lastScope = scopeStack[scopeStack.length - 1];

        const declarators = node.declarations;

        for (let decIndex = 0; decIndex < declarators.length; decIndex++) {
            addPatternToScope(declarators[decIndex].id, lastScope, ScopeIdType.Default);
        }

        return;
    }

    if (nodeType === 'UpdateExpression') {
        const argument = unwrapUpdateExpression(node.argument);

        if (
            argument.type === 'Identifier' &&
            findInScopes(argument.name, scopeStack) === ScopeIdType.Signal
        ) {
            replaceNode(
                createSignalUpdate(argument.name, node.operator, node.prefix, runtimeApiNames),
                parent as Node,
                key,
            );
        }

        return SKIP;
    }
};

/**
 *
 *
 * #### Applies core transformation logic.
 * #### Must be used in `onExit` traversal visitor.
 *
 *
 *
 *
 */
export const transformExitBase = (node: Node, scopeStack: TransformContext['scopeStack']): void => {
    if (node.type === 'BlockStatement') {
        scopeStack.pop();
    }
};
