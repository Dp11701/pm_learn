import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Test trang dựng cả bài + axe trong jsdom chậm khi máy tải nặng: 5 giây mặc định gây đỏ giả.
    testTimeout: 20_000,
  },
})
