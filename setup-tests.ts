import { beforeEach, vi } from 'bun:test';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

beforeEach(() => {
	vi.clearAllMocks();
});

GlobalRegistrator.register();
