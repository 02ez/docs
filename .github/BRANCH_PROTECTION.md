# Repository Rulesets Configuration
# This file documents the required branch protection and repository rules
# These should be configured via GitHub UI or API as they cannot be version-controlled

## Branch Protection Rules for `main` branch:

### Required Status Checks:
- `lint-code / lint-code`
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
- `security-scanning / trivy-scan`
- `pre-commit / pre-commit`
- `sbom-provenance / sbom-provenance`

### Branch Protection Settings:
- **Require status checks to be up-to-date before merging**: `true`
- **Require branches to be up to date**: `true`
- **Require review from code owners**: `true`
- **Required number of reviews before merging**: `1`
- **Dismiss stale reviews when new commits are pushed**: `true`
- **Require review from code owners**: `true`
- **Restrict pushes that create public repositories**: `true`
- **Allow force pushes**: `false`
- **Allow deletions**: `false`

### Repository Rules:
- **Restrict force pushes**: Enabled for all branches
- **Restrict deletions**: Enabled for `main` branch
- **Require signed commits**: Enabled for `main` branch
- **Block force pushes**: Enabled for all branches

### Required Workflows:
All workflows must:
1. Use pinned action SHAs (not tags)
2. Use minimal permissions (contents: read, packages: read, id-token: write only when needed)
3. Include repository scope checks (`github.repository == 'github/docs-internal' || github.repository == 'github/docs'`)
4. Use ubuntu-latest runners only
5. Have concurrency controls
6. Include slack alerts for failures (scheduled workflows)

### Artifact Retention:
- Default artifact retention: 7 days
- SBOM and security scan results: 7 days

### Environment Protection:
- Production environment requires manual approval
- Reviewers: @02ez, @matteo767, docs-engineering team
- Environment secrets should use least privilege principle

### Auto-merge Requirements:
1. All required status checks must pass
2. At least 1 code owner approval
3. No `skip-auto-merge` label
4. PR must not be draft
5. No pending reviews requesting changes