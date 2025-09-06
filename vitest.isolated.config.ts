export default {
  test: {
    include: ['src/workflows/tests/security-hardening-isolated.test.ts'],
    watch: false,
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    // Skip global setup that starts the server
    globalSetup: undefined,
    teardownTimeout: 500,
  },
}