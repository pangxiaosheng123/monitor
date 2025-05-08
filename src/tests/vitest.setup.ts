// vitest.setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom';

// 扩展Vitest的断言能力，添加来自jest-dom的matchers
expect.extend(matchers);

// 每个测试后自动清理
afterEach(() => {
  cleanup();
}); 