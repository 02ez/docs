#!/bin/bash
# Security validation script for GitHub Actions workflows
# This script validates that security hardening requirements are met

set -e

echo "🔐 GitHub Actions Security Validation"
echo "======================================"

# Check for required workflows
echo "✅ Checking required security workflows..."
REQUIRED_WORKFLOWS=(
    "dependency-review.yml"
    "security-scanning.yml"
    "sbom-provenance.yml"
    "pre-commit.yml"
    "auto-merge.yml"
    "codeql.yml"
)

for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
    if [[ -f ".github/workflows/$workflow" ]]; then
        echo "  ✓ $workflow exists"
    else
        echo "  ✗ $workflow missing"
        exit 1
    fi
done

# Check for unpinned actions
echo ""
echo "🔗 Checking for unpinned actions..."
UNPINNED=$(grep -r "@v[0-9]" .github/workflows/ | grep -v "# v" | grep -v "# pin" || true)
if [[ -n "$UNPINNED" ]]; then
    echo "  ✗ Found unpinned actions:"
    echo "$UNPINNED"
    exit 1
else
    echo "  ✓ All actions are pinned to SHAs"
fi

# Check for broad permissions
echo ""
echo "🔐 Checking for overly broad permissions..."
BROAD_PERMS=$(grep -r "permissions:" .github/workflows/ | grep -E "(write-all|\\*)" || true)
if [[ -n "$BROAD_PERMS" ]]; then
    echo "  ✗ Found broad permissions:"
    echo "$BROAD_PERMS"
    exit 1
else
    echo "  ✓ No overly broad permissions found"
fi

# Check for pre-commit configuration
echo ""
echo "🧹 Checking pre-commit configuration..."
if [[ -f ".pre-commit-config.yaml" ]]; then
    echo "  ✓ Pre-commit configuration exists"
else
    echo "  ✗ Pre-commit configuration missing"
    exit 1
fi

# Check for secrets baseline
if [[ -f ".secrets.baseline" ]]; then
    echo "  ✓ Secrets baseline exists"
else
    echo "  ✗ Secrets baseline missing"
    exit 1
fi

# Check for yamllint config
if [[ -f ".yamllint.yml" ]]; then
    echo "  ✓ Yamllint configuration exists"
else
    echo "  ✗ Yamllint configuration missing"
    exit 1
fi

# Check Dependabot configuration
echo ""
echo "🤖 Checking Dependabot configuration..."
if [[ -f ".github/dependabot.yml" ]]; then
    echo "  ✓ Dependabot configuration exists"
    
    # Check if GitHub Actions updates are enabled
    if grep -q "github-actions" .github/dependabot.yml; then
        echo "  ✓ GitHub Actions updates enabled"
    else
        echo "  ✗ GitHub Actions updates not configured"
        exit 1
    fi
else
    echo "  ✗ Dependabot configuration missing"
    exit 1
fi

# Run workflow tests
echo ""
echo "🧪 Running workflow validation tests..."
npm run test -- workflows --reporter=basic

echo ""
echo "🎉 Security validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure branch protection rules (see .github/BRANCH_PROTECTION.md)"
echo "2. Set up repository rulesets via GitHub UI"
echo "3. Configure environment protection for production deployments"
echo "4. Enable auto-merge for approved PRs"
echo "5. Set artifact retention to 7 days in repository settings"