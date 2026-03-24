import type { ParseResult } from '@babel/parser';
import type {
    Node,
    Expression,
    JSXElement,
    VariableDeclaration,
} from '@babel/types';

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

/**
 *
 *
 *
 * All appeared declarations of signals and computations.
 */
export type Reactives = Set<VariableDeclaration>;

export type DynamicDescription = Parent | StaticExpression;
type DynamicDescriptionType =
    | 'Parent'
    | 'AttributeElement'
    | 'StaticExpression'
    | 'ReactiveExpression';

type Parent = Readonly<DynamicDescriptionBase<'Parent'>>;

export type AttributeElement = DynamicDescriptionBase<'AttributeElement'> & {
    attributes: Attribute[];
};

type StaticExpression = DynamicDescriptionBase<'StaticExpression'> & {
    expression: Expression;
};

type DynamicDescriptionBase<T extends DynamicDescriptionType> = { type: T };

type Attribute = {
    type: 'Static' | 'Reactive';

    /**
     * It is empty if attribute is `JSXSpreadAttribute`.
     */
    name: '' | (string & {});

    value: Expression;
};

/**
 *
 * The result of `analyzeJSXDynamics` function.
 */
export type AnalyzeJSXResult = {
    dynamicNodes: Map<JSXChild, DynamicDescription>;
    /**
     * String to be inserted to `HTMLTemplateElement.prototype.innerHTML` (template of component).
     */
    templateString: string;
};

export type AnalyzeExpressionResult =
    | AnalyzedEmptyExpression
    | AnalyzedLiteral
    | AnalyzedStaticExpression
    | AnalyzedReactiveExpression;
type AnalyzeExpressionType =
    | 'Literal'
    | 'EmptyExpression'
    | 'StaticExpression'
    | 'ReactiveExpression';

type AnalyzedEmptyExpression = AnalyzedExpressionBase<'EmptyExpression'>;

type AnalyzedLiteral = AnalyzedExpressionBase<'Literal'> & {
    value: string;
};

type AnalyzedStaticExpression = AnalyzedExpressionBase<'StaticExpression'>;
type AnalyzedReactiveExpression = AnalyzedExpressionBase<'ReactiveExpression'>;

type AnalyzedExpressionBase<T extends AnalyzeExpressionType> = {
    type: T;
};

/**
 * Derived from {@link JSXElement.children} babel type.
 */

export type JSXChild = JSXElement['children'][number];

export type ClosingHTMLTag = `</${string}>`;

// TODO: add docs
