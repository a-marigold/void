import MagicString from 'magic-string';

import type {
    PreprocessToken,
    PreprocessContext,
    PreprocessASTNode,
    PreprocessResult,
} from './types';
import {
    IDENTIFIER_START_REGEXP,
    PUNCTUATORS,
    VOID_KEYWORDS,
    LABEL_PREFIXES,
    TRANSFORMED_SIGNAL_KEYWORD,
    TRANSFORMED_COMPUTATION_KEYWORD,
    TRANSFORMED_COMPONENT_KEYWORD,
    COMPONENT_START_KEYWORD,
    ALLOW_REGEXP_PUNCTUATORS,
    DECLARATION_KEYWORDS,
} from './constants';

import type { VoidKeyword } from '../types';

import {
    CompileError,
    getLineIndexes,
    compileErrors,
    compileErrorCodes,
} from '../errors';

import type { LineIndexes, CompileErrorCode } from '../errors/types';

import { generateUniqueIdentifier } from './utils';

/**
 *
 *
 *
 * #### Transforms `void-js` syntax to valid `jsx`.
 * #### Generates unique labels for `void-js` syntax (like `signal`) to identify it in transformer later.
 *
 *
 * @param source String with `void-js` source code.
 * @returns String with valid `jsx` to be transformed.
 *
 * @example
 * ```typescript
 * preprocess(`
 * signal count = 10;
 * computation doubled = () => count * 2;
 *
 * effect () => {
 *   console.log(doubled);
 * };`);
 * ```
 *
 * Output:
 *
 *
 * ```typescript
 * let _$singal, _$effect, _$computation; // initialized labels
 *
 * _$signal; // added label to identify signal in transformer
 * let count = 10;
 *
 * _$computation; // added label to identify computation in transformer
 * const dobuled = () => count * 2;
 *
 * _$effect = () => { // effects do not have regular labels. they have assignment instead. that is better for transformer
 *   console.log(doubled);
 * };
 * ```
 *
 */

export const preprocess = (source: string): PreprocessResult => {
    /**
     *
     * {@link PreprocessResult.errors}.
     */
    const errors: CompileError[] = [];

    /**
     *
     * Array with positions of `\n` characters in source.
     *
     * Used for correct error positions.
     */
    const lineIndexes = getLineIndexes(source);

    /**
     *
     * Flattened array with `PreprocessASTNode` for conventient `UserCode` and `void-js` keywords concatinating.
     */
    const ast: PreprocessASTNode[] = [];

    /**
     *
     * `Set` with all identifiers of `source`.
     */
    const identifiers = new Set<string>();

    const context: PreprocessContext = {
        source,
        pos: 0,
        isRegExpAllowed: true,
    };

    /**
     *
     * The last token that `getNextToken` returned.
     */

    let lastToken: PreprocessToken | null = null;

    const currentToken = getNextToken(context);
    while (currentToken) {
        if (currentToken.type === 'Identifier') {
            // Dot and bracket notation
            if (lastToken?.value === '.' || lastToken?.value === '[') {
                lastToken = currentToken;

                continue;
            }
            const identifier = currentToken.value;
            if (identifier !== COMPONENT_START_KEYWORD) {
                identifiers.add(identifier);

                lastToken = currentToken;
                continue;
            }

            const componentStartSymbol = getNextToken(context);

            if (componentStartSymbol?.value !== '<') {
                lastToken = currentToken;

                continue;
            }

            const componentName = expectNextToken(
                context,
                lineIndexes,
                errors,

                'Identifier',
                null,

                compileErrors.IDENTIFIER_EXPECTED('component'),
            );

            if (componentName === compileErrorCodes.Fatal) {
                ast[ast.length] = {
                    type: 'RecoveredFatal',
                    start: currentToken.start,
                    end: context.pos - 1,
                };

                break;
            }

            if (
                expectNextToken(
                    context,
                    lineIndexes,
                    errors,
                    'Punctuator',
                    '>',
                    compileErrors.TOKEN_EXPECTED('>'),
                ) === compileErrorCodes.Fatal
            ) {
                ast[ast.length] = {
                    type: 'RecoveredFatal',
                    start: currentToken.start,
                    end: context.pos - 1,
                };

                break;
            }

            const propsStartSymbol = expectNextToken(
                context,
                lineIndexes,

                errors,

                'Punctuator',
                '(',
                compileErrors.TOKEN_EXPECTED('('),
            );

            if (propsStartSymbol === compileErrorCodes.Fatal) {
                ast[ast.length] = {
                    type: 'RecoveredFatal',
                    start: currentToken.start,
                    end: currentToken.end,
                };

                break;
            }
            const propsStartSymbolEnd = context.pos;

            let openedBracketCount = 1;
            let closedBracketCount = 0;
            props: while (openedBracketCount > closedBracketCount) {
                const token = getNextToken(context);

                if (!token) {
                    break props;
                }

                if (token.value === '(') {
                    openedBracketCount++;
                } else if (token.value === ')') {
                    closedBracketCount++;
                }
            }

            const propsEnd = context.pos;

            if (propsStartSymbol === compileErrorCodes.Recoverable) {
                ast[ast.length] = {
                    type: 'RecoveredComponent',
                    start: currentToken.start,
                    end: propsEnd,
                    props: '(' + source.slice(propsStartSymbolEnd, propsEnd),
                };

                continue;
            }

            if (componentName === compileErrorCodes.Recoverable) {
                ast[ast.length] = {
                    type: 'RecoveredComponent',
                    start: componentStartSymbol.start,
                    end: propsEnd,
                    props: source.slice(propsStartSymbol.start, propsEnd),
                };

                continue;
            }

            ast[ast.length] = {
                type: 'Component',
                start: componentStartSymbol.start,

                end: propsEnd,
                name: componentName.value,

                props: source.slice(propsStartSymbol.start, propsEnd),
            };

            continue;
        }

        if (currentToken.type === 'VoidKeyword') {
            if (DECLARATION_KEYWORDS.has(lastToken?.value ?? '')) {
                errors[errors.length] = CompileError.fromAbsolutePos(
                    lineIndexes,
                    compileErrors.KEYWORD_AS_VARIABLE_NAME(currentToken.value),
                    currentToken.start,
                    currentToken.end,
                );

                continue;
            }

            const keyword = currentToken.value as VoidKeyword;

            if (keyword === 'signal') {
                ast[ast.length] = {
                    type: 'Signal',

                    start: currentToken.start,

                    end: currentToken.end,
                };
            } else if (keyword === 'effect') {
                ast[ast.length] = {
                    type: 'Effect',
                    start: currentToken.start,

                    end: currentToken.end,
                };
            } else if (keyword === 'computation') {
                ast[ast.length] = {
                    type: 'Computation',

                    start: currentToken.start,
                    end: currentToken.end,
                };
            }

            lastToken = currentToken;

            continue;
        }

        lastToken = currentToken;
    }

    const signalLabel = generateUniqueIdentifier(
        identifiers,
        LABEL_PREFIXES.signal,
    );
    const effectLabel = generateUniqueIdentifier(
        identifiers,

        LABEL_PREFIXES.effect,
    );
    const computationLabel = generateUniqueIdentifier(
        identifiers,
        LABEL_PREFIXES.computation,
    );
    const componentLabel = generateUniqueIdentifier(
        identifiers,
        LABEL_PREFIXES.component,
    );
    const recoveredComponentLabel = generateUniqueIdentifier(
        identifiers,

        LABEL_PREFIXES.recoveredComponent,
    );

    const magicString = new MagicString(source);

    magicString.prepend(
        'let ' + signalLabel + ',' + effectLabel + ',' + computationLabel + ';',
    );

    // transformed labels for keywords to be concatinated in transformation

    const transformedSignal =
        ';' + signalLabel + ';' + TRANSFORMED_SIGNAL_KEYWORD + ' ';

    const transformedEffect = effectLabel + '=';

    const transformedComputation =
        ';' + computationLabel + ';' + TRANSFORMED_COMPUTATION_KEYWORD + ' ';

    const transformedComponent = TRANSFORMED_COMPONENT_KEYWORD + ' ';

    const transformedRecoveredComponent = recoveredComponentLabel + '=';

    const astLength = ast.length;

    let astIndex = 0;
    while (astIndex < astLength) {
        const node = ast[astIndex];

        if (node.type === 'Signal') {
            magicString.overwrite(node.start, node.end, transformedSignal);
        } else if (node.type === 'Effect') {
            magicString.overwrite(node.start, node.end, transformedEffect);
        } else if (node.type === 'Computation') {
            magicString.overwrite(node.start, node.end, transformedComputation);
        } else if (node.type === 'Component') {
            magicString.overwrite(
                node.start,
                node.end,
                transformedComponent + node.name + '=' + node.props + '=>',
            );
        } else if (node.type === 'RecoveredFatal') {
            magicString.overwrite(node.start, node.end, '');
        } else if (node.type === 'RecoveredComponent') {
            magicString.overwrite(
                node.start,
                node.end,
                transformedRecoveredComponent + node.props + '=>',
            );
        }

        astIndex++;
    }

    return {
        code: magicString.toString(),
        sourceMap: magicString.generateMap({ hires: true }),
        errors,

        keywordLabels: new Map([
            [signalLabel, 'signal'],
            [effectLabel, 'effect'],
            [computationLabel, 'computation'],
        ]),
        runtimeApiNames: new Map([
            ['Signal', generateUniqueIdentifier(identifiers, '_$st')],
            ['getValue', generateUniqueIdentifier(identifiers, '_$gv')],
            ['setValue', generateUniqueIdentifier(identifiers, '_$sv')],
            ['postSetValue', generateUniqueIdentifier(identifiers, '_$psv')],
            ['createEffect', generateUniqueIdentifier(identifiers, '_$ce')],
            [
                'createComputation',
                generateUniqueIdentifier(identifiers, '_$cc'),
            ],
            ['compute', generateUniqueIdentifier(identifiers, '_$c')],
        ]),
    };
};

/**
 * #### Starts from `context.pos`.
 * #### Returns the first `PreprocessToken` in the `source` argument.
 * #### Returns `null` if the `source` is empty.
 *
 * @param context Object with current position in `source` and useful properties like this.
 *
 *
 *
 * @returns `PreprocessToken` object or `null` if the `source` is empty.
 *
 * @example
 *
 * ```typescript
 * const source = 'someIdentifier';
 * getNextToken('count', , source.length);
 * ```
 *
 * Output:
 *
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 *
 */

export const getNextToken = (
    context: PreprocessContext,
): PreprocessToken | null => {
    const source = context.source;

    const sourceLength = source.length;

    while (context.pos < sourceLength) {
        const char = source[context.pos];

        if (IDENTIFIER_START_REGEXP.test(char)) {
            const start = context.pos;

            context.pos++;

            while (
                context.pos < sourceLength &&
                source[context.pos] !== ' ' &&
                source[context.pos] !== '\n' &&
                source[context.pos] !== '\r' &&
                source[context.pos] !== '\t' &&
                !PUNCTUATORS.has(source[context.pos])
            ) {
                context.pos++;
            }

            const identifier = source.slice(start, context.pos);

            context.isRegExpAllowed = false;

            return {
                type: VOID_KEYWORDS.has(identifier as VoidKeyword)
                    ? 'VoidKeyword'
                    : 'Identifier',
                value: identifier,
                start,
                end: context.pos,
            };
        }

        if (char === "'" || char === '"' || char === '`') {
            const start = context.pos;

            context.pos++;

            const startQuote = source[start];

            while (
                context.pos < sourceLength &&
                !(
                    source[context.pos] === startQuote &&
                    source[context.pos - 1] !== '\\'
                )
            ) {
                context.pos++;
            }

            context.pos++;

            context.isRegExpAllowed = false;

            return {
                type: 'Literal',
                value: '', // there is no need to store strings to tokens
                start,
                end: context.pos,
            };
        }

        if (char >= '0' && char <= '9') {
            const start = context.pos;

            context.pos++;

            while (
                context.pos < sourceLength &&
                ((source[context.pos] >= '0' && source[context.pos] <= '9') ||
                    source[context.pos] === '_')
            ) {
                context.pos++;
            }

            context.isRegExpAllowed = false;

            return {
                type: 'Literal',
                value: '', // there is no need to store numbers in tokens

                start,
                end: context.pos,
            };
        }

        if (char === '/') {
            const start = context.pos;

            context.pos++;

            if (source[context.pos] === '/') {
                context.pos++;

                while (
                    context.pos < sourceLength &&
                    source[context.pos] !== '\n' &&
                    source[context.pos] !== '\r'
                ) {
                    context.pos++;
                }

                context.isRegExpAllowed = true;
            } else if (source[context.pos] === '*') {
                context.pos++;

                while (
                    context.pos < sourceLength &&
                    !(
                        source[context.pos] === '*' &&
                        source[context.pos + 1] === '/'
                    )
                ) {
                    context.pos++;
                }

                context.pos += 2;

                context.isRegExpAllowed = true;
            } else if (context.isRegExpAllowed) {
                while (
                    context.pos < sourceLength &&
                    !(
                        source[context.pos] === '/' &&
                        source[context.pos - 1] === '\\'
                    )
                ) {
                    context.pos++;
                }

                context.pos++;

                context.isRegExpAllowed = false;
            } else {
                return {
                    type: 'Punctuator',
                    value: char,

                    start,
                    end: context.pos,
                };
            }

            continue;
        }

        if (PUNCTUATORS.has(char)) {
            const start = context.pos;

            context.pos++;

            if (ALLOW_REGEXP_PUNCTUATORS.has(char)) {
                context.isRegExpAllowed = true;
            } else {
                context.isRegExpAllowed = false;
            }

            return {
                type: 'Punctuator',

                value: char,

                start,

                end: context.pos,
            };
        }

        // fallback

        context.pos++;
    }

    return null;
};

/**
 *
 * #### Adds new `CompileError` instance to `errors` if next token is `null` or it does not match `expectedType` or `expectedValue`.
 * #### Returns {@link compileErrorCodes.Fatal} if the next token is `null`.
 * #### Returns {@link compileErrorCodes.Recoverable} if the next token does not match arguments.
 * #### Returns the next token if everything is ok.
 *
 * @param context {@link PreprocessContext}.
 * @param lineIndexes Result of {@link getLineIndexes} call.
 * @param errors Array with `CompileError` instances.
 *
 * @param expectedType Expected `type` of next token.
 *
 * @param expectedValue Expected `value` of next token.
 *
 * @param message Message that will be in CompileError.
 *
 *
 *
 *
 *
 *
 */

export const expectNextToken = (
    context: PreprocessContext,
    lineIndexes: LineIndexes,
    errors: CompileError[],

    expectedType: PreprocessToken['type'],
    expectedValue: PreprocessToken['value'] | null,

    message: string,
): PreprocessToken | CompileErrorCode => {
    const prevTokenEnd = context.pos;
    const nextToken = getNextToken(context);

    if (!nextToken) {
        errors[errors.length] = CompileError.fromAbsolutePos(
            lineIndexes,
            message,
            prevTokenEnd,
            context.pos - 1,
        );

        return compileErrorCodes.Fatal;
    }

    if (
        (expectedValue && nextToken.value !== expectedValue) ||
        nextToken.type !== expectedType
    ) {
        errors[errors.length] = CompileError.fromAbsolutePos(
            lineIndexes,
            message,
            nextToken.start,
            nextToken.end,
        );

        return compileErrorCodes.Recoverable;
    }

    return nextToken;
};
