---
agent: agent
description: This prompt automates the release process by updating version numbers, committing changes, creating git tags, and pushing to GitHub.
model: GPT-4o (copilot)
---

# Release Automation Prompt

Use this prompt to automate the release process. You can customize the version number or leave it blank for auto-increment.

---

## Standard Release (Auto-increment Patch)

Execute a release with automatic patch version increment:

1. Read the current version from `package.json`
2. Read the latest git tag
3. Auto-increment the patch version (e.g., 0.99.0 → 0.99.1)
4. Update `package.json` with the new version
5. Commit the change with message "Release vX.Y.Z"
6. Create a git tag with the new version (v prefix)
7. Push both the main branch and the tag to origin

---

## Custom Version Release

Execute a release with a specific version (replace `X.Y.Z` with your version):

1. Read the current version from `package.json`
2. Read the latest git tag
3. Use version `X.Y.Z` instead of auto-incrementing
4. Update `package.json` with the new version
5. Commit the change with message "Release vX.Y.Z"
6. Create a git tag with the new version (v prefix)
7. Push both the main branch and the tag to origin

---

## Example Prompts

**Auto-increment:**
```
Execute a release with automatic patch version increment
```

**Specific version:**
```
Execute a release with Release v1.0.0
```

---

## What I Will Do

- ✓ Extract version from package.json
- ✓ Check existing git tags
- ✓ Calculate/validate new version
- ✓ Update package.json
- ✓ Create git commit
- ✓ Create and push git tag
- ✓ Push changes to GitHub

All operations will use standard git commands and file editing tools.

---

# Release Process

- Make sure everything is checked in. Do not proceed unless it is.
