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
} from './constants';
import { generateKeywordLabel } from './utils';

/**
 *
 *
 * @param source
 *
 *
 * @returns
 *
 *
 * @example
 *
 * ```typescript
 *
 * ```
 *
 *
 */
export const preprocess = (source: string): string => {
    const sourceLength = source.length;

    /**
     * Flattened array with `PreprocessASTNode` for conventient `UserCode` and `void-js` keywords concatinating
     */
    const ast: PreprocessASTNode[] = [];

    /**
     *
     * `Set` with keys as identifier
     */

    const identifiers = new Set<string>();

    const context: PreprocessContext = {
        pos: 0,

        isRegExpAllowed: false,
    };

    /**
     *
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
            identifiers.add(token.value);

            continue;
        }

        if (token.type === 'VoidKeyword') {
            ast[ast.length] = {
                type: 'UserCode',
                value: source.slice(lastUserCodeStart, token.start),
            };

            const keyword = token.value;

            if (keyword === VOID_KEYWORDS.get('signal')) {
                const identifier = getNextToken(source, context, sourceLength);

                if (!identifier || identifier.type !== 'Identifier') {
                    throw new CompileError(
                        compileErrors.SIGNAL_WITHOUT_IDENTIFIER,

                        token.start,
                        token.end,
                    );
                }

                ast[ast.length] = { type: 'Signal' };

                lastUserCodeStart = token.end;

                continue;
            }

            if (keyword === VOID_KEYWORDS.get('effect')) {
                ast[ast.length] = { type: 'Effect' };

                lastUserCodeStart = token.end;

                continue;
            }

            if (keyword === VOID_KEYWORDS.get('computation')) {
                const identifier = getNextToken(source, context, sourceLength);

                if (!identifier || identifier.type !== 'Identifier') {
                    throw new CompileError(
                        compileErrors.COMPUTATION_WITHOUT_IDENTIFIER,
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

    let transformed: string = '';

    const astLength = ast.length;

    let astIndex = 0;

    while (astIndex < astLength) {
        const node = ast[astIndex];
        if (node.type === 'UserCode') {
            transformed += node.value;
        } else if (node.type === 'Signal') {
            transformed += signalLabel + ';';
        } else if (node.type === 'Effect') {
            transformed += effectLabel + ';';
        } else if (node.type === 'Computation') {
            transformed += computationLabel + ';';
        }

        astIndex++;
    }

    return transformed;
};
/**
 *
 * #### Starts from `context.pos`.
 *
 * #### Returns the first `PreprocessToken` in the `source` argument.
 *
 * #### Returns `null` if the `source` is empty.
 *
 * @param source String with `void-js` source code.
 *
 * @param context Object with current position in `source` and useful properties like this.
 * @param sourceEnd Position in `source` to finish in.
 *
 * @returns `PreprocessToken` object or `null` if the `source` is empty.
 *
 *
 *
 * @example
 *
 * ```typescript
 * const source = 'someIdentifier';
 * getNextToken('count', , source.length);
 * ```
 *
 * output:
 *
 *
 * ```typescript
 * { type: 'Identifier', value: 'name', start: 0, end: 5 };
 * ```
 *
 */

const getNextToken = (
    source: string,

    context: PreprocessContext,
    sourceEnd: number,
): PreprocessToken | null => {
    const isExpressionStart = context.isRegExpAllowed;

    while (context.pos < sourceEnd) {
        const char = source[context.pos];

        if (IDENTIFIER_START_REGEXP.test(char)) {
            const start = context.pos;

            context.pos++;

            while (
                context.pos < sourceEnd &&
                !PUNCTUATORS.has(source[context.pos])
            ) {
                context.pos++;
            }

            const identifier = source.slice(start, context.pos);

            if (VOID_KEYWORDS.has(identifier as VoidKeyword)) {
                context.isRegExpAllowed = false;

                return {
                    type: 'VoidKeyword',
                    value: identifier,
                    start,
                    end: context.pos,
                };
            } else {
                context.isRegExpAllowed = true;

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

            context.isRegExpAllowed = true;

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

            // Comments
            if (source[context.pos] === '/') {
                context.pos++;

                while (
                    context.pos < sourceEnd &&
                    source[context.pos] !== '\n' &&
                    source[context.pos] !== '\r'
                ) {
                    context.pos++;
                }
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
            } else if (isExpressionStart) {
                // RegExp

                while (context.pos < sourceEnd && source[context.pos] !== '/') {
                    context.pos++;
                }
            }

            context.isRegExpAllowed = false;
            return { type: 'Empty', value: '', start, end: context.pos };
        }

        if (PUNCTUATORS.has(char)) {
            context.isRegExpAllowed = false;

            context.pos++;
            return {
                type: 'Punctuator',

                value: char,

                start: context.pos,
                end: context.pos,
            };
        }

        if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
            context.pos++;
        }

        // fallback

        context.isRegExpAllowed = false;

        context.pos++;
        return {
            type: 'Empty',

            value: '',

            start: context.pos,
            end: context.pos,
        };
    }

    return null;
};
