import type { Node } from '@babel/types';

export type BabelNodePosition =
    | NonNullable<Node['loc']>['start']
    | NonNullable<Node['loc']>['end'];
