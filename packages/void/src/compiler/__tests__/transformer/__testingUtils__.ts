import MagicString from 'magic-string';

import type { RuntimeApiName } from '../../types';
import type { PreprocessResult } from '../../preprocessor';

/**
 *
 * #### Returns `Map` with unique runtime API names ({@link PreprocessResult.runtimeApiNames}) as if it was created by preprocessor.
 * #### Used to imitate results from preprocessor in transformer tests.
 *
 * @returns {Map} {@link PreprocessResult.runtimeApiNames}
 */

export const generateRuntimeApiNames =
    (): PreprocessResult['runtimeApiNames'] => {
        const runtimeApiNames: PreprocessResult['runtimeApiNames'] = new Map();

        for (const name of [
            'Signal',

            'getValue',

            'setValue',

            'postSetValue',

            'createEffect',

            'compute',

            'createComputation',
        ] satisfies RuntimeApiName[]) {
            runtimeApiNames.set(name, '_$1610$_' + name);
        }
        return runtimeApiNames;
    };

const __magicString__ = new MagicString('abc');
export const createEmptySourceMap = () => __magicString__.generateMap();
