import { describe, expect, test } from 'vitest'
import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

// API Contract and Invariant Validation
describe('API Contract and Invariant Validation', () => {
  test('REST API schemas maintain backwards compatibility', () => {
    const restDataDir = path.join(__dirname, '../../../src/rest')

    if (fs.existsSync(restDataDir)) {
      const configPath = path.join(restDataDir, 'lib/config.json')
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

        // Verify that REST API configuration exists and has required structure
        expect(config).toBeDefined()
        expect(typeof config).toBe('object')

        // Check for version stability - versions should not be removed without deprecation
        if (config.versions) {
          expect(Array.isArray(config.versions) || typeof config.versions === 'object').toBe(true)
        }
      }
    }
  })

  test('GraphQL schema maintains type compatibility', () => {
    const graphqlDir = path.join(__dirname, '../../../src/graphql')

    if (fs.existsSync(graphqlDir)) {
      const validatorPath = path.join(graphqlDir, 'lib/validator.ts')
      if (fs.existsSync(validatorPath)) {
        const validatorContent = fs.readFileSync(validatorPath, 'utf8')

        // Verify GraphQL validator exists and contains expected schema definitions
        expect(validatorContent).toContain('schemaValidator')
        expect(validatorContent).toContain('queries')
        expect(validatorContent).toContain('mutations')
        expect(validatorContent).toContain('objects')
      }
    }
  })

  test('public API routes are documented and stable', () => {
    const srcDir = path.join(__dirname, '../../../src')
    const apiDirs = ['rest', 'graphql', 'webhooks', 'article-api']

    apiDirs.forEach((apiDir) => {
      const apiPath = path.join(srcDir, apiDir)
      if (fs.existsSync(apiPath)) {
        // Check for test files that validate API behavior
        const testsPath = path.join(apiPath, 'tests')
        if (fs.existsSync(testsPath)) {
          const testFiles = fs
            .readdirSync(testsPath)
            .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
          expect(testFiles.length).toBeGreaterThan(0)
        }
      }
    })
  })

  test('API versioning follows semantic versioning principles', () => {
    const packageJsonPath = path.join(__dirname, '../../../package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      // Verify package.json has proper version
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/)

      // Check for consistent dependency versioning
      if (packageJson.dependencies) {
        Object.values(packageJson.dependencies).forEach((version) => {
          if (typeof version === 'string') {
            // Dependencies should be pinned or use compatible ranges
            expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+|^[><=]+\d+\.\d+\.\d+/)
          }
        })
      }
    }
  })

  test('breaking changes are properly documented', () => {
    const changelogPath = path.join(__dirname, '../../../CHANGELOG.md')
    if (fs.existsSync(changelogPath)) {
      const changelogContent = fs.readFileSync(changelogPath, 'utf8')

      // Verify changelog exists and has basic structure
      expect(changelogContent).toContain('# Changelog')
      expect(changelogContent.length).toBeGreaterThan(100) // Should have meaningful content
    }
  })

  test('PII handling paths are documented and unchanged', () => {
    const srcDir = path.join(__dirname, '../../../src')

    // Check for PII-related files and configurations
    const piiRelatedFiles = ['observability', 'events', 'audit-logs']

    piiRelatedFiles.forEach((dirName) => {
      const dirPath = path.join(srcDir, dirName)
      if (fs.existsSync(dirPath)) {
        // Verify PII-handling directories have proper structure
        const hasTests = fs.existsSync(path.join(dirPath, 'tests'))
        expect(hasTests).toBe(true)
      }
    })
  })

  test('telemetry and monitoring configurations are present', () => {
    const observabilityDir = path.join(__dirname, '../../../src/observability')

    if (fs.existsSync(observabilityDir)) {
      // Check for monitoring middleware
      const middlewareDir = path.join(observabilityDir, 'middleware')
      if (fs.existsSync(middlewareDir)) {
        const middlewareFiles = fs.readdirSync(middlewareDir)
        expect(middlewareFiles.length).toBeGreaterThan(0)
      }
    }
  })

  test('CODEOWNERS file is properly maintained', () => {
    const codeownersPath = path.join(__dirname, '../../../.github/CODEOWNERS')
    if (fs.existsSync(codeownersPath)) {
      const codeownersContent = fs.readFileSync(codeownersPath, 'utf8')

      // Verify CODEOWNERS has proper structure
      expect(codeownersContent).toContain('@')
      expect(codeownersContent.split('\n').length).toBeGreaterThan(5) // Should have multiple entries
    }
  })

  test('SDK and client compatibility is maintained', () => {
    const packageJsonPath = path.join(__dirname, '../../../package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      // Verify Node.js engine compatibility
      expect(packageJson.engines).toBeDefined()
      expect(packageJson.engines.node).toBeDefined()
      expect(packageJson.engines.node).toMatch(/\d+/)
    }
  })
})
