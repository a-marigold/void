import { describe, it, expect } from 'bun:test';

import { checkIsCapitalize } from '../../utils/checkIsCapitalize';

describe('checkIsCapitalize', () => {
	it('should return `true` if the `string` is in capitalized and `false` if is not', () => {
		expect(checkIsCapitalize('Abc')).toBe(true);
		expect(checkIsCapitalize('Xbc')).toBe(true);

		expect(checkIsCapitalize('aBC')).toBe(false);
		expect(checkIsCapitalize('xXC')).toBe(false);
	});

	it('should return `false` for non-ASCII strings', () => {
		expect(checkIsCapitalize('ёжик')).toBe(false);
		expect(checkIsCapitalize('Бreak')).toBe(false);
	});
});
