import { TraceMap } from '@jridgewell/trace-mapping';
import { parseSync } from 'oxc-parser';
import type {
	Node,
	IdentifierName as Identifier,
	ArrowFunctionExpression,
	MemberExpression,
	VariableDeclaration,
	BlockStatement,
	BindingPattern,
} from 'oxc-parser';
import { traverse, SKIP, type OnEnter } from 'polyast';

import { errorMessages, getLineIndexes } from '../../errors';
import type { CompileContext } from '../../types';
import type { PreprocessResult, UniqueId } from '../preprocessor';

import { oxcParserOptions, ScopeIdType, MEMBER_EXPRESSION_PROPERTY_KEY } from './constants';
import { transformJsx } from './jsx';
import * as nodes from './nodes';
import type { TransformResult, TransformContext, Scope } from './types';
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
	deleteNode,
	createNodeCompileError,
	createEffectInit,
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

	const scopeStack: TransformContext['scopeStack'] = [new Map()];

	const parsed = parseSync('', code, oxcParserOptions);

	const program = parsed.program;

	const transformContext: TransformContext = {
		lastLabel: '',
		isFirstVarDeclaration: true,
		scopeStack,
		componentScope: null,
		programBody: program.body,
		componentBody: null,
		visitedReactives: new WeakSet(),

		errors,
		traceMap: new TraceMap(preprocessResult.sourceMap),
		lineIndexes: getLineIndexes(code),
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
				compileContext,
				preprocessResult,
			);
		},

		(node, parent) => {
			transformExitBase(node, parent, transformContext);
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

	compileContext: CompileContext,

	preprocessResult: PreprocessResult,
): ReturnType<OnEnter<Node, Node | Node[] | undefined>> => {
	const labels = preprocessResult.labels;
	const runtimeApiNames = preprocessResult.runtimeApiNames;

	const scopeStack = transformContext.scopeStack;
	const visitedReactives = transformContext.visitedReactives;
	const errors = transformContext.errors;

	const nodeType = node.type;

	if (
		nodeType === 'Identifier' &&
		(key !== MEMBER_EXPRESSION_PROPERTY_KEY || (parent as MemberExpression).computed)
	) {
		if (visitedReactives.has(node)) {
			return SKIP;
		}

		const idName = node.name;
		const label = labels[idName as UniqueId];

		if (label) {
			transformContext.lastLabel = label;

			return deleteNode(parent as Node, key);
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

	if (
		nodeType === 'ArrowFunctionExpression' ||
		nodeType === 'FunctionDeclaration' ||
		nodeType === 'FunctionExpression'
	) {
		const fnScope: Scope = new Map();
		scopeStack.push(fnScope);

		const params = node.params;

		for (let parIndex = 0; parIndex < params.length; parIndex++) {
			addPatternToScope(
				params[parIndex] as BindingPattern,
				fnScope,
				ScopeIdType.Default,
			);
		}

		if (lastLabel === 'component') {
			// Components are preprocessed to arrows

			const body = (node as ArrowFunctionExpression).body;

			if (body.type !== 'BlockStatement') {
				errors.push(
					createNodeCompileError(
						errorMessages.COMPONENT_NON_BLOCK_BODY,

						body.start,

						body.end,

						transformContext,
					),
				);

				transformContext.lastLabel = '';

				return SKIP;
			}

			transformContext.componentScope = fnScope;

			transformContext.componentBody = body.body;

			transformContext.lastLabel = '';
		}

		return;
	}

	const parentType = (parent as Node | undefined)?.type;

	if (
		nodeType === 'BlockStatement' &&
		parentType !== 'ArrowFunctionExpression' &&
		parentType !== 'FunctionDeclaration' &&
		parentType !== 'FunctionExpression'
	) {
		scopeStack.push(new Map());

		return;
	}

	if (lastLabel) {
		const lastScope = scopeStack[scopeStack.length - 1];

		if (lastLabel === 'signal') {
			const origDeclarators = (node as VariableDeclaration).declarations;
			if (origDeclarators.length > 1) {
				errors.push(
					createNodeCompileError(
						errorMessages.SIGNAL_MULTIPLE_DECLARATORS,
						node.start,
						node.end,
						transformContext,
					),
				);

				transformContext.lastLabel = '';

				return;
			}

			const origDeclarator = origDeclarators[0];
			const origInit = origDeclarator.init;
			const signalDeclarator = createSignalDeclarator(
				origDeclarator.id,
				origInit && nodes.resetNode(origInit),

				transformContext,
			);
			if (signalDeclarator) {
				const signalId = signalDeclarator.id as Identifier;

				lastScope.set(signalId.name, ScopeIdType.Signal);
				visitedReactives.add(signalId);

				transformContext.lastLabel = '';

				return nodes.variableDeclaration('const', [signalDeclarator]);
			}

			transformContext.lastLabel = '';

			return;
		}

		if (lastLabel === 'memo') {
			const origDeclarators = (node as VariableDeclaration).declarations;

			if (origDeclarators.length > 1) {
				errors.push(
					createNodeCompileError(
						errorMessages.MEMO_MULTIPLE_DECLARATORS,
						node.start,
						node.end,
						transformContext,
					),
				);

				transformContext.lastLabel = '';

				return;
			}

			const origDeclarator = origDeclarators[0];

			const origInit = origDeclarator.init;

			const memoDeclarator = createMemoDeclarator(
				origDeclarator.id,

				origInit && nodes.resetNode(origInit),

				transformContext,

				runtimeApiNames.createMemo,
			);

			if (memoDeclarator) {
				const memoId = memoDeclarator.id as Identifier;

				lastScope.set(memoId.name, ScopeIdType.Memo);
				visitedReactives.add(memoId);

				transformContext.lastLabel = '';

				return nodes.variableDeclaration('const', [memoDeclarator]);
			}

			transformContext.lastLabel = '';

			return;
		}

		if (lastLabel === 'effect') {
			if (nodeType !== 'ExpressionStatement') {
				errors.push(
					createNodeCompileError(
						errorMessages.NON_ARROW_EFFECT,
						node.start,
						node.end,
						transformContext,
					),
				);
				transformContext.lastLabel = '';

				return SKIP;
			}

			const expression = node.expression;

			if (expression.type !== 'ArrowFunctionExpression') {
				errors.push(
					createNodeCompileError(
						errorMessages.NON_ARROW_EFFECT,
						node.start,
						node.end,
						transformContext,
					),
				);
				transformContext.lastLabel = '';

				return SKIP;
			}

			transformContext.lastLabel = '';

			return nodes.expressionStatement(
				createEffectInit(
					nodes.resetNode(expression),

					runtimeApiNames.createEffect,
				),
			);
		}
	}

	if (nodeType === 'AssignmentExpression') {
		const left = node.left;
		if (left.type === 'Identifier') {
			const idName = left.name;

			if (findInScopes(idName, scopeStack) === ScopeIdType.Signal) {
				return createSignalAssignment(
					node.operator,
					left.name,
					nodes.resetNode(node.right),
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

	const lastScope = scopeStack[scopeStack.length - 1];

	if (nodeType === 'ReturnStatement' && lastScope === transformContext.componentScope) {
		const argument = node.argument;

		if (
			argument &&
			(argument.type === 'JSXElement' || argument.type === 'JSXFragment')
		) {
			transformJsx(
				argument,
				transformContext.componentBody as BlockStatement['body'],
				compileContext,
				transformContext,
				preprocessResult,
			);

			return deleteNode(parent as Node, key);
		}

		return;
	}

	if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
		// JSX in component return is handled before, so it is safe not to check scope
		errors.push(
			createNodeCompileError(
				errorMessages.JSX_OUTSIDE_COMPONENT_RETURN,

				node.start,

				node.end,
				transformContext,
			),
		);

		return deleteNode(parent as Node, key);
	}
};

/**
 *
 *
 *
 *
 * #### Applies core transformation logic.
 *
 * #### Must be used in `onExit` traversal visitor.
 */

export const transformExitBase = (
	node: Node,
	parent: Node | Node[] | undefined,

	transformContext: TransformContext,
): void => {
	const nodeType = node.type;

	if (
		nodeType === 'ArrowFunctionExpression' ||
		nodeType === 'FunctionDeclaration' ||
		nodeType === 'FunctionExpression'
	) {
		transformContext.scopeStack.pop();
	}

	const parentType = (parent as Node | undefined)?.type;

	if (
		nodeType === 'BlockStatement' &&
		parentType !== 'ArrowFunctionExpression' &&
		parentType !== 'FunctionDeclaration' &&
		parentType !== 'FunctionExpression'
	) {
		transformContext.scopeStack.pop();
	}
};
