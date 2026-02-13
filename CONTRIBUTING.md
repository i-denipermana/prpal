# Contributing to PRPal

Thank you for your interest in contributing to PRPal! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Process](#development-process)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Release Process](#release-process)

---

## Code of Conduct

### Our Standards

- **Be respectful** - Treat everyone with respect and kindness
- **Be constructive** - Provide helpful, actionable feedback
- **Be inclusive** - Welcome contributors of all backgrounds and experience levels
- **Be professional** - Keep discussions focused on the project

### Unacceptable Behavior

- Harassment, trolling, or personal attacks
- Publishing private information without consent
- Inappropriate or offensive comments
- Spam or off-topic discussions

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Git
- macOS 12+ (for testing the Electron app)
- OpenCode CLI (for AI features)

### Development Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/prpal.git
cd prpal

# 3. Add upstream remote
git remote add upstream https://github.com/ORIGINAL-OWNER/prpal.git

# 4. Install dependencies
npm install

# 5. Create a branch for your changes
git checkout -b feature/your-feature-name

# 6. Set up environment
cp .env.example .env
# Edit .env with your GitHub credentials
```

### Running the App

```bash
# Development mode (server only)
npm run dev

# Development mode (Electron app)
npm run dev:electron

# Run tests
npm test
```

---

## How to Contribute

### Reporting Bugs

Before reporting a bug:

1. **Search existing issues** - The bug might already be reported
2. **Try the latest version** - The bug might be fixed
3. **Gather information** - Collect logs and system info

When reporting:

```markdown
**Description**
A clear description of the bug.

**Steps to Reproduce**

1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**

- macOS version:
- Node.js version:
- App version:

**Logs**
```

Paste relevant log output here

```

```

### Suggesting Features

Feature suggestions are welcome! Please:

1. **Search existing issues** - Someone might have suggested it
2. **Explain the use case** - Why is this feature needed?
3. **Consider alternatives** - Are there workarounds?

Feature request template:

```markdown
**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Describe your proposed feature.

**Alternatives Considered**
Other solutions you've considered.

**Additional Context**
Any other relevant information.
```

### Contributing Code

1. **Find or create an issue** - Discuss before starting work
2. **Fork and branch** - Create a feature branch from `main`
3. **Write code** - Follow our coding standards
4. **Write tests** - Add tests for new functionality
5. **Update docs** - Update relevant documentation
6. **Submit PR** - Create a pull request

---

## Development Process

### Branch Naming

Use descriptive branch names:

| Type     | Pattern                | Example                    |
| -------- | ---------------------- | -------------------------- |
| Feature  | `feature/description`  | `feature/add-dark-mode`    |
| Bug fix  | `fix/description`      | `fix/notification-crash`   |
| Docs     | `docs/description`     | `docs/update-api-guide`    |
| Refactor | `refactor/description` | `refactor/polling-service` |

### Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change without feature/fix
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**

```bash
feat(agents): add custom skill support

fix(github): handle rate limit errors gracefully

docs(api): add inline comments endpoint docs

refactor(polling): extract scheduler into separate module
```

### Workflow

```
1. Create issue (or find existing one)
        │
        ▼
2. Fork and create branch
        │
        ▼
3. Make changes
        │
        ├── Write code
        ├── Add tests
        └── Update docs
        │
        ▼
4. Run checks locally
        │
        ├── npm run typecheck
        ├── npm run lint
        └── npm test
        │
        ▼
5. Push and create PR
        │
        ▼
6. Address review feedback
        │
        ▼
7. Merge (maintainer)
```

---

## Pull Request Guidelines

### Before Submitting

- [ ] Code compiles without errors (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `main`

### PR Template

```markdown
## Description

Brief description of changes.

## Related Issue

Fixes #123

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe):

## Testing

Describe how you tested the changes.

## Screenshots (if applicable)

Add screenshots for UI changes.

## Checklist

- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Self-reviewed the code
```

### Review Process

1. **Automated checks** - CI runs type checking, linting, and tests
2. **Code review** - A maintainer reviews the changes
3. **Feedback** - Address any requested changes
4. **Approval** - Maintainer approves the PR
5. **Merge** - PR is merged to `main`

### Tips for Good PRs

- **Keep PRs focused** - One feature/fix per PR
- **Keep PRs small** - Easier to review, faster to merge
- **Write good descriptions** - Explain what and why
- **Respond promptly** - Address feedback quickly
- **Be patient** - Reviews take time

---

## Coding Standards

### TypeScript

```typescript
// Use strict types
function process(input: string): Result // Good
function process(input: any) // Avoid

// Use explicit return types for public functions
export function calculate(x: number): number {
  return x * 2
}

// Use type imports
import type { Config } from './types.js'

// Use .js extensions for local imports
import { helper } from './utils/helper.js'
```

### Error Handling

```typescript
// Use custom error classes
throw new ConfigError('Invalid configuration')

// Catch specific errors
try {
  await apiCall()
} catch (error) {
  if (error instanceof GitHubError) {
    // Handle GitHub errors
  }
  throw error // Re-throw unknown errors
}

// Log errors with context
logger.error('Operation failed', {
  error: err.message,
  context: { prId, userId },
})
```

### Logging

```typescript
// Use appropriate log levels
debug('Detailed debugging info') // Development
info('Normal operations') // Production
warn('Potential issues') // Problems that aren't errors
error('Actual errors') // Things that failed

// Include context
info('Processing PR', { prId: pr.id, author: pr.author })
```

### File Organization

```typescript
// File structure:
// 1. Module docstring
// 2. Type imports
// 3. Value imports
// 4. Local types/interfaces
// 5. Constants
// 6. Exported functions
// 7. Private helpers

/** Service for processing pull requests */

import type { PullRequest } from '../types/pr.js'
import { logger } from '../utils/logger.js'

interface ProcessOptions {
  timeout: number
}

const DEFAULT_TIMEOUT = 30000

export async function processPR(pr: PullRequest): Promise<void> {
  // ...
}

function validate(pr: PullRequest): boolean {
  // ...
}
```

---

## Testing Requirements

### Test Coverage

- **Business logic** - 80% minimum coverage
- **API routes** - All endpoints must have tests
- **Services** - Core functions must have tests
- **Edge cases** - Test error conditions

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ServiceName', () => {
  describe('functionName', () => {
    it('should handle normal case', async () => {
      const result = await functionName(input)
      expect(result).toEqual(expected)
    })

    it('should handle error case', async () => {
      await expect(functionName(badInput)).rejects.toThrow()
    })

    it('should handle edge case', async () => {
      const result = await functionName(edgeInput)
      expect(result).toBeNull()
    })
  })
})
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific file
npm test -- src/__tests__/services/github/client.test.ts
```

---

## Documentation

### When to Update Docs

- **New features** - Add to relevant guides
- **API changes** - Update API.md
- **Configuration changes** - Update SETUP.md
- **Architecture changes** - Update ARCHITECTURE.md

### Documentation Style

- Use clear, concise language
- Include code examples
- Use tables for structured information
- Add cross-references to related docs

### README Updates

The main README should remain concise. Detailed information goes in `/docs/`.

---

## Release Process

### Version Numbers

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features, backward compatible
- **PATCH** (0.0.1) - Bug fixes, backward compatible

### Release Steps (Maintainers)

1. Update version: `npm version [major|minor|patch]`
2. Update CHANGELOG.md
3. Create release PR
4. After merge, create GitHub release
5. Build and upload artifacts

### Changelog Format

```markdown
## [1.2.0] - 2024-01-15

### Added

- New feature X (#123)
- Support for Y (#124)

### Changed

- Improved Z performance (#125)

### Fixed

- Bug in W (#126)

### Deprecated

- Old API endpoint (#127)
```

---

## Questions?

- **General questions** - Open a Discussion
- **Bug reports** - Open an Issue
- **Feature requests** - Open an Issue
- **Security issues** - Email maintainers directly

Thank you for contributing!
