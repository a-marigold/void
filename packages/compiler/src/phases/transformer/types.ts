import type { Node, Expression, VariableDeclaration } from 'estree';

import type { CompileError } from '../../errors';

/**
 *
 *
 *
 *
 * The result of `transform` function.
 *
 */

export type TransformResult = {
    ast: Node;
    errors: CompileError[];
};

/**
 * All appeared declarations of signals and computations.
 */
export type Reactives = Set<VariableDeclaration>;

/**
 *
 * Object with description of a dynamic node ({@link AnalyzeJSXResult.dynamicNodes})
 */
export type DynamicDescription = Parent | StaticExpression | AttributeElement;

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
type ReactiveExpression = DynamicDescriptionBase<'ReactiveExpression'> & {
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
    /**
     * `Map` with description of nodes
     * `JSXChild` > `DynamicDescription`.
     */
    dynamicNodes: Map<JSXChild, DynamicDescription>;

    /**
     *
     *
     * String to be inserted to `HTMLTemplateElement.prototype.innerHTML` (template of component).
     */

    templateString: string;
};

export type AnalyzeExpressionResult =
    | 'EmptyExpression'
    | 'Literal'
    | 'StaticExpression'
    | 'ReactiveExpression';

/**
 *
 *
 *
 * Derived from {@link JSXElement.children} babel type.
 *
 *
 */

export type JSXChild = JSXElement['children'][number];

export type ClosingHTMLTag = `</${string}>`;

// TODO: add docs

/**
 *
 * `Identifier Name` > `0` (NON Reactive identifier).
 *
 * `Identifier Name` > `1` (Reactive identifier).
 */

export type Scope = Map<string, ScopeIdType>;

/**
 * `0` means NON reactive identifier.
 *
 * `1` means Reactive identifier
 */
export type ScopeIdType = 0 | 1;
