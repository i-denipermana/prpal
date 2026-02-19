#!/bin/bash

# Release Script for PRPal
# Usage: ./scripts/release.sh [major|minor|patch|premajor|preminor|prepatch|prerelease]
#
# This script uses npm's built-in semver versioning:
#   patch:      1.0.1 → 1.0.2
#   minor:      1.0.1 → 1.1.0
#   major:      1.0.1 → 2.0.0
#   prepatch:   1.0.1 → 1.0.2-0
#   preminor:   1.0.1 → 1.1.0-0
#   premajor:   1.0.1 → 2.0.0-0
#   prerelease: 1.0.2-0 → 1.0.2-1

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BUMP_TYPE=${1:-patch}

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch|premajor|preminor|prepatch|prerelease)$ ]]; then
    echo -e "${RED}Error: Invalid version type '$BUMP_TYPE'${NC}"
    echo "Usage: $0 [major|minor|patch|premajor|preminor|prepatch|prerelease]"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: You have uncommitted changes.${NC}"
    echo "Please commit or stash them first."
    exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${YELLOW}Warning: You're on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull --rebase

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: v${CURRENT_VERSION}${NC}"

# Preview new version
NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version | sed 's/v//')
# Reset the change (we'll let npm version do it properly with hooks)
git checkout package.json package-lock.json 2>/dev/null || true

echo -e "${GREEN}New version will be: v${NEW_VERSION}${NC}"

read -p "Proceed with release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Run npm version (this triggers preversion and postversion hooks)
echo -e "${YELLOW}Running npm version ${BUMP_TYPE}...${NC}"
npm version "$BUMP_TYPE" -m "chore(release): v%s"

echo ""
echo -e "${GREEN}Release v${NEW_VERSION} complete!${NC}"
echo ""
echo -e "${YELLOW}The release workflow will now:${NC}"
echo "  1. Run tests"
echo "  2. Build macOS app (universal)"
echo "  3. Create GitHub Release with artifacts"
echo ""
echo "Check progress at: https://github.com/YOUR_ORG/prpal/actions"
