import { describe, it, expect } from 'bun:test';

import { isUncapitalized } from '../../utils/isCapitalized';

describe('isUncapitalized', () => {
    it('should return `true` if the `string` is uncapitalized and `false` if capitalized', () => {
        expect(isUncapitalized('aBC')).toBe(true);
        expect(isUncapitalized('Abc')).toBe(false);
    });

    it('should not depend on all characters in string except the first', () => {
        const firstChar = 'a';

        expect(
            isUncapitalized(
                firstChar + 'AbcABCADKKJNGSsdfmsdflsLKFNKSDF125616',
            ),
        ).toBe(isUncapitalized(firstChar + 'abvcaABCamcslJADSDANFCMLdsdf16'));
    });
});
