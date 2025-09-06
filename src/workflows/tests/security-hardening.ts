import { describe, expect, test } from 'vitest'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const workflowsDir = path.join(__dirname, '../../../.github/workflows')

interface WorkflowPermissions {
  contents?: string
  'security-events'?: string
  'id-token'?: string
  attestations?: string
  [key: string]: string | undefined
}

interface WorkflowJob {
  steps?: Array<{ 
    uses?: string
    with?: { [key: string]: any }
    [key: string]: any 
  }>
  'runs-on'?: string | Array<string>
  [key: string]: any
}

interface WorkflowData {
  permissions?: WorkflowPermissions
  jobs?: { [key: string]: WorkflowJob }
  on?: { schedule?: any; [key: string]: any }
  concurrency?: {
    group?: string
    'cancel-in-progress'?: boolean
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
        if (workflow.data.concurrency) {
          expect(workflow.data.concurrency.group).toBeDefined()
          expect(workflow.data.concurrency['cancel-in-progress']).toBe(true)
        }
      }
    })
  })

  test('workflows use ubuntu-latest runners only', () => {
    workflowFiles.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job: WorkflowJob) => {
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
        if (workflow.data.permissions) {
          expect(workflow.data.permissions['security-events']).toBe('write')
          expect(workflow.data.permissions.contents).toBe('read')
        }
      }
    })
  })

  test('SBOM workflow has correct permissions', () => {
    const sbomWorkflow = workflowFiles.find((w) => w.filename === 'sbom-provenance.yml')
    if (sbomWorkflow) {
      expect(sbomWorkflow.data.permissions).toBeDefined()
      if (sbomWorkflow.data.permissions) {
        expect(sbomWorkflow.data.permissions['id-token']).toBe('write')
        expect(sbomWorkflow.data.permissions.attestations).toBe('write')
        expect(sbomWorkflow.data.permissions.contents).toBe('read')
      }
    }
  })

  test('workflows include slack alerts for scheduled runs', () => {
    const scheduledWorkflows = workflowFiles.filter(({ data }) => data.on && data.on.schedule)

    scheduledWorkflows.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job: WorkflowJob) => {
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
          (job: WorkflowJob) =>
            job.steps &&
            job.steps.some((step) => step.uses && step.uses.includes('upload-artifact')),
        )
      }
      return false
    })

    artifactWorkflows.forEach(({ data }) => {
      if (data.jobs) {
        Object.values(data.jobs).forEach((job: WorkflowJob) => {
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
})
