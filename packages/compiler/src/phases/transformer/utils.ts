import { originalPositionFor } from '@jridgewell/trace-mapping';
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
} from 'oxc-parser';
import { SKIP } from 'polyast';

import { errorMessages, createCompileError, getIndexLoc } from '../../errors';
import type { CompileError } from '../../errors';
import type { PreprocessResult } from '../preprocessor';

import type { ScopeIdType } from './constants';
import * as nodes from './nodes';
import type { TransformContext, Scope, VisitedReactives } from './types';

/**
 * #### Creates {@link VariableDeclarator} for `signal` identifier from original identifier and original initial value.
 * #### Adds appeared errors to `errors`.
 *
 *
 *
 * @param originalId Identifier (left hand side in variable declaration) from `void-js` source file.
 * @param initialValue Initial value of `signal` identifier.
 * @param transformContext Used for errors.
 *
 *
 * @returns `VariableDeclarator` of signal or `null` if there is an error.
 */
export const createSignalDeclarator = (
	originalId: VariableDeclarator['id'],
	initialValue: VariableDeclarator['init'],
	transformContext: TransformContext,
): VariableDeclarator | null => {
	const errors = transformContext.errors;

	if (!initialValue) {
		errors.push(
			createNodeCompileError(
				errorMessages.SIGNAL_WITHOUT_INITIAL_VALUE,
				originalId.start,
				originalId.end,
				transformContext,
			),
		);

		return null;
	}

	if (originalId.type !== 'Identifier') {
		errors.push(
			createNodeCompileError(
				errorMessages.SIGNAL_DECL_DESTRUCTURING,
				originalId.start,
				originalId.end,

				transformContext,
			),
		);

		return null;
	}

	const identifier = nodes.identifier(originalId.name);

	return nodes.variableDeclarator(
		identifier,

		nodes.objectExpression([
			nodes.objectProperty(
				nodes.identifier('subscribers'), // TODO: remove key names to constants

				nodes.newExpression(nodes.identifier('Set'), []),
			),

			nodes.objectProperty(nodes.identifier('value'), initialValue),
		]),
	);
};

/**
 *
 *
 * #### Creates `VariableDeclarator` for `memo` from original identifier and initial value.
 * #### Adds appeared errors to `errors`.
 *
 * @param originalId Identifier of memo.
 * @param initialValue Initial value of memo.
 * @param transformContext Used for errors.
 * @param createMemoName Name of `createMemo` in {@link PreprocessResult.runtimeApiNames}.
 *
 *
 *
 * @returns {VariableDeclaration} {@link VariableDeclaration} of memo or `null` if there is an error.
 *
 *
 *
 *
 */

export const createMemoDeclarator = (
	originalId: VariableDeclarator['id'],
	initialValue: VariableDeclarator['init'],
	transformContext: TransformContext,
	createMemoName: string,
): VariableDeclarator | null => {
	const errors = transformContext.errors;

	if (!initialValue) {
		errors.push(
			createNodeCompileError(
				errorMessages.MEMO_WITHOUT_INITIAL_VALUE,

				originalId.start,

				originalId.end,

				transformContext,
			),
		);

		return null;
	}

	if (originalId.type !== 'Identifier') {
		errors.push(
			createNodeCompileError(
				errorMessages.MEMO_DECL_DESTRUCTURING,

				originalId.start,

				originalId.end,

				transformContext,
			),
		);

		return null;
	}

	const createMemoCall = nodes.callExpression(
		nodes.identifier(createMemoName),

		[initialValue],

		null,
	);

	return nodes.variableDeclarator(nodes.identifier(originalId.name), createMemoCall);
};

/**
 *
 * #### Creates `signal` setter call (`setValue`  function)  with correct operator.
 * #### Adds identifier of signal argument of setter  to `visitedReactives` to prevent circular transformation of it.
 *
 * @param operator Operator of original assignment expression.
 * @param signalIdName Name of signal identifier.
 * @param value Value of assignment.
 * @param visitedReactives {@link VisitedReactives}.
 * @param setValueName name of `setValue` in {@link PreprocessResult.runtimeApiNames}.
 *
 * @returns `CallExpression` of signal setter or `LogicalExpression` if `operator` is `'||='`,`'??='`, `'&&='`.
 *
 *
 * 		 @example
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
	operator: AssignmentExpression['operator'],
	signalIdName: string,
	value: Expression,

	setValueName: string,
	visitedReactives: VisitedReactives,
): CallExpression | LogicalExpression => {
	const binaryOperator = operator.slice(0, operator.length - 1) as
		| BinaryExpression['operator']
		| LogicalExpression['operator']
		| '';

	const signalArg = nodes.identifier(signalIdName);
	visitedReactives.add(signalArg);

	if (binaryOperator) {
		if (binaryOperator === '||' || binaryOperator === '??' || binaryOperator === '&&') {
			return nodes.binaryExpression(
				'LogicalExpression',
				binaryOperator,

				signalArg,

				nodes.callExpression(
					nodes.identifier(setValueName),
					[nodes.identifier(signalIdName), value],
					null,
				),
			);
		} else {
			return nodes.callExpression(
				nodes.identifier(setValueName),
				[
					signalArg,

					nodes.binaryExpression(
						'BinaryExpression',
						binaryOperator,
						nodes.identifier(signalIdName),
						value,
					),
				],

				null,
			);
		}
	}

	return nodes.callExpression(
		nodes.identifier(setValueName),

		[signalArg, value],

		null,
	);
};
/**
 *
 *
 * #### Creates signal setter call from an {@link UpdateExpression}.
 * #### Handles pre or post increment or decrement.
 *
 * @param signalIdName Name of signal identifier.
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
 *
 * @param operator Operator of original {@link UpdateExpression}.
 * @param prefix {@link UpdateExpression.prefix}.
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

		null,
	);

/**
 * #### Returns {@link CallExpression} object with `getterName` as callee and `reactiveIdentfierName` as argument.
 *
 * @param reactiveIdentifierName Name of signal or memo identifier.
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
 *
 *
 *
 *
 * #### Creates `createEffect` runtime api function call with `fn` argument.
 *
 * @param createEffectName Name of `createEffect` in {@link PreprocessResult.runtimeApiNames}.
 *
 * @param fn `fn` paramter of `createEffect` function.
 *
 * @returns `createEffect` function call.
 *
 *
 *
 *
 */

export const createEffectInit = (fn: Expression, createEffectName: string): CallExpression =>
	nodes.callExpression(nodes.identifier(createEffectName), [fn], null);

/**
 *
 * #### Recursively adds all identifiers appeared in `pattern` to `scope`.
 *
 *
 *
 * @param pattern {@link VariableDeclarator.id}.
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
 * #### Finds {@link ScopeIdType} of identifier `name` in `scopeStack`.
 * #### Copies found {@link ScopeIdType} from depth to the latest scope (mutation) for faster search later.
 *
 *
 *
 * @param name Name of identifier.
 * @param scopeStack Array (stack) with {@link Scope} elements.
 *
 * @returns Found value in `scopeStack` or `undefined`.
 *
 *
 *
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
		// Copy for faster search later
		lastScope.set(name, found);

		return found;
	}

	return undefined;
};

/**
 *
 * #### Sets `parent[key]` to `replacement`.
 *
 * @param replacement A new node to be inserted instead of old.
 * @param parent Parent of a node.
 * @param key Key in `parent`, where to insert replacement.
 */

export const replaceNode = (replacement: Node, parent: Node | Node[], key: string): void => {
	(parent as unknown as Record<string, unknown>)[key] = replacement;
};

/**
 * #### Sets `parent[key]` to `EmptyStatement` to delete node.
 * #### MUST be returned from `traverse` callback to skip inserted `EmptyStatement` 'cause it is unnecessary to traverse.
 *
 * @param parent Parent of node.
 * @param key Key in `parent`, where to delete node.
 *
 * @returns {SKIP} {@link SKIP}.
 */
export const deleteNode = (parent: Node | Node[], key: string): typeof SKIP => {
	(parent as unknown as Record<string, unknown>)[key] = nodes.emptyStatement();
	return SKIP;
};

/**
 *
 *
 * #### Converts `start` and `end` positions to `void-js` source file positions and returns `CompileError` instance with them.
 *
 *
 * @param message message of error.
 * @param startIndex Start index of a node in preprocessed code.
 * @param endIndex End index of a node in preprocessed code.
 * @param transformContext {@link TransformContext}.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 * @returns {CompileError} {@link CompileError}.
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

export const createNodeCompileError = (
	message: CompileError['message'],
	startIndex: number,
	endIndex: number,
	transformContext: TransformContext,
): CompileError => {
	const traceMap = transformContext.traceMap;

	const lineIndexes = transformContext.lineIndexes;

	const originalStart = originalPositionFor(
		traceMap,

		getIndexLoc(lineIndexes, startIndex),
	);

	const originalEnd = originalPositionFor(traceMap, getIndexLoc(lineIndexes, endIndex));

	return createCompileError(
		message,

		{ line: originalStart.line ?? 1, column: originalStart.column ?? 0 },

		{ line: originalEnd.line ?? 1, column: originalEnd.column ?? 0 },
	);
};
