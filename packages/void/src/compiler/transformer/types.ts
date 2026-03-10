import type { ParseResult } from '@babel/parser';
import type { Node } from '@babel/types';

import type { CompileError } from '../errors';

export type BabelNodePosition =
    | NonNullable<Node['loc']>['start']
    | NonNullable<Node['loc']>['end'];

/**
 *
 * The result of `transform` function.
 *
 */

export type TransformResult = {
    ast: ParseResult;
    errors: CompileError[];
};
