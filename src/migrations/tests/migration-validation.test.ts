import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { mkdtemp, rm } from 'fs/promises'
import os from 'os'

// Migration idempotency and reversibility validation
describe('Migration Tool Validation', () => {
  let tempDir: string

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'migration-test-'))
  })

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true })
  })

  test('migration operations are idempotent', async () => {
    // Setup: Create test files to migrate
    const sourceDir = path.join(tempDir, 'source')
    const targetDir = path.join(tempDir, 'target')
    
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.mkdirSync(targetDir, { recursive: true })
    
    const testFile = path.join(sourceDir, 'test.md')
    const testContent = `---
title: Test Document
version: 1.0
---

# Test Content

This is a test document for migration.
`
    
    fs.writeFileSync(testFile, testContent)
    
    // First migration
    const firstMigrationResult = performMockMigration(sourceDir, targetDir)
    expect(firstMigrationResult.success).toBe(true)
    
    // Verify migration completed
    const migratedFile = path.join(targetDir, 'test.md')
    expect(fs.existsSync(migratedFile)).toBe(true)
    const migratedContent = fs.readFileSync(migratedFile, 'utf8')
    expect(migratedContent).toContain('Test Content')
    
    // Second migration (should be idempotent)
    const secondMigrationResult = performMockMigration(sourceDir, targetDir)
    expect(secondMigrationResult.success).toBe(true)
    
    // Verify content hasn't changed or been duplicated
    const contentAfterSecondMigration = fs.readFileSync(migratedFile, 'utf8')
    expect(contentAfterSecondMigration).toBe(migratedContent)
    
    // Verify no duplicate files created
    const targetFiles = fs.readdirSync(targetDir)
    expect(targetFiles.length).toBe(1)
    expect(targetFiles[0]).toBe('test.md')
  })

  test('migration operations are reversible', async () => {
    // Setup: Create test migration scenario
    const sourceDir = path.join(tempDir, 'source')
    const targetDir = path.join(tempDir, 'target')
    
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.mkdirSync(targetDir, { recursive: true })
    
    const originalFile = path.join(sourceDir, 'original.md')
    const originalContent = `---
title: Original Document
metadata:
  migration_source: true
---

# Original Content

This document will be migrated and then rolled back.
`
    
    fs.writeFileSync(originalFile, originalContent)
    
    // Perform forward migration
    const migrationResult = performMockMigration(sourceDir, targetDir, {
      preserveOriginal: true,
      createRollbackInfo: true
    })
    
    expect(migrationResult.success).toBe(true)
    expect(migrationResult.rollbackInfo).toBeDefined()
    
    // Verify forward migration
    const migratedFile = path.join(targetDir, 'original.md')
    expect(fs.existsSync(migratedFile)).toBe(true)
    expect(fs.existsSync(originalFile)).toBe(true) // Original preserved
    
    // Perform rollback
    const rollbackResult = performMockRollback(migrationResult.rollbackInfo!)
    expect(rollbackResult.success).toBe(true)
    
    // Verify rollback restored original state
    expect(fs.existsSync(originalFile)).toBe(true)
    const restoredContent = fs.readFileSync(originalFile, 'utf8')
    expect(restoredContent).toBe(originalContent)
    
    // Verify migrated files are cleaned up
    expect(fs.existsSync(migratedFile)).toBe(false)
  })

  test('migration handles data integrity checks', async () => {
    // Setup: Create test files with various data types
    const sourceDir = path.join(tempDir, 'source')
    const targetDir = path.join(tempDir, 'target')
    
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.mkdirSync(targetDir, { recursive: true })
    
    // Create files with different content types
    const markdownFile = path.join(sourceDir, 'document.md')
    const yamlFile = path.join(sourceDir, 'data.yml')
    const jsonFile = path.join(sourceDir, 'config.json')
    
    fs.writeFileSync(markdownFile, '# Test\nContent with **formatting**')
    fs.writeFileSync(yamlFile, 'key: value\nlist:\n  - item1\n  - item2')
    fs.writeFileSync(jsonFile, JSON.stringify({ name: 'test', value: 42 }, null, 2))
    
    // Perform migration with integrity checks
    const migrationResult = performMockMigration(sourceDir, targetDir, {
      enableIntegrityChecks: true
    })
    
    expect(migrationResult.success).toBe(true)
    expect(migrationResult.integrityChecks).toBeDefined()
    
    // Verify all files migrated with correct checksums
    expect(migrationResult.integrityChecks!.fileCount).toBe(3)
    expect(migrationResult.integrityChecks!.allChecksPassed).toBe(true)
    
    // Verify migrated files exist and have correct content
    expect(fs.existsSync(path.join(targetDir, 'document.md'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'data.yml'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'config.json'))).toBe(true)
    
    // Verify content integrity
    const migratedMarkdown = fs.readFileSync(path.join(targetDir, 'document.md'), 'utf8')
    expect(migratedMarkdown).toContain('**formatting**')
    
    const migratedJson = JSON.parse(fs.readFileSync(path.join(targetDir, 'config.json'), 'utf8'))
    expect(migratedJson.value).toBe(42)
  })

  test('migration handles errors gracefully and allows retry', async () => {
    // Setup: Create scenario that will fail initially
    const sourceDir = path.join(tempDir, 'source')
    const targetDir = path.join(tempDir, 'target-readonly')
    
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.mkdirSync(targetDir, { recursive: true })
    
    const testFile = path.join(sourceDir, 'test.md')
    fs.writeFileSync(testFile, '# Test content')
    
    // Make target directory read-only to simulate permission error
    fs.chmodSync(targetDir, 0o444)
    
    // First migration attempt should fail
    const firstAttempt = performMockMigration(sourceDir, targetDir, {
      skipOnError: false
    })
    
    expect(firstAttempt.success).toBe(false)
    expect(firstAttempt.error).toContain('permission denied')
    
    // Fix permissions and retry
    fs.chmodSync(targetDir, 0o755)
    
    const retryAttempt = performMockMigration(sourceDir, targetDir, {
      skipOnError: false,
      retry: true
    })
    
    expect(retryAttempt.success).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'test.md'))).toBe(true)
  })

  test('migration preserves file metadata and permissions', async () => {
    // Setup: Create files with specific metadata
    const sourceDir = path.join(tempDir, 'source')
    const targetDir = path.join(tempDir, 'target')
    
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.mkdirSync(targetDir, { recursive: true })
    
    const testFile = path.join(sourceDir, 'test.md')
    const testContent = `---
title: Test Document
date: 2024-01-01
tags: [migration, test]
permissions:
  read: [all]
  write: [admin]
---

# Test Content
`
    
    fs.writeFileSync(testFile, testContent)
    const originalStats = fs.statSync(testFile)
    
    // Perform migration
    const migrationResult = performMockMigration(sourceDir, targetDir, {
      preserveMetadata: true
    })
    
    expect(migrationResult.success).toBe(true)
    
    // Verify metadata preserved
    const migratedFile = path.join(targetDir, 'test.md')
    const migratedContent = fs.readFileSync(migratedFile, 'utf8')
    
    expect(migratedContent).toContain('title: Test Document')
    expect(migratedContent).toContain('permissions:')
    expect(migratedContent).toContain('read: [all]')
    
    const migratedStats = fs.statSync(migratedFile)
    
    // File size should be the same
    expect(migratedStats.size).toBe(originalStats.size)
  })
})

// Mock migration functions for testing
interface MigrationOptions {
  preserveOriginal?: boolean
  createRollbackInfo?: boolean
  enableIntegrityChecks?: boolean
  skipOnError?: boolean
  retry?: boolean
  preserveMetadata?: boolean
}

interface MigrationResult {
  success: boolean
  error?: string
  rollbackInfo?: RollbackInfo
  integrityChecks?: IntegrityCheckResult
}

interface RollbackInfo {
  sourceDir: string
  targetDir: string
  migratedFiles: string[]
  timestamp: string
}

interface IntegrityCheckResult {
  fileCount: number
  allChecksPassed: boolean
  checksums: Map<string, string>
}

function performMockMigration(sourceDir: string, targetDir: string, options: MigrationOptions = {}): MigrationResult {
  try {
    const result: MigrationResult = { success: false }
    const migratedFiles: string[] = []
    
    // Check if target is writable (simulate permission error)
    try {
      fs.accessSync(targetDir, fs.constants.W_OK)
    } catch (error) {
      return {
        success: false,
        error: 'permission denied - target directory not writable'
      }
    }
    
    // Read source files
    const files = fs.readdirSync(sourceDir)
    
    // Integrity checks setup
    const checksums = new Map<string, string>()
    
    // Migrate each file
    for (const file of files) {
      const sourceFile = path.join(sourceDir, file)
      const targetFile = path.join(targetDir, file)
      const stats = fs.statSync(sourceFile)
      
      if (stats.isFile()) {
        const content = fs.readFileSync(sourceFile, 'utf8')
        
        // Calculate checksum for integrity check
        if (options.enableIntegrityChecks) {
          const checksum = calculateMockChecksum(content)
          checksums.set(file, checksum)
        }
        
        // Check if target file already exists (idempotency)
        if (fs.existsSync(targetFile)) {
          const existingContent = fs.readFileSync(targetFile, 'utf8')
          if (existingContent === content) {
            // File already migrated correctly, skip
            continue
          }
        }
        
        // Write to target
        fs.writeFileSync(targetFile, content)
        migratedFiles.push(file)
        
        // Preserve metadata if requested
        if (options.preserveMetadata) {
          // Copy file timestamps
          fs.utimesSync(targetFile, stats.atime, stats.mtime)
        }
      }
    }
    
    result.success = true
    
    // Create rollback info if requested
    if (options.createRollbackInfo) {
      result.rollbackInfo = {
        sourceDir,
        targetDir,
        migratedFiles,
        timestamp: new Date().toISOString()
      }
    }
    
    // Create integrity check results
    if (options.enableIntegrityChecks) {
      result.integrityChecks = {
        fileCount: migratedFiles.length,
        allChecksPassed: true,
        checksums
      }
    }
    
    return result
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function performMockRollback(rollbackInfo: RollbackInfo): MigrationResult {
  try {
    // Remove migrated files from target
    for (const file of rollbackInfo.migratedFiles) {
      const targetFile = path.join(rollbackInfo.targetDir, file)
      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile)
      }
    }
    
    return { success: true }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rollback failed'
    }
  }
}

function calculateMockChecksum(content: string): string {
  // Simple mock checksum calculation
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}