/**
 * Type of analyzed JSX expression.
 *
 * Values are in ascending order from most static to most dynamic and reactive.
 *
 */
export const enum JSXExprType {
	/**
	 * `JSXEmptyExpression`.
	 */
	Empty,
	Literal,
	/**
	 * Static expression that is not only a literal and is NOT depended on reactive identifiers.
	 */
	Static,
	/**
	 * Expression depended on reactive identifiers insides.
	 */
	Reactive,
}

/**
 * Type of information of JSX nodes.
 *
 * `LiteralExpression`, `StaticExpression`, `ReactiveExpression` variants are the same with `Literal`, `Static`, `Reactive` from {@link JSXExprType}.
 */
export const enum JSXInfoType {
	LiteralExpression = JSXExprType.Literal,
	/**
	 *
	 * Static JSX expression without reactive identifiers inside.
	 *
	 */

	StaticExpression = JSXExprType.Static,
	ReactiveExpression = JSXExprType.Reactive,

	/**
	 *
	 * Node with error or fully non dynamic Node.
	 */
	NoInfo,

	/**
	 * Static parent with dynamic children.
	 */
	Parent,

	/**
	 *
	 * Element with expressions in attributes.
	 */

	AttributeElement,

	Component,
}
/**
 * Type of {@link JSXInfoType.AttributeElement}.
 */
export const enum AttrInfoType {
	Literal = JSXExprType.Literal,
	Static = JSXExprType.Static,
	Reactive = JSXExprType.Reactive,

	/**
	 *
	 * `ref` attribute with default identifier in value.
	 */
	StaticRef,
	/**
	 * `ref` attribute with signal identifier in value
	 */
	SignalRef,
}

/**
 * Offsets of {@link JSXInfoType.AttributeElement} attributes.
 */

export const enum AttrInfoOffset {
	InfoType,

	/**
	 * It is  an empty string when it is a `JSXSpreadAttribute`.
	 */

	Name,
	Value,

	/**
	 *
	 * Quantity of `AttributesInfo` array elements one attribute occupies.
	 */

	Size = 3,
}

/**
 * HTML tag that is used as anchor for dynamic content insertion (for example, components and expressions).
 */
export const ANCHOR_HTML_TAG = '<!---->';

/**
 *
 * Name of property in `HTMLElement.prototype` that refers on the first child of element.
 *
 *
 *
 */

export const FIRST_CHILD_ACCESS = 'firstChild';

/**
 * Name of property in `HTMLElement.prototype` that refers on the next sibling of element.
 *
 */

export const NEXT_SIBLING_ACCESSOR = 'nextSibling';

/**
 *
 * Keys are reflected DOM element properties (`'className'`, `'htmlFor'`).
 *
 * Values are their equivalents in valid HTML.
 */
export const SPEC_ATTR_NAMES: ReadonlyMap<string, string> = new Map([
	['className', 'class'],

	['htmlFor', 'for'],
	['httpEquiv', 'http-equiv'],

	['acceptCharset', 'accept-charset'],
	['accentHeight', 'accentheight'],
	['accessKey', 'accesskey'],
	['allowFullScreen', 'allowfullscreen'],
	['allowTransparency', 'allowtransparency'],
	['autoComplete', 'autocomplete'],
	['autoFocus', 'autofocus'],
	['autoPlay', 'autoplay'],

	['cellPadding', 'cellpadding'],
	['cellSpacing', 'cellspacing'],
	['charSet', 'charset'],
	['classID', 'classid'],
	['colSpan', 'colspan'],
	['contentEditable', 'contenteditable'],
	['contextMenu', 'contextmenu'],
	['crossOrigin', 'crossorigin'],

	['dateTime', 'datetime'],
	['encType', 'enctype'],
	['formAction', 'formaction'],
	['formEncType', 'formenctype'],
	['formMethod', 'formmethod'],
	['formNoValidate', 'formnovalidate'],
	['formTarget', 'formtarget'],
	['frameBorder', 'frameborder'],
	['hrefLang', 'hreflang'],
	['imageSizes', 'imagesizes'],
	['imageSrcSet', 'imagesrcset'],
	['imageSrc', 'imagesrc'],
	['inputMode', 'inputmode'],
	['playsInline', 'playsinline'],
	['keyParams', 'keyparams'],
	['keyType', 'keytype'],
	['marginHeight', 'marginheight'],
	['marginWidth', 'marginwidth'],
	['maxLength', 'maxlength'],
	['mediaGroup', 'mediagroup'],
	['minLength', 'minlength'],

	['noValidate', 'novalidate'],
	['radioGroup', 'radiogroup'],
	['readOnly', 'readonly'],
	['referrerPolicy', 'referrerpolicy'],
	['rowSpan', 'rowspan'],

	['spellCheck', 'spellcheck'],
	['srcDoc', 'srcdoc'],
	['srcLang', 'srclang'],
	['srcSet', 'srcset'],
	['tabIndex', 'tabindex'],
	['useMap', 'usemap'],
	['fetchPriority', 'fetchpriority'],
	['enterKeyHint', 'enterkeyhint'],
	['popoverTarget', 'popovertarget'],
	['popoverTargetAction', 'popovertargetaction'],
	['virtualKeyboardPolicy', 'virtualkeyboardpolicy'],
]);

/**
 * Names of DOM events that should be delegated.
 *
 * @example
 * ```markdown
 * `onClick`, NOT `click`.
 * ```
 */
export const DELEGABLE_EVENTS: ReadonlySet<string> = new Set([
	'onClick',

	'onInput',

	'onChange',

	'onKeyDown',

	'onKeyUp',

	'onPointerDown',

	'onPointerUp',
	'onSubmit',
]);

/**
 * `HTMLElement.prototype.setAttribute`.
 */
export const DATA_ATTR_SETTER_NAME = 'setAttribute';

export const REF_ATTR_NAME = 'ref';
