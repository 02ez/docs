export default {
  test: {
    include: ['src/migrations/tests/**/*.test.ts'],
    watch: false,
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    // Skip global setup that starts the server
    globalSetup: undefined,
    teardownTimeout: 500,
    // Allow longer timeouts for migration tests
    testTimeout: 15000,
  },
}