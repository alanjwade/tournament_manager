#!/usr/bin/env bash
set -euo pipefail

# Release script: increments patch version, commits, tags, and pushes to origin.

# --- 1. Check for uncommitted changes ---
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: There are modified (uncommitted) tracked files. Please commit or stash them before releasing."
  git status --short
  exit 1
fi

# --- 2. Read current version from package.json ---
CURRENT_VERSION=$(node -e "process.stdout.write(require('./package.json').version)")
echo "Current version: $CURRENT_VERSION"

# --- 3. Calculate next patch version ---
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
PATCH=$(( PATCH + 1 ))
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "New version:     $NEW_VERSION"

# --- 4. Update package.json ---
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated package.json"

# --- 5. Commit ---
git add package.json
git commit -m "Release v${NEW_VERSION}"
echo "Created commit: Release v${NEW_VERSION}"

# --- 6. Tag ---
git tag "v${NEW_VERSION}"
echo "Created tag: v${NEW_VERSION}"

# --- 7. Push branch and tag ---
git push origin main
git push origin "v${NEW_VERSION}"
echo "Pushed to origin. Release v${NEW_VERSION} complete."
