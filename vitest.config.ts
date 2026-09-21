import { defineConfig } from 'vitest/config';

/**
 * 测试专用配置。
 *
 * 刻意不复用 vite.config.ts：engine/ 下全是纯 TypeScript，既不需要 React 插件
 * 也不该在跑单测时去生成 Service Worker。分开之后测试输出干净，也跑得更快。
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
