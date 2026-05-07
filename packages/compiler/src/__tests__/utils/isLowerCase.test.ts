import { describe, it, expect } from 'bun:test';

import { isLowerCase } from '../../utils/isLowerCase';

describe('isLowerCase', () => {
	it('should return `true` if the `string` is in lowercase and `false` if is in not', () => {
		expect(isLowerCase('abc')).toBe(true);
		expect(isLowerCase('aBc')).toBe(false);
	});
});
