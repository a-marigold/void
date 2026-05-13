import { TraceMap } from '@jridgewell/trace-mapping';
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
	BlockStatement,
} from 'oxc-parser';
import { traverse, SKIP } from 'polyast';

import { compileErrors, getLineIndexes } from '../../errors';
import type { CompileContext } from '../../types';
import type { PreprocessResult } from '../preprocessor';

import { oxcParserOptions, ScopeIdType, MEMBER_EXPRESSION_PROPERTY_KEY } from './constants';
import { transformJsx } from './jsx';
import * as nodes from './nodes';
import type { TransformResult, TransformContext, ErrorContext, Scope } from './types';
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
 * #### Parses preprocessed code and transforms signals, effects, memos and components to `void-js` runtime.
 *
 * @param preprocessResult Result of preprocessor.
 *
 * @returns {TransformResult} {@link TransformResult}.
 */

export const transform = (
	preprocessResult: PreprocessResult,

	compileContext: CompileContext,
): TransformResult => {
	const code = preprocessResult.code;

	const errors = preprocessResult.errors;
	const errorContext: ErrorContext = {
		errors,
		traceMap: new TraceMap(preprocessResult.sourceMap),
		lineIndexes: getLineIndexes(code),
	};

	const scopeStack: TransformContext['scopeStack'] = [new Map()];

	const parsed = parseSync('', code, oxcParserOptions);

	const program = parsed.program;

	const transformContext: TransformContext = {
		lastLabel: '',
		isFirstVarDeclaration: true,
		scopeStack,
		componentBody: null,
		programBody: program.body,
		componentScope: null,
		visitedReactives: new WeakSet(),
	};

	traverse<Node>(
		program,
		(node, parent, key) => {
			if (node.type === 'ImportDeclaration') {
				// it is useless to traverse

				return SKIP;
			}

			return transformEnterBase(
				node,
				parent,
				key,
				transformContext,
				errorContext,
				compileContext,
				preprocessResult,
			);
		},

		(node) => {
			transformExitBase(node, scopeStack);
		},
	);
	return { result: parsed, errors };
};
/**
 *
 * #### Applies core transformation logic.
 * #### Must be used inside `onEnter` visitor.
 * #### The call of it must be returned in traversal to replace nodes.
 *
 * @returns A replacement for node, traversal flag {@link SKIP} or undefined.
 */
export const transformEnterBase = (
	node: Node,
	parent: Node | Node[] | undefined,
	key: string,
	transformContext: TransformContext,
	errorContext: ErrorContext,
	compileContext: CompileContext,
	preprocessResult: PreprocessResult,
) => {
	const labels = preprocessResult.labels;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const scopeStack = transformContext.scopeStack;
	const visitedReactives = transformContext.visitedReactives;

	const errors = errorContext.errors;

	const nodeType = node.type;

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
	const lastLabel = transformContext.lastLabel;

	if (nodeType === 'BlockStatement') {
		const scope: Scope = new Map();

		scopeStack.push(scope);

		if (lastLabel === 'component') {
			transformContext.componentScope = scope;
		}

		return;
	}

	if (lastLabel) {
		const lastScope = scopeStack[scopeStack.length - 1];

		if (lastLabel === 'signal') {
			const declarators: VariableDeclarator[] = [];

			const origDeclarators = (node as VariableDeclaration).declarations;
			for (let decIndex = 0; decIndex < origDeclarators.length; decIndex++) {
				const origDeclarator = origDeclarators[decIndex];

				const signalDeclarator = createSignalDeclarator(
					origDeclarator.id,
					origDeclarator.init,
					errorContext,
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
					origDeclarator.id,
					origDeclarator.init,
					errorContext,
					runtimeApiNames.createMemo,
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
				nodes.resetNode(
					node.type === 'ExpressionStatement'
						? node.expression
						: (node as Expression),
				),

				runtimeApiNames.createEffect,
			);
		}

		if (lastLabel === 'component') {
			// Named export is always after component
			const body = (
				(
					(node as ExportNamedDeclaration)
						.declaration as VariableDeclaration
				).declarations[0].init as ArrowFunctionExpression
			).body;

			if (body.type !== 'BlockStatement') {
				errors.push(
					createNodeCompileError(
						compileErrors.COMPONENT_CONSICE_BODY,
						body.start,
						body.end,
						errorContext,
					),
				);

				transformContext.lastLabel = '';

				return SKIP;
			}

			transformContext.lastLabel = '';

			return;
		}
	}

	if (
		(nodeType === 'JSXElement' || nodeType === 'JSXFragment') &&
		scopeStack[scopeStack.length - 1] !== transformContext.componentScope
	) {
		errors.push(
			createNodeCompileError(
				compileErrors.JSX_OUTSIDE_COMPONENT,
				node.start,
				node.end,
				errorContext,
			),
		);

		return nodes.emptyStatement();
	}

	if (nodeType === 'AssignmentExpression') {
		const left = node.left;

		if (left.type === 'Identifier') {
			const idName = left.name;

			if (findInScopes(idName, scopeStack) === ScopeIdType.Signal) {
				return createSignalAssignment(
					node.operator,
					left.name,
					node.right,
					runtimeApiNames.setValue,

					visitedReactives,
				);
			}
		}

		return;
	}

	if (nodeType === 'VariableDeclaration') {
		if (transformContext.isFirstVarDeclaration) {
			// The first `VariableDeclaration` in preprocessed code is always an initialization of labels
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
				createSignalUpdate(
					argument.name,
					node.operator,
					node.prefix,
					runtimeApiNames,
				),
				parent as Node,
				key,
			);
		}

		return SKIP;
	}

	if (
		nodeType === 'ReturnStatement' &&
		scopeStack[scopeStack.length - 1] === transformContext.componentScope
	) {
		const argument = node.argument;

		if (argument) {
			if (argument.type === 'JSXElement' || argument.type === 'JSXFragment') {
				transformJsx(
					argument,
					transformContext.componentBody as BlockStatement['body'],
					compileContext,
					transformContext,
					errorContext,
					preprocessResult,
				);
			}

			return nodes.emptyStatement();
		}
	}
};

/**
 *
 *
 *
 * #### Applies core transformation logic.
 * #### Must be used in `onExit` traversal visitor.
 */

export const transformExitBase = (node: Node, scopeStack: TransformContext['scopeStack']): void => {
	if (node.type === 'BlockStatement') {
		scopeStack.pop();
	}
};
