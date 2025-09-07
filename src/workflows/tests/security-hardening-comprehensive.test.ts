import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

/**
 * Comprehensive security hardening tests for DevOps infrastructure
 * Tests validate workflow configurations, permissions, and security controls
 */

describe('DevOps Security Hardening', () => {
  const workflowsDir = path.join(process.cwd(), '.github/workflows')
  const securityWorkflows = [
    'build-test-lint.yml',
    'security-scanning.yml',
    'supply-chain-security.yml',
    'deploy.yml'
  ]

  describe('Workflow Security Configuration', () => {
    it('should have all required security workflows', () => {
      securityWorkflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow)
        expect(fs.existsSync(workflowPath), `${workflow} should exist`).toBe(true)
      })
    })

    it('should enforce minimal permissions in workflows', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        const workflow = yaml.load(content) as any

        // Check global permissions
        if (workflow.permissions) {
          expect(workflow.permissions).toBeDefined()
          
          // Ensure no 'write: all' or 'write: *' permissions
          Object.values(workflow.permissions).forEach(permission => {
            expect(permission).not.toBe('write')
            expect(permission).not.toBe('*')
          })
        }

        // Check job-level permissions
        if (workflow.jobs) {
          Object.values(workflow.jobs).forEach((job: any) => {
            if (job.permissions) {
              Object.values(job.permissions).forEach(permission => {
                expect(permission).not.toBe('write')
                expect(permission).not.toBe('*')
              })
            }
          })
        }
      })
    })

    it('should use pinned action versions with SHA', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        const workflow = yaml.load(content) as any

        if (workflow.jobs) {
          Object.entries(workflow.jobs).forEach(([jobName, job]: [string, any]) => {
            if (job.steps) {
              job.steps.forEach((step: any, stepIndex: number) => {
                if (step.uses) {
                  // Check for pinned versions (either @vX.X.X or @sha)
                  const usesPattern = /^[^@]+@([a-f0-9]{40}|v?\d+\.\d+\.\d+)$/
                  expect(
                    usesPattern.test(step.uses),
                    `Job "${jobName}" step ${stepIndex + 1} should use pinned action version: ${step.uses}`
                  ).toBe(true)
                }
              })
            }
          })
        }
      })
    })

    it('should implement proper concurrency controls', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        const workflow = yaml.load(content) as any

        // All security workflows should have concurrency controls
        expect(workflow.concurrency, `${workflowFile} should have concurrency control`).toBeDefined()
        expect(workflow.concurrency.group, `${workflowFile} should have concurrency group`).toBeDefined()
      })
    })

    it('should have appropriate timeout settings', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        const workflow = yaml.load(content) as any

        if (workflow.jobs) {
          Object.entries(workflow.jobs).forEach(([jobName, job]: [string, any]) => {
            // Security jobs should have timeout limits
            if (job['timeout-minutes']) {
              expect(
                job['timeout-minutes'],
                `Job "${jobName}" timeout should be reasonable (max 60 minutes)`
              ).toBeLessThanOrEqual(60)
            }
          })
        }
      })
    })
  })

  describe('STRIDE Threat Model Implementation', () => {
    it('should implement STRIDE assessment in security workflow', () => {
      const securityWorkflowPath = path.join(workflowsDir, 'security-scanning.yml')
      const content = fs.readFileSync(securityWorkflowPath, 'utf8')
      
      // Check for STRIDE components
      const strideComponents = [
        'spoofing',
        'tampering', 
        'repudiation',
        'information disclosure',
        'denial of service',
        'elevation of privilege'
      ]

      strideComponents.forEach(component => {
        expect(content.toLowerCase()).toContain(component.toLowerCase())
      })
    })

    it('should validate threat assessment outputs', () => {
      const securityWorkflowPath = path.join(workflowsDir, 'security-scanning.yml')
      const content = fs.readFileSync(securityWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      const strideJob = workflow.jobs['stride-threat-model']
      expect(strideJob).toBeDefined()
      expect(strideJob.outputs).toBeDefined()
      expect(strideJob.outputs['threat-score']).toBeDefined()
      expect(strideJob.outputs['threats-detected']).toBeDefined()
    })
  })

  describe('Supply Chain Security', () => {
    it('should implement SLSA Level 3 compliance', () => {
      const supplyChainWorkflowPath = path.join(workflowsDir, 'supply-chain-security.yml')
      const content = fs.readFileSync(supplyChainWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      // Check for SLSA Level 3 requirements
      expect(workflow.env.SLSA_LEVEL).toBe('3')
      
      // Check for required jobs
      expect(workflow.jobs['slsa-build']).toBeDefined()
      expect(workflow.jobs['sbom-generation']).toBeDefined()
      expect(workflow.jobs['supply-chain-verification']).toBeDefined()
    })

    it('should generate multiple SBOM formats', () => {
      const supplyChainWorkflowPath = path.join(workflowsDir, 'supply-chain-security.yml')
      const content = fs.readFileSync(supplyChainWorkflowPath, 'utf8')
      
      // Check for SPDX and CycloneDX SBOM generation
      expect(content).toContain('spdx-json')
      expect(content).toContain('cyclonedx-json')
    })

    it('should implement vulnerability scanning of SBOMs', () => {
      const supplyChainWorkflowPath = path.join(workflowsDir, 'supply-chain-security.yml')
      const content = fs.readFileSync(supplyChainWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      expect(workflow.jobs['sbom-vulnerability-scan']).toBeDefined()
    })
  })

  describe('Deployment Security', () => {
    it('should implement environment protection', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      const content = fs.readFileSync(deployWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      // Check for environment configurations
      const prodJob = workflow.jobs['deploy-production']
      expect(prodJob).toBeDefined()
      expect(prodJob.environment).toBeDefined()
      expect(prodJob.environment.name).toBe('production')
    })

    it('should implement rollback capability', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      const content = fs.readFileSync(deployWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      expect(workflow.jobs['rollback-deployment']).toBeDefined()
    })

    it('should use OIDC for authentication', () => {
      const deployWorkflowPath = path.join(workflowsDir, 'deploy.yml')
      const content = fs.readFileSync(deployWorkflowPath, 'utf8')
      
      // Check for OIDC configuration
      expect(content).toContain('configure-aws-credentials')
      expect(content).toContain('role-to-assume')
      expect(content).toContain('id-token: write')
    })
  })

  describe('Security Gate Validation', () => {
    it('should implement sleep gate for critical changes', () => {
      const buildWorkflowPath = path.join(workflowsDir, 'build-test-lint.yml')
      const content = fs.readFileSync(buildWorkflowPath, 'utf8')
      
      expect(content).toContain('sleep-gate')
      expect(content).toContain('HOURS_SINCE_LAST_COMMIT')
    })

    it('should implement security baseline checks', () => {
      const buildWorkflowPath = path.join(workflowsDir, 'build-test-lint.yml')
      const content = fs.readFileSync(buildWorkflowPath, 'utf8')
      
      expect(content).toContain('security-baseline')
      expect(content).toContain('.secrets.baseline')
    })

    it('should implement performance budgets', () => {
      const buildWorkflowPath = path.join(workflowsDir, 'build-test-lint.yml')
      const content = fs.readFileSync(buildWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      expect(workflow.env.PERFORMANCE_BUDGET_CPU).toBeDefined()
      expect(workflow.env.PERFORMANCE_BUDGET_MEMORY).toBeDefined()
      expect(workflow.jobs['performance-budget']).toBeDefined()
    })
  })

  describe('Compliance and Audit', () => {
    it('should generate security compliance reports', () => {
      const securityWorkflowPath = path.join(workflowsDir, 'security-scanning.yml')
      const content = fs.readFileSync(securityWorkflowPath, 'utf8')
      
      expect(content).toContain('security_summary.md')
      expect(content).toContain('Security Assessment Summary')
    })

    it('should upload security scan results as artifacts', () => {
      const securityWorkflowPath = path.join(workflowsDir, 'security-scanning.yml')
      const content = fs.readFileSync(securityWorkflowPath, 'utf8')
      const workflow = yaml.load(content) as any

      // Check for SARIF uploads
      let hasSarifUpload = false
      Object.values(workflow.jobs).forEach((job: any) => {
        if (job.steps) {
          job.steps.forEach((step: any) => {
            if (step.uses && step.uses.includes('codeql-action/upload-sarif')) {
              hasSarifUpload = true
            }
          })
        }
      })

      expect(hasSarifUpload).toBe(true)
    })

    it('should implement proper artifact retention', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        
        // Check for retention-days in upload-artifact actions
        const retentionMatches = content.match(/retention-days:\s*(\d+)/g)
        if (retentionMatches) {
          retentionMatches.forEach(match => {
            const days = parseInt(match.match(/\d+/)![0])
            expect(days).toBeGreaterThan(0)
            expect(days).toBeLessThanOrEqual(90)
          })
        }
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should implement proper error handling in workflows', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        const workflow = yaml.load(content) as any

        if (workflow.jobs) {
          Object.values(workflow.jobs).forEach((job: any) => {
            if (job.steps) {
              job.steps.forEach((step: any) => {
                // Critical steps should have continue-on-error or if conditions
                if (step.name && step.name.toLowerCase().includes('critical')) {
                  expect(
                    step['continue-on-error'] !== undefined || step.if !== undefined,
                    `Critical step "${step.name}" should have error handling`
                  ).toBe(true)
                }
              })
            }
          })
        }
      })
    })

    it('should implement notification on failure', () => {
      securityWorkflows.forEach(workflowFile => {
        const workflowPath = path.join(workflowsDir, workflowFile)
        const content = fs.readFileSync(workflowPath, 'utf8')
        
        // Check for slack-alert or similar notification mechanisms
        expect(content).toContain('slack-alert')
      })
    })
  })
})