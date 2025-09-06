export default {
  test: {
    // Default is `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`
    include: ['**/*.{test}.?(c|m)[jt]s?(x)', 'src/**/tests/*.[jt]s', 'src/**/tests/**/*.[jt]s'],
    exclude: ['**/tests/playwright-*.spec.ts'],
    // Default is `!process.env.CI`
    watch: false,
    // vitest doesn't account for tsconfig.json `paths` settings so we have to
    // manually set this alias to resolve our TS @-imports
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },

    globalSetup: './src/tests/vitest.setup.ts',
    teardownTimeout: 500,

    // Coverage configuration for production readiness
    coverage: {
      enabled: false, // Enable when COVERAGE=true environment variable is set
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      exclude: [
        '**/tests/**',
        '**/fixtures/**',
        '**/scripts/**',
        'src/tests/**',
        'src/fixtures/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
      ],
    },
  },
}
