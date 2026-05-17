import type { TraceMap } from '@jridgewell/trace-mapping';
import type { ParseResult, Node, BlockStatement } from 'oxc-parser';

import type { CompileError, LineIndexes } from '../../errors';
import type { LabelType } from '../preprocessor';

import type { ScopeIdType } from './constants';

/**
 *
 * The result of `transform` function.
 */

export type TransformResult = {
	result: ParseResult;

	errors: CompileError[];
};

/**
 *
 *
 * Object used to connect main `transform` with nested light traversals.
 */
export type TransformContext = {
	/**
	 * The last {@link LabelType} appeared in preprocessed code.
	 */

	lastLabel: LabelType | '';

	/**
	 * Used to identify is there at least one variable declaration to delete the declaration of labels in preprocessed code
	 */
	isFirstVarDeclaration: boolean;

	/**
	 * Stack with {@link Scope|scopes} of functions and code blocks.
	 *
	 * The first scope is always the global scope. The last scope is the scope of current block or function.
	 *
	 *
	 *
	 */

	scopeStack: Scope[];

	componentScope: Scope | null;

	componentBody: BlockStatement['body'] | null;

	programBody: BlockStatement['body'];

	/**
	 * `WeakMap` containing already transformed reactive identifiers to prevent circular transforming of them.
	 */

	visitedReactives: VisitedReactives;
};

/**
 *
 *
 *
 *
 * Object containing the data to create {@link CompileError}.
 */

export type ErrorContext = {
	readonly errors: CompileError[];

	/**
	 *
	 * {@link TraceMap} from preprocessed `sourceMap` for correct source positions in errors.
	 */
	readonly traceMap: TraceMap;

	/**
	 *
	 * {@link LineIndexes} from preprocessed `code`.
	 *
	 *
	 */

	readonly lineIndexes: LineIndexes;
};

/**
 *
 *
 *  `Map` with {@link ScopeIdType} of identifier names of current block or function.
 *
 */

export type Scope = Map<string, ScopeIdType>;

/**
 *
 *
 * `WeakSet` with visited reactive identifiers to prevent circular transfomation of them.
 */

export type VisitedReactives = WeakSet<Node>;
