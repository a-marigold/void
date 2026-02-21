import type {
    PreprocessToken,
    VoidKeyword,
    PreprocessContext,
    PreprocessASTNode,
} from './types';

import { CompileError } from '../errors/CompileError';

import { compileErrors } from '../errors';

import {
    IDENTIFIER_START_REGEXP,
    PUNCTUATORS,
    VOID_KEYWORDS,
    KEYWORD_LABEL_PREFIXES,
    TRANSFORMED_SIGNAL_KEYWORD,
    COMPONENT_START_KEYWORD,
    ALLOW_REGEXP_PUNCTUATORS,
} from './constants';
import { generateKeywordLabel } from './utils';
import { watch } from 'rollup';

/**
 *
 *
 * #### Transforms `void-js` syntax to valid `jsx`.
 * #### Generates unique labels for `void-js` syntax (like `signal`) to identify it in parser later.
 * #### Does not depend on types.
 *
 * @param source String with `void-js` source code.
 *
 * @returns
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
 * _$signal; // added label to identify signal in parser
 * let count = 10;
 *
 * _$computation;
 * const dobuled = () => count * 2;
 *
 * _$effect;
 * () => {
 *   console.log(doubled);
 * };;
 * ```
 *
 */
export const preprocess = (source: string): string => {
    const sourceLength = source.length;

    /**
     * Flattened array with `PreprocessASTNode` for conventient `UserCode` and `void-js` keywords concatinating.
     */
    const ast: PreprocessASTNode[] = [];

    /**
     *
     * `Set` with keys as identifier.
     *
     *
     *
     *
     *
     *
     */

    const identifiers = new Set<string>();

    const context: PreprocessContext = {
        pos: 0,

        isRegExpAllowed: true,
    };

    /**
     *
     * Last position in `source` where user code (arbitrary code, code that is not `void-js` syntax) is started.
     *
     */

    let lastUserCodeStart: number = 0;

    while (context.pos < sourceLength) {
        const token = getNextToken(source, context, sourceLength);

        if (!token) {
            break;
        }

        if (token.type === 'Identifier') {
            if (token.value === COMPONENT_START_KEYWORD) {
                const componentStartSymbol = getNextToken(
                    source,
                    context,
                    sourceLength,
                );

                if (componentStartSymbol?.value === '<') {
                    const componentName = expectNextToken(
                        source,
                        context,
                        sourceLength,
                        'Identifier',
                        null,
                        compileErrors.IDENTIFIER_EXPECTED('component'),
                        context.pos,
                    );

                    expectNextToken(
                        source,
                        context,
                        sourceLength,
                        'Punctuator',
                        '>',
                        compileErrors.TOKEN_EXPECTED('>'),
                        context.pos,
                    );

                    const propsStartSymbol = expectNextToken(
                        source,
                        context,
                        sourceLength,
                        'Punctuator',
                        '(',

                        compileErrors.TOKEN_EXPECTED('('),

                        context.pos,
                    );

                    const propsStart = propsStartSymbol.start;

                    let openedBracketCount = 1;
                    let closedBracketCount = 0;

                    props: while (openedBracketCount > closedBracketCount) {
                        const token = getNextToken(
                            source,

                            context,

                            sourceLength,
                        );

                        if (!token) {
                            break props;
                        }

                        if (token.value === '(') {
                            openedBracketCount++;
                        } else if (token.value === ')') {
                            closedBracketCount++;
                        }
                    }

                    ast[ast.length] = {
                        type: 'Component',

                        name: componentName.value,

                        props: source.slice(propsStart, context.pos),
                    };

                    lastUserCodeStart = context.pos;
                }

                continue;
            }

            identifiers.add(token.value);

            continue;
        }

        if (token.type === 'VoidKeyword') {
            ast[ast.length] = {
                type: 'UserCode',

                value: source.slice(lastUserCodeStart, token.start),
            };

            const keyword = VOID_KEYWORDS.get(token.value as VoidKeyword);

            if (keyword === 'signal') {
                const identifier = getNextToken(source, context, sourceLength);

                if (!identifier || identifier.type !== 'Identifier') {
                    throw new CompileError(
                        compileErrors.IDENTIFIER_EXPECTED(keyword),

                        token.start,

                        token.end,
                    );
                }

                ast[ast.length] = { type: 'Signal' };

                lastUserCodeStart = token.end;

                continue;
            }

            if (keyword === 'effect') {
                ast[ast.length] = { type: 'Effect' };

                lastUserCodeStart = token.end;

                continue;
            }

            if (keyword === 'computation') {
                const identifier = getNextToken(source, context, sourceLength);

                if (!identifier || identifier.type !== 'Identifier') {
                    throw new CompileError(
                        compileErrors.IDENTIFIER_EXPECTED(keyword),

                        token.start,

                        token.end,
                    );
                }

                ast[ast.length] = { type: 'Computation' };

                lastUserCodeStart = token.end;

                continue;
            }
        }
    }

    if (lastUserCodeStart < sourceLength) {
        ast[ast.length] = {
            type: 'UserCode',
            value: source.slice(lastUserCodeStart, sourceLength),
        };
    }

    const signalLabel = generateKeywordLabel(
        identifiers,

        KEYWORD_LABEL_PREFIXES.signal,
    );

    const effectLabel = generateKeywordLabel(
        identifiers,

        KEYWORD_LABEL_PREFIXES.effect,
    );

    const computationLabel = generateKeywordLabel(
        identifiers,

        KEYWORD_LABEL_PREFIXES.computation,
    );

    /**
     *
     * Transformed JSX from `void-js` code.
     *
     * There are labels of keywords on the first line.
     *
     */
    let transformed: string =
        'let ' +
        signalLabel +
        ',' +
        effectLabel +
        ',' +
        computationLabel +
        ';\n';

    // transformed parts of keywords to be concatinated in transformation

    const transformedSignal =
        ';' + signalLabel + ';\n' + TRANSFORMED_SIGNAL_KEYWORD + ' ';
    const transformedEffect = ';' + effectLabel + ';';
    const transformedComputation = ';' + computationLabel + ';';

    const astLength = ast.length;

    let astIndex = 0;

    while (astIndex < astLength) {
        const node = ast[astIndex];
        if (node.type === 'UserCode') {
            transformed += node.value;
        } else if (node.type === 'Signal') {
            transformed += transformedSignal;
        } else if (node.type === 'Effect') {
            transformed += transformedEffect;
        } else if (node.type === 'Computation') {
            transformed += transformedComputation;
        } else if (node.type === 'Component') {
            transformed += 'const ' + node.name + '=' + node.props + '=>';
        }
        astIndex++;
    }

    return transformed;
};

/**
 *
 * #### Starts from `context.pos`.
 * #### Returns the first `PreprocessToken` in the `source` argument.
 * #### Returns `null` if the `source` is empty.
 *
 * @param source String with `void-js` source code.
 * @param context Object with current position in `source` and useful properties like this.
 * @param sourceEnd Position in `source` to finish in.
 *
 * @returns `PreprocessToken` object or `null` if the `source` is empty.
 *
 * @example
 *
 * ```typescript
 * const source = 'someIdentifier';
 * getNextToken('count', , source.length);
 * ```
 * Output:
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 *
 */

export const getNextToken = (
    source: string,
    context: PreprocessContext,
    sourceEnd: number,
): PreprocessToken | null => {
    while (context.pos < sourceEnd) {
        const char = source[context.pos];

        if (IDENTIFIER_START_REGEXP.test(char)) {
            const start = context.pos;

            context.pos++;

            while (
                context.pos < sourceEnd &&
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

            if (VOID_KEYWORDS.has(identifier as VoidKeyword)) {
                return {
                    type: 'VoidKeyword',
                    value: identifier,
                    start,
                    end: context.pos,
                };
            } else {
                return {
                    type: 'Identifier',
                    value: identifier,
                    start,
                    end: context.pos,
                };
            }
        }

        if (char === "'" || char === '"' || char === '`') {
            const start = context.pos;

            context.pos++;

            const startQuote = source[start];

            while (
                context.pos < sourceEnd &&
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
                context.pos < sourceEnd &&
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
                    context.pos < sourceEnd &&
                    source[context.pos] !== '\n' &&
                    source[context.pos] !== '\r'
                ) {
                    context.pos++;
                }

                context.isRegExpAllowed = true;
            } else if (source[context.pos] === '*') {
                context.pos++;

                while (
                    context.pos < sourceEnd &&
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
                    context.pos < sourceEnd &&
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
 *
 *
 * #### Throws `CompileError` if next token is `null` or it does not match `expected` argument, otherwise Returns the next token.
 *
 *
 * @param source
 * @param context
 * @param sourceEnd
 * @param expected Object with expected properties of next token.
 * @param errorMessage Message that will be in CompileError.
 * @param prevTokenEnd End position of previous token. Needed for cases when next token is `null` to throw `CompileError` with `prevTokenEnd` as `sourceStart`.
 *
 *
 * @throws CompileError with `errorMessage`.
 * @returns The next token of `source`.
 *
 *
 *
 *
 *
 *
 *
 *
 */

export const expectNextToken = (
    source: string,

    context: PreprocessContext,

    sourceEnd: number,

    expectedType: PreprocessToken['type'],

    expectedValue: PreprocessToken['value'] | null,

    errorMessage: string,
    prevTokenEnd: number,
): PreprocessToken => {
    const nextToken = getNextToken(source, context, sourceEnd);

    if (!nextToken) {
        throw new CompileError(errorMessage, prevTokenEnd, sourceEnd);
    }

    if (
        (expectedValue && nextToken.value !== expectedValue) ||
        nextToken.type !== expectedType
    ) {
        throw new CompileError(errorMessage, nextToken.start, nextToken.end);
    }

    return nextToken;
};
