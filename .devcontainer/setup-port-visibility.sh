#!/bin/bash

# Secure port visibility setup script for GitHub Codespaces
# This script provides secure defaults for port forwarding and warns users about security implications

set -e

CODESPACE_NAME=${CODESPACE_NAME:-}
PORT=${1:-4000}
DEFAULT_VISIBILITY="private"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Setting up secure port forwarding for port ${PORT}${NC}"

# Check if we're in a Codespace
if [ -z "$CODESPACE_NAME" ]; then
    echo -e "${YELLOW}⚠️  Not running in a GitHub Codespace - skipping port visibility setup${NC}"
    exit 0
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not available${NC}"
    exit 1
fi

# Set default secure visibility (private)
echo -e "${GREEN}🔒 Setting port ${PORT} to private visibility (secure default)${NC}"
if gh cs ports visibility ${PORT}:${DEFAULT_VISIBILITY} -c "$CODESPACE_NAME"; then
    echo -e "${GREEN}✅ Port ${PORT} is now privately accessible${NC}"
else
    echo -e "${RED}❌ Failed to set port visibility${NC}"
    exit 1
fi

# Provide information about port visibility options
echo ""
echo -e "${YELLOW}📋 Port Visibility Information:${NC}"
echo -e "  ${GREEN}private${NC}  - Only accessible to you (current setting)"
echo -e "  ${YELLOW}org${NC}      - Accessible to organization members"
echo -e "  ${RED}public${NC}   - Accessible to anyone with the URL (security risk)"
echo ""
echo -e "${YELLOW}💡 To change visibility later:${NC}"
echo -e "  For organization access: ${YELLOW}gh cs ports visibility ${PORT}:org -c \"$CODESPACE_NAME\"${NC}"
echo -e "  ${RED}⚠️  For public access: gh cs ports visibility ${PORT}:public -c \"$CODESPACE_NAME\"${NC}"
echo ""
echo -e "${RED}🚨 Security Warning:${NC}"
echo -e "${RED}   Public ports are accessible to anyone on the internet!${NC}"
echo -e "${RED}   Only use public visibility if absolutely necessary.${NC}"