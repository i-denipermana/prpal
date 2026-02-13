# Development Guide

This guide covers development setup, coding standards, testing, and debugging for PRPal.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Git
- OpenCode CLI (for AI features)
- VS Code (recommended)

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd prpal

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your GitHub credentials
# Required: GITHUB_PAT, GITHUB_USERNAME, GITHUB_ORG
```

### VS Code Extensions

Recommended extensions for the best development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer"
  ]
}
```

### IDE Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Project Structure

```
prpal/
├── src/                    # Source code
│   ├── __tests__/          # Test files
│   ├── config/             # Configuration loading
│   ├── menubar/            # Electron menubar components
│   ├── renderer/           # Frontend HTML/CSS/JS
│   ├── server/             # Fastify API server
│   │   └── routes/         # API route handlers
│   ├── services/           # Business logic
│   │   ├── github/         # GitHub API integration
│   │   ├── notification/   # Desktop notifications
│   │   ├── opencode/       # OpenCode CLI integration
│   │   ├── polling/        # PR polling
│   │   └── state/          # State management
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── assets/                 # App icons
├── docs/                   # Documentation
├── dist/                   # Compiled output
├── release/                # Built distributables
└── scripts/                # Build scripts
```

### Key Files

| File                | Purpose                     |
| ------------------- | --------------------------- |
| `src/electron.ts`   | Electron main process entry |
| `src/index.ts`      | CLI/server-only entry       |
| `src/server/app.ts` | Fastify server setup        |
| `src/config/env.ts` | Configuration loading       |
| `package.json`      | Dependencies and scripts    |
| `tsconfig.json`     | TypeScript configuration    |
| `vitest.config.ts`  | Test configuration          |

---

## Development Workflow

### Running the App

```bash
# Development mode - server only (with hot reload)
npm run dev

# Development mode - Electron app
npm run dev:electron

# Production mode
npm run build
npm run start:electron
```

### Watch Mode

The `npm run dev` command uses `tsx watch` for automatic recompilation:

```bash
npm run dev
# Changes to .ts files trigger automatic restart
```

For Electron development:

```bash
# Build first, then run
npm run dev:electron
# Note: Changes require rebuild
```

### Build Commands

```bash
# Type check without emitting
npm run typecheck

# Compile TypeScript
npm run build

# Clean build directory
npm run clean

# Full rebuild
npm run rebuild

# Build distributable
npm run dist
```

---

## Coding Standards

### TypeScript

- **Strict mode** enabled - no implicit any
- **ES Modules** - use `.js` extensions in imports
- **Type imports** - use `import type` for types only

```typescript
// Good
import type { PullRequest } from './types/pr.js'
import { createServer } from './server/app.js'

// Bad
import { PullRequest } from './types/pr' // Missing .js
```

### File Organization

```typescript
// Standard file structure:

/** Module description */

// 1. Type imports
import type { SomeType } from './types.js'

// 2. Value imports
import { someFunction } from './utils.js'

// 3. Types and interfaces (if not in separate file)
interface LocalType { ... }

// 4. Constants
const DEFAULT_VALUE = 42

// 5. Main exports
export function publicFunction() { ... }

// 6. Private helpers
function privateHelper() { ... }
```

### Naming Conventions

| Element     | Convention      | Example              |
| ----------- | --------------- | -------------------- |
| Files       | camelCase       | `prStore.ts`         |
| Directories | camelCase       | `services/github/`   |
| Functions   | camelCase       | `fetchPRDetails()`   |
| Classes     | PascalCase      | `GitHubClient`       |
| Interfaces  | PascalCase      | `ReviewResult`       |
| Types       | PascalCase      | `PRStatus`           |
| Constants   | SCREAMING_SNAKE | `DEFAULT_TIMEOUT_MS` |
| Env vars    | SCREAMING_SNAKE | `GITHUB_PAT`         |

### Code Style

```typescript
// Use early returns
function processItem(item: Item | null): Result {
  if (!item) return defaultResult
  if (!item.isValid) return errorResult

  return doProcessing(item)
}

// Prefer const
const data = fetchData() // not let

// Destructure when appropriate
const { id, name } = user

// Use template literals
const message = `Processing ${count} items` // not 'Processing ' + count

// Explicit return types for public functions
export function calculate(input: number): number {
  return input * 2
}
```

### Error Handling

```typescript
// Use custom error classes
import { GitHubError, ConfigError } from '../types/errors.js'

// Throw typed errors
if (!token) {
  throw new ConfigError('GitHub PAT is required')
}

// Handle errors with proper typing
try {
  await fetchData()
} catch (error) {
  if (error instanceof GitHubError) {
    // Handle GitHub-specific error
  }
  throw error // Re-throw unknown errors
}
```

### Logging

```typescript
import { info, warn, error, debug } from '../utils/logger.js'

// Use appropriate log levels
debug('Detailed info for debugging', { data })
info('Normal operation events')
warn('Potential issues', { context })
error('Errors that need attention', { error: err.message })

// Always include context
info('Processing PR', { prId: pr.id, repo: pr.repository })
```

---

## Testing

### Test Framework

We use Vitest with MSW for API mocking.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Specific file
npm test -- src/__tests__/services/github/client.test.ts
```

### Test Structure

```
src/__tests__/
├── server/
│   └── routes/
│       ├── health.test.ts
│       ├── prs.test.ts
│       └── review.test.ts
└── services/
    ├── github/
    │   ├── client.test.ts
    │   ├── prFetcher.test.ts
    │   └── diffParser.test.ts
    └── opencode/
        ├── parser.test.ts
        └── reviewer.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock setup
const server = setupServer(
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json({ login: 'testuser' })
  })
)

describe('GitHubClient', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it('should fetch user data', async () => {
    const client = createGitHubClient({ token: 'test' })
    const user = await client.get('/user')

    expect(user).toEqual({ login: 'testuser' })
  })

  it('should handle errors', async () => {
    server.use(
      http.get('https://api.github.com/user', () => {
        return new HttpResponse(null, { status: 401 })
      })
    )

    const client = createGitHubClient({ token: 'invalid' })

    await expect(client.get('/user')).rejects.toThrow()
  })
})
```

### Mocking

```typescript
// Mock modules
vi.mock('../utils/logger.js', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}))

// Mock functions
const mockFetch = vi.fn()
vi.spyOn(global, 'fetch').mockImplementation(mockFetch)

// Mock timers
vi.useFakeTimers()
await vi.advanceTimersByTimeAsync(5000)
vi.useRealTimers()
```

### Coverage

Coverage reports are generated in `coverage/`:

```bash
npm run test:coverage
open coverage/index.html
```

Target coverage: 80% for business logic services.

---

## Debugging

### Console Logging

```typescript
// Temporary debug logs
console.log('DEBUG:', { variable })

// Use the logger for persistent logs
import { debug } from '../utils/logger.js'
debug('Processing', { data })
```

### Debug Log Level

Set `LOG_LEVEL=debug` in `.env`:

```env
LOG_LEVEL=debug
```

### Electron DevTools

In development, you can open DevTools:

```typescript
// In electron.ts, add:
mb.window?.webContents.openDevTools()
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--run"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Network Debugging

View API requests in the Electron DevTools Network tab, or use curl:

```bash
# Check server status
curl http://localhost:3847/api/status | jq

# List PRs
curl http://localhost:3847/api/prs | jq

# Test review endpoint
curl -X POST http://localhost:3847/api/review/test-id
```

---

## Common Tasks

### Adding a New API Endpoint

1. Create route file in `src/server/routes/`:

```typescript
// src/server/routes/newFeature.ts
import type { FastifyInstance } from 'fastify'

export async function newFeatureRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/new-feature', async (request, reply) => {
    return { data: 'Hello' }
  })
}
```

2. Register in `src/server/app.ts`:

```typescript
import { newFeatureRoutes } from './routes/newFeature.js'

// In registerPlugins:
await fastify.register(newFeatureRoutes)
```

3. Add tests in `src/__tests__/server/routes/newFeature.test.ts`

### Adding a New Service

1. Create service directory:

```bash
mkdir -p src/services/newService
```

2. Create service files:

```typescript
// src/services/newService/index.ts
export * from './core.js'

// src/services/newService/core.ts
export function doSomething(): void {
  // Implementation
}
```

3. Add types if needed in `src/types/`

4. Add tests in `src/__tests__/services/newService/`

### Adding a New Type

1. Add to appropriate file in `src/types/`:

```typescript
// src/types/newType.ts
export interface NewType {
  id: string
  name: string
}
```

2. Export from barrel:

```typescript
// src/types/index.ts
export * from './newType.js'
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update <package-name>

# Update all (within semver ranges)
npm update

# Check for security issues
npm audit

# Fix security issues
npm audit fix
```

### Building for Release

```bash
# 1. Update version in package.json
npm version patch  # or minor, major

# 2. Build
npm run build

# 3. Test the build
npm run start:electron

# 4. Create distributable
npm run dist

# 5. Test the distributable
open release/*.dmg
```
