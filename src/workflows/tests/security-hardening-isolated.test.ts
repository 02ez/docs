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

interface WorkflowData {
  permissions?: WorkflowPermissions
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

// Security hardening requirements validation (isolated tests)
describe('Security Hardening Validation (Isolated)', () => {
  const workflowFiles: WorkflowFile[] = fs
    .readdirSync(workflowsDir)
    .filter((filename) => filename.endsWith('.yml') || filename.endsWith('.yaml'))
    .map((filename) => {
      const fullpath = path.join(workflowsDir, filename)
      const data = yaml.load(fs.readFileSync(fullpath, 'utf8')) as WorkflowData
      return { filename, fullpath, data }
    })

  test('all required security workflows exist', () => {
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

  test('SBOM workflow has correct permissions for provenance', () => {
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

  test('dependency review workflow has security permissions', () => {
    const depReviewWorkflow = workflowFiles.find((w) => w.filename === 'dependency-review.yml')
    if (depReviewWorkflow) {
      expect(depReviewWorkflow.data.permissions).toBeDefined()
      if (depReviewWorkflow.data.permissions) {
        expect(depReviewWorkflow.data.permissions['security-events']).toBe('write')
      }
    }
  })

  test('critical workflows have concurrency controls', () => {
    const criticalWorkflows = ['sbom-provenance.yml', 'dependency-review.yml', 'security-scanning.yml']
    
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

  test('workflows follow minimal permissions principle', () => {
    workflowFiles.forEach(({ filename, data }) => {
      if (data.permissions) {
        // Most workflows should only have read access to contents
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
})