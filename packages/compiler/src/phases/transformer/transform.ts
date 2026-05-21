import { TraceMap } from '@jridgewell/trace-mapping';
import { parseSync } from 'oxc-parser';
import type {
	Node,
	IdentifierName as Identifier,
	ArrowFunctionExpression,
	MemberExpression,
	Expression,
	VariableDeclaration,
	BlockStatement,
} from 'oxc-parser';
import { traverse, SKIP } from 'polyast';

import { compileErrors, getLineIndexes } from '../../errors';
import type { CompileContext } from '../../types';
import type { PreprocessResult } from '../preprocessor';

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

	const scopeStack: TransformContext['scopeStack'] = [new Map()];

	const parsed = parseSync('', code, oxcParserOptions);

	const program = parsed.program;

	const transformContext: TransformContext = {
		lastLabel: '',
		isFirstVarDeclaration: true,
		scopeStack,
		fnScopeCount: 0,
		componentFnScope: -1,
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
) => {
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

		const parentType = (parent as Node).type;

		if (
			parentType === 'ArrowFunctionExpression' ||
			parentType === 'FunctionDeclaration'
		) {
			transformContext.fnScopeCount++;

			// Only component can be a child of Function
			if (lastLabel) {
				transformContext.componentFnScope = transformContext.fnScopeCount;
				transformContext.lastLabel = '';
			}
		}
		return;
	}

	if (lastLabel) {
		const lastScope = scopeStack[scopeStack.length - 1];

		if (lastLabel === 'signal') {
			const origDeclarators = (node as VariableDeclaration).declarations;

			if (origDeclarators.length > 1) {
				errors.push(
					createNodeCompileError(
						compileErrors.REACTIVE_MULTIPLE_DECLARATORS(
							'signal',
						),

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
						compileErrors.REACTIVE_MULTIPLE_DECLARATORS('memo'),
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
			transformContext.lastLabel = '';

			return createEffectCall(
				nodes.resetNode(
					nodeType === 'ExpressionStatement'
						? node.expression
						: (node as Expression),
				),

				runtimeApiNames.createEffect,
			);
		}

		if (lastLabel === 'component' && nodeType === 'ExportNamedDeclaration') {
			const body = (
				(node.declaration as VariableDeclaration).declarations[0]
					.init as ArrowFunctionExpression
			).body;

			if (body.type !== 'BlockStatement') {
				errors.push(
					createNodeCompileError(
						compileErrors.COMPONENT_NON_BLOCK_BODY,

						body.start,

						body.end,
						transformContext,
					),
				);

				transformContext.lastLabel = '';

				return SKIP;
			}

			transformContext.componentBody = body.body;

			// Not reseting `lastLabel` because it is done in `BlockStatement` logic.
			return;
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

	if (
		nodeType === 'ReturnStatement' &&
		transformContext.componentFnScope === transformContext.fnScopeCount
	) {
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
				transformContext,
				preprocessResult,
			);

			return nodes.emptyStatement();
		}

		return;
	}

	if (nodeType === 'JSXElement' || nodeType === 'JSXFragment') {
		// JSX in component is handled before, so it is safe not to check scope

		errors.push(
			createNodeCompileError(
				compileErrors.JSX_OUTSIDE_COMPONENT_RETURN,
				node.start,

				node.end,

				transformContext,
			),
		);
		return nodes.emptyStatement();
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
 *
 *
 *
 *
 *
 *
 *
 */

export const transformExitBase = (
	node: Node,

	parent: Node | Node[] | undefined,

	transformContext: TransformContext,
): void => {
	if (node.type === 'BlockStatement') {
		transformContext.scopeStack.pop();

		const parentType = (parent as Node)?.type;

		if (
			parentType === 'ArrowFunctionExpression' ||
			parentType === 'FunctionDeclaration'
		) {
			transformContext.fnScopeCount--;
		}
	}
};
