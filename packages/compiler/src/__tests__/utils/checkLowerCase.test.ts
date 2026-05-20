import { describe, it, expect } from 'bun:test';

import { checkLowerCase } from '../../utils/checkLowerCase';

describe('checkLowerCase', () => {
	it('should return `true` if the `string` is in lowercase and `false` if is in not', () => {
		expect(checkLowerCase('abc')).toBe(true);
		expect(checkLowerCase('aBc')).toBe(false);
	});
});
