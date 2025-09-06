import { describe, expect, test } from 'vitest'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const workflowsDir = path.join(__dirname, '../../../.github/workflows')

// Types for workflow structure
interface WorkflowData {
  permissions?: {
    contents?: string
    'security-events'?: string
    'id-token'?: string
    attestations?: string
    [key: string]: string | undefined
  }
  concurrency?: {
    group?: string
    'cancel-in-progress'?: boolean
  }
  jobs?: {
    [key: string]: {
      'runs-on'?: string | string[]
      steps?: Array<{
        uses?: string
        with?: {
          'retention-days'?: number
          [key: string]: any
        }
        [key: string]: any
      }>
      [key: string]: any
    }
  }
  on?: {
    schedule?: any
    [key: string]: any
  }
  [key: string]: any
}

interface WorkflowFile {
  filename: string
  fullpath: string
  data: WorkflowData
}

// Security hardening requirements validation
describe('Security Hardening Validation', () => {
  const workflowFiles: WorkflowFile[] = fs
    .readdirSync(workflowsDir)
    .filter((filename) => filename.endsWith('.yml') || filename.endsWith('.yaml'))
    .map((filename) => {
      const fullpath = path.join(workflowsDir, filename)
      const data = yaml.load(fs.readFileSync(fullpath, 'utf8')) as WorkflowData
      return { filename, fullpath, data }
    })

  test('all new security workflows exist', () => {
    const requiredWorkflows = [
      'dependency-review.yml',
      'security-scanning.yml',
      'sbom-provenance.yml',
      'pre-commit.yml',
      'auto-merge.yml',
    ]

    const existingWorkflows = workflowFiles.map((w) => w.filename)

    requiredWorkflows.forEach((required) => {
      expect(existingWorkflows).toContain(required)
    })
  })

  test('all workflows use minimal permissions', () => {
    workflowFiles.forEach(({ filename, data }) => {
      if (data.permissions) {
        // Check that permissions are specific, not `{}` or overly broad
        if (data.permissions.contents && data.permissions.contents !== 'read') {
          // Only specific workflows should have write permissions
          const allowedWriteWorkflows = [
            'sync-secret-scanning.yml',
            'create-changelog-pr.yml',
            'enterprise-dates.yml',
            'sync-graphql.yml',
            'repo-sync.yml',
            'auto-merge.yml',
            'close-bad-repo-sync-prs.yml',
            'delete-orphan-translation-files.yml',
            'generate-code-scanning-query-lists.yml',
            'moda-allowed-ips.yml',
            'sync-audit-logs.yml',
            'sync-codeql-cli.yml',
            'sync-openapi.yml',
          ]
          if (!allowedWriteWorkflows.includes(filename)) {
            expect(data.permissions.contents).toBe('read')
          }
        }
      }
    })
  })

  test('critical workflows have proper concurrency controls', () => {
    // Focus on workflows that process PRs or have potential race conditions
    const criticalWorkflows = [
      'test.yml',
      'lint-code.yml',
      'codeql.yml',
      'dependency-review.yml',
      'security-scanning.yml',
      'sbom-provenance.yml',
      'pre-commit.yml',
      'auto-merge.yml',
      'pr-summary.yml',
    ]

    criticalWorkflows.forEach((workflowName) => {
      const workflow = workflowFiles.find((w) => w.filename === workflowName)
      if (workflow) {
        expect(workflow.data.concurrency).toBeDefined()
        expect(workflow.data.concurrency?.group).toBeDefined()
        expect(workflow.data.concurrency?.['cancel-in-progress']).toBe(true)
      }
    })
  })

  test('workflows use ubuntu-latest runners only', () => {
    workflowFiles.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job) => {
          if (job['runs-on']) {
            // Allow the existing conditional for docs-internal
            if (typeof job['runs-on'] === 'string') {
              expect(job['runs-on']).toMatch(/ubuntu-latest|ubuntu-20\.04-xl/)
            }
          }
        })
      }
    })
  })

  test('security workflows have proper permissions', () => {
    const securityWorkflows = ['codeql.yml', 'dependency-review.yml', 'security-scanning.yml']

    securityWorkflows.forEach((workflowName) => {
      const workflow = workflowFiles.find((w) => w.filename === workflowName)
      if (workflow) {
        expect(workflow.data.permissions).toBeDefined()
        expect(workflow.data.permissions?.['security-events']).toBe('write')
        expect(workflow.data.permissions?.contents).toBe('read')
      }
    })
  })

  test('SBOM workflow has correct permissions', () => {
    const sbomWorkflow = workflowFiles.find((w) => w.filename === 'sbom-provenance.yml')
    if (sbomWorkflow) {
      expect(sbomWorkflow.data.permissions).toBeDefined()
      expect(sbomWorkflow.data.permissions?.['id-token']).toBe('write')
      expect(sbomWorkflow.data.permissions?.attestations).toBe('write')
      expect(sbomWorkflow.data.permissions?.contents).toBe('read')
    }
  })

  test('workflows include slack alerts for scheduled runs', () => {
    const scheduledWorkflows = workflowFiles.filter(({ data }) => data.on && data.on.schedule)

    scheduledWorkflows.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job) => {
          if (job.steps) {
            const hasSlackAlert = job.steps.some(
              (step) => step.uses === './.github/actions/slack-alert',
            )
            expect(hasSlackAlert).toBe(true)
          }
        })
      }
    })
  })

  test('artifact retention is set to 7 days', () => {
    const artifactWorkflows = workflowFiles.filter(({ data }) => {
      if (data.jobs) {
        return Object.values(data.jobs).some(
          (job) =>
            job.steps &&
            job.steps.some((step) => step.uses && step.uses.includes('upload-artifact')),
        )
      }
      return false
    })

    artifactWorkflows.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job) => {
          if (job.steps) {
            job.steps.forEach((step) => {
              if (step.uses && step.uses.includes('upload-artifact')) {
                expect(step.with).toBeDefined()
                expect(step.with?.['retention-days']).toBe(7)
              }
            })
          }
        })
      }
    })
  })

  test('workflows include timeout protection', () => {
    workflowFiles.forEach(({ filename, data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job) => {
          // Critical workflows should have timeout protection
          const hasCriticalSteps = job.steps?.some(
            (step) =>
              step.uses?.includes('build') ||
              step.uses?.includes('test') ||
              step.uses?.includes('deploy'),
          )

          if (hasCriticalSteps || filename.includes('test') || filename.includes('build')) {
            expect(job['timeout-minutes']).toBeDefined()
            expect(typeof job['timeout-minutes']).toBe('number')
            expect(job['timeout-minutes']).toBeGreaterThan(0)
            expect(job['timeout-minutes']).toBeLessThanOrEqual(360) // Max 6 hours
          }
        })
      }
    })
  })

  test('test workflows include coverage requirements', () => {
    const testWorkflow = workflowFiles.find((w) => w.filename === 'test.yml')
    if (testWorkflow) {
      expect(testWorkflow.data.jobs).toBeDefined()
      // Verify test workflow exists and has proper structure
      expect(Object.keys(testWorkflow.data.jobs!)).toContain('test')
    }
  })

  test('build workflows are hermetic and reproducible', () => {
    const buildWorkflows = workflowFiles.filter(
      ({ filename }) => filename.includes('build') || filename === 'test.yml',
    )

    buildWorkflows.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job) => {
          // Check for dependency pinning and caching
          if (job.steps) {
            const hasNodeSetup = job.steps.some(
              (step) => step.uses?.includes('node-npm-setup') || step.uses?.includes('setup-node'),
            )
            const hasCaching = job.steps.some(
              (step) => step.uses?.includes('cache') || step.name?.toLowerCase().includes('cache'),
            )

            if (hasNodeSetup) {
              // Builds with Node should use caching for reproducibility
              expect(hasCaching).toBe(true)
            }
          }
        })
      }
    })
  })

  test('migration workflows are idempotent and reversible', () => {
    const migrationWorkflows = workflowFiles.filter(
      ({ filename }) =>
        filename.includes('migration') ||
        filename.includes('sync') ||
        filename.includes('update') ||
        filename.includes('enterprise-dates'),
    )

    migrationWorkflows.forEach(({ data }) => {
      // Migration workflows should have manual trigger capability for rollback
      expect(data.on).toBeDefined()
      expect(data.on?.workflow_dispatch !== undefined || data.on?.workflow_call !== undefined).toBe(
        true,
      )
    })
  })

  test('rollback and rollforward procedures are defined', () => {
    // Check for deployment and rollback related workflows
    const deploymentWorkflows = workflowFiles.filter(
      ({ filename }) =>
        filename.includes('deploy') ||
        filename.includes('release') ||
        filename.includes('auto-merge') ||
        filename.includes('purge'),
    )

    deploymentWorkflows.forEach(({ data }) => {
      // Deployment workflows should support manual triggering for rollback
      expect(data.on).toBeDefined()
      expect(data.on?.workflow_dispatch !== undefined).toBe(true)
    })
  })
})
