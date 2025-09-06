export default {
  test: {
    include: ['src/performance/tests/**/*.test.ts'],
    watch: false,
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    // Skip global setup that starts the server
    globalSetup: undefined,
    teardownTimeout: 500,
    // Allow longer timeouts for performance tests
    testTimeout: 10000,
  },
}