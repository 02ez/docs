# Repository Rulesets Configuration
# This file documents the required branch protection and repository rules
# These should be configured via GitHub UI or API as they cannot be version-controlled

## Enhanced Branch Protection Rules for `main` branch:

### Required Status Checks:
- `Build Test Lint / merge-readiness`
- `Security Scanning / compliance-check`
- `Supply Chain Security / supply-chain-gate`
- `test / test (archives)`
- `test / test (article-api)`
- `test / test (assets)`
- `test / test (audit-logs)`
- `test / test (automated-pipelines)`
- `test / test (changelogs)`
- `test / test (color-schemes)`
- `test / test (content-linter)`
- `test / test (content-render)`
- `test / test (data-directory)`
- `test / test (early-access)`
- `test / test (events)`
- `test / test (fixtures)`
- `test / test (frame)`
- `test / test (github-apps)`
- `test / test (graphql)`
- `test / test (landings)`
- `test / test (languages)`
- `test / test (learning-track)`
- `test / test (observability)`
- `test / test (products)`
- `test / test (redirects)`
- `test / test (release-notes)`
- `test / test (rest)`
- `test / test (search)`
- `test / test (secret-scanning)`
- `test / test (shielding)`
- `test / test (versions)`
- `test / test (webhooks)`
- `test / test (workflows)`
- `CodeQL analysis / build`
- `dependency-review / dependency-review`
- `pre-commit / pre-commit`

### Enhanced Branch Protection Settings:
- **Require status checks to be up-to-date before merging**: `true`
- **Require branches to be up to date**: `true`
- **Require review from code owners**: `true`
- **Required number of reviews before merging**: `2` (increased for security)
- **Dismiss stale reviews when new commits are pushed**: `true`
- **Require review from code owners**: `true`
- **Restrict pushes that create public repositories**: `true`
- **Allow force pushes**: `false`
- **Allow deletions**: `false`
- **Require signed commits**: `true` (enhanced security)
- **Include administrators**: `true`

### Security Gate Requirements:
- **Sleep Gate**: 6+ hours since last commit for critical changes
- **STRIDE Threat Score**: ≤ 2 for automatic merge, ≤ 5 for manual approval
- **Security Scan Compliance**: All critical/high vulnerabilities resolved
- **Performance Budget**: Bundle size and memory within limits
- **SBOM Generation**: Required for all builds
- **Supply Chain Verification**: SLSA Level 3 compliance

### Repository Rules:
- **Restrict force pushes**: Enabled for all branches
- **Restrict deletions**: Enabled for `main` branch
- **Require signed commits**: Enabled for `main` branch
- **Block force pushes**: Enabled for all branches
- **Security-critical file protection**: Enhanced reviews required

### Required Workflows:
All workflows must:
1. Use pinned action SHAs (not tags) - SHA must be 40 characters
2. Use minimal permissions (least privilege principle)
3. Include repository scope checks (`github.repository == 'github/docs-internal' || github.repository == 'github/docs'`)
4. Use ubuntu-latest runners only
5. Have concurrency controls with cancel-in-progress
6. Include slack alerts for failures (scheduled workflows)
7. Implement proper timeout limits (≤ 60 minutes)
8. Use OIDC for authentication (no long-lived secrets)

### Enhanced Artifact Retention:
- Security scan results: 30 days
- SBOM and provenance: 90 days
- Performance benchmarks: 7 days
- Default artifacts: 7 days

### Environment Protection:
#### Staging Environment:
- **Required reviewers**: 1 from @github/docs-engineering
- **Wait timer**: 0 minutes
- **Protection rules**: Status checks required

#### Production Environment:
- **Required reviewers**: 2 from @github/docs-engineering + 1 from @github/security
- **Wait timer**: 15 minutes
- **Protection rules**: All status checks + manual approval + security compliance
- **Branch restrictions**: Only deploy from `main` branch
- **Environment secrets**: OIDC-based authentication only

### Auto-merge Requirements:
1. All required status checks must pass
2. At least 2 code owner approvals (increased)
3. Security compliance check passed
4. Performance budget within limits
5. No `skip-auto-merge` label
6. PR must not be draft
7. No pending reviews requesting changes
8. Sleep gate passed for critical changes
9. STRIDE threat assessment score ≤ 2

### Emergency Override Procedures:
- **Security incidents**: Requires 2 security team approvals
- **Critical hotfixes**: Requires security team review + documentation
- **Force deployments**: Requires incident ticket + post-mortem commitment

### GitHub CLI Configuration Commands:

```bash
# Enhanced branch protection with security gates
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Build Test Lint / merge-readiness","Security Scanning / compliance-check","Supply Chain Security / supply-chain-gate"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"restrict_review_dismissals":{"users":[],"teams":["github/security","github/docs-engineering"]}}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Enable signed commits requirement
gh api repos/{owner}/{repo}/branches/main/protection/required_signatures \
  --method POST

# Enable vulnerability alerts
gh api repos/{owner}/{repo}/vulnerability-alerts \
  --method PUT

# Enable automated security fixes
gh api repos/{owner}/{repo}/automated-security-fixes \
  --method PUT
```

---
**Security Compliance**: SLSA Level 3, SOC2, Enterprise-grade
**Last Updated**: 2024-09-07
**Review Frequency**: Monthly security review + quarterly comprehensive audit