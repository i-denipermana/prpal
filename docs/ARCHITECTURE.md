# Architecture Overview

This document describes the architecture and design of PRPal.

## Table of Contents

- [System Overview](#system-overview)
- [Process Architecture](#process-architecture)
- [Directory Structure](#directory-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Type System](#type-system)
- [External Integrations](#external-integrations)
- [Security Model](#security-model)

---

## System Overview

PRPal is a macOS menu bar application built with Electron. It consists of three main layers:

```
+------------------------------------------+
|             Electron Main Process         |
|  +--------------------------------------+ |
|  |           Menubar / Tray             | |
|  +--------------------------------------+ |
|  |          Fastify HTTP Server         | |
|  |  +----------+  +-----------------+   | |
|  |  |  Routes  |  |    Services     |   | |
|  |  +----------+  +-----------------+   | |
|  +--------------------------------------+ |
+------------------------------------------+
          |                    |
          v                    v
   +-------------+      +-------------+
   | GitHub API  |      | OpenCode    |
   +-------------+      | CLI         |
                        +-------------+
```

### Design Principles

1. **Single Process Architecture** - All server, UI, and background tasks run in the Electron main process
2. **Local-Only API** - REST API only binds to localhost for security
3. **Human-in-the-Loop** - AI reviews require explicit user approval
4. **Stateless Frontend** - The renderer process fetches all data from the local API
5. **In-Memory State** - No database; state resets on restart (PRs are refetched from GitHub)

---

## Process Architecture

### Electron Main Process (`electron.ts`)

The main process handles:

```typescript
// Key responsibilities:
1. Start Fastify HTTP server
2. Initialize GitHub client
3. Detect user's team memberships
4. Start PR polling scheduler
5. Create menubar with tray icon
6. Handle IPC from renderer windows
7. Manage detail/settings windows
8. Show desktop notifications
```

### Electron Renderer Process

Each window (menubar, PR detail, settings) runs its own renderer process:

- **No Node.js access** - `nodeIntegration: false`
- **Context isolation** - `contextIsolation: true`
- **Preload script** - Limited API via `window.electronAPI`
- **Fetch from local API** - All data comes from `http://localhost:3847`

### Fastify HTTP Server

The embedded server provides:

- Static file serving for HTML/CSS/JS
- REST API for all operations
- CORS enabled for local development

---

## Directory Structure

```
src/
├── index.ts                 # CLI/Server-only entry point
├── electron.ts              # Electron app entry point
│
├── config/
│   └── env.ts               # Configuration loading
│       ├── loadFromEnv()     # Load from environment variables
│       ├── loadFromFile()    # Load from JSON file
│       └── resolveConfig()   # Merge and apply defaults
│
├── menubar/                 # Electron-specific UI components
│   ├── index.ts             # Barrel export
│   ├── app.ts               # App lifecycle management
│   ├── menu.ts              # Context menu creation
│   ├── onboarding.ts        # First-run setup wizard
│   ├── preload.ts           # Preload script (TypeScript)
│   ├── preload.cjs          # Preload script (compiled CJS)
│   └── tray.ts              # System tray icon management
│
├── renderer/                # Frontend HTML/CSS/JS
│   ├── index.html           # Main PR list view
│   ├── pr-detail.html       # PR detail + review view
│   ├── settings.html        # Settings page
│   └── onboarding.html      # Setup wizard
│
├── server/                  # Fastify REST API
│   ├── app.ts               # Server factory
│   │   ├── createServer()   # Initialize Fastify instance
│   │   └── registerPlugins()# Register routes and middleware
│   ├── index.ts             # Barrel export + client setters
│   └── routes/
│       ├── health.ts        # GET /health, GET /api/status
│       ├── prs.ts           # PR listing and management
│       ├── review.ts        # AI review operations
│       ├── agents.ts        # Agent CRUD
│       ├── models.ts        # AI model listing
│       ├── settings.ts      # Settings management
│       └── onboarding.ts    # Onboarding API
│
├── services/                # Business logic layer
│   ├── github/              # GitHub API integration
│   │   ├── client.ts        # HTTP client with retry
│   │   ├── prFetcher.ts     # Fetch PRs from org repos
│   │   ├── diffFetcher.ts   # Fetch PR diffs + files
│   │   ├── diffParser.ts    # Parse unified diff format
│   │   ├── reviewFilter.ts  # Filter PRs by reviewer
│   │   ├── reviewPoster.ts  # Post reviews to GitHub
│   │   ├── inlineCommentPreparer.ts
│   │   └── teamDetector.ts  # Detect team memberships
│   │
│   ├── opencode/            # AI review integration
│   │   ├── index.ts         # Barrel export
│   │   ├── detector.ts      # Check OpenCode installation
│   │   ├── executor.ts      # Spawn OpenCode process
│   │   ├── reviewer.ts      # Orchestrate review workflow
│   │   ├── prompts.ts       # Review prompt templates
│   │   ├── parser.ts        # Parse AI JSON response
│   │   ├── skills.ts        # Built-in and custom skills
│   │   ├── configBuilder.ts # Build OpenCode config
│   │   ├── modelFetcher.ts  # Fetch available models
│   │   └── errorHandler.ts  # OpenCode error handling
│   │
│   ├── polling/             # PR monitoring
│   │   ├── index.ts         # Barrel export
│   │   └── scheduler.ts     # Periodic polling logic
│   │
│   ├── notification/        # Desktop notifications
│   │   ├── index.ts         # Barrel export
│   │   └── native.ts        # macOS native notifications
│   │
│   └── state/               # In-memory state management
│       ├── index.ts         # Barrel export
│       ├── prStore.ts       # PR state
│       ├── reviewStore.ts   # Review state
│       ├── agentStore.ts    # Agent definitions
│       ├── settingsStore.ts # App settings
│       └── onboardingStore.ts
│
├── types/                   # TypeScript type definitions
│   ├── index.ts             # Barrel export
│   ├── config.ts            # Config schemas (Zod)
│   ├── pr.ts                # Pull request types
│   ├── review.ts            # Review types
│   ├── agent.ts             # Agent types
│   ├── github.ts            # GitHub API response types
│   └── errors.ts            # Custom error classes
│
└── utils/                   # Shared utilities
    ├── index.ts             # Barrel export
    ├── logger.ts            # Pino logger configuration
    ├── retry.ts             # Retry with exponential backoff
    └── time.ts              # Time formatting utilities
```

---

## Core Components

### Configuration (`config/env.ts`)

Handles loading and validating configuration from multiple sources:

```typescript
// Configuration priority (highest to lowest):
1. JSON file (~/.config/prpal/settings.json)
2. Environment variables (.env file)
3. Default values

// Validation using Zod schemas
const AppConfigSchema = z.object({
  github: GitHubConfigSchema,      // Required
  polling: PollingConfigSchema,    // Optional with defaults
  server: ServerConfigSchema,      // Optional with defaults
  opencode: OpenCodeConfigSchema,  // Optional with defaults
  // ...
})
```

### GitHub Client (`services/github/client.ts`)

HTTP client for GitHub API with built-in retry logic:

```typescript
interface GitHubClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  // Uses ofetch with automatic retry on transient errors
}

// Features:
- Authorization header injection
- Retry with exponential backoff
- Rate limit handling
- Error transformation
```

### PR Fetcher (`services/github/prFetcher.ts`)

Fetches PRs across all organization repositories:

```typescript
async function fetchOrgPRs(
  client: GitHubClient,
  org: string
): Promise<GitHubPullRequest[]>

// Algorithm:
1. List all org repositories
2. For each repo, list open PRs
3. Fetch detailed PR data (stats, labels)
4. Parallelize within rate limits
```

### Review Filter (`services/github/reviewFilter.ts`)

Filters PRs where the user is a requested reviewer:

```typescript
function filterPRsForReviewer(
  prs: PullRequest[],
  username: string,
  userTeams: UserTeams
): PullRequest[]

// Matches PRs where:
- User is in requested_reviewers list
- User's team is in requested_teams list
- User hasn't already reviewed
```

### OpenCode Reviewer (`services/opencode/reviewer.ts`)

Orchestrates AI code reviews:

```typescript
async function reviewPR(
  pr: PRWithDetails,
  agent: ReviewAgent,
  onProgress?: (stage: ReviewStage) => void
): Promise<ReviewResult>

// Workflow:
1. Build review prompt from PR data
2. Apply agent skills and memories
3. Spawn OpenCode CLI process
4. Stream prompt via stdin
5. Parse JSON response from stdout
6. Validate and transform output
```

### Skills System (`services/opencode/skills.ts`)

Manages built-in and custom review skills:

```typescript
// Built-in skills
const SKILLS = {
  security: {
    /* prompt additions */
  },
  performance: {
    /* prompt additions */
  },
  'code-quality': {
    /* prompt additions */
  },
  testing: {
    /* prompt additions */
  },
  // ...12 total skills
}

// Custom skills from files
interface CustomSkill {
  id: string
  name: string
  description: string
  content: string // Markdown prompt content
  filePath: string
}

// Skills are loaded from configured folder
// and injected into review prompts
```

### Polling Scheduler (`services/polling/scheduler.ts`)

Periodically fetches PRs and triggers notifications:

```typescript
function startPolling(
  client: GitHubClient,
  org: string,
  username: string,
  userTeams: UserTeams,
  intervalMs: number,
  onNewPRs: (prs: PullRequest[]) => void
): void

// Behavior:
- Polls at configured interval
- Tracks seen PRs to avoid duplicate notifications
- Calls callback with new PRs only
- Handles errors gracefully (continues polling)
```

---

## Data Flow

### PR Monitoring Flow

```
Polling Scheduler
       │
       ▼
GitHub API (list repos → list PRs)
       │
       ▼
Review Filter (filter by reviewer)
       │
       ▼
PR Store (update state)
       │
       ├──▶ Badge Update
       │
       └──▶ Desktop Notification (if new)
```

### Review Flow

```
User clicks "Review with AI"
       │
       ▼
POST /api/review/:prId
       │
       ▼
Review Store (set status: in_progress)
       │
       ▼
Diff Fetcher (get PR diff from GitHub)
       │
       ▼
Prompt Builder (build review prompt)
       │
       ├── Base prompt (from agent)
       ├── Skills (security, performance, etc.)
       └── Memories (project context)
       │
       ▼
OpenCode Executor (spawn CLI process)
       │
       ├── stdin: review prompt
       └── stdout: JSON response
       │
       ▼
Response Parser (extract structured review)
       │
       ▼
Inline Comment Preparer (map issues to diff lines)
       │
       ▼
Review Store (set status: completed, result)
       │
       ▼
UI displays review for user approval
       │
       ▼
POST /api/review/:prId/post
       │
       ▼
Review Poster (format and post to GitHub)
```

---

## State Management

All state is managed in-memory using simple stores with change listeners:

### PR Store (`services/state/prStore.ts`)

```typescript
interface PRState {
  pr: PullRequest
  status: 'new' | 'seen' | 'reviewing' | 'reviewed' | 'dismissed'
  needsMyReview: boolean
  seenAt?: Date
  reviewStartedAt?: Date
  reviewCompletedAt?: Date
}

// Operations:
- setPRs(prs: PullRequest[])     // Update from poll
- markSeen(prId: string)         // User viewed PR
- markReviewing(prId: string)    // Review started
- markReviewed(prId: string)     // Review completed
- dismiss(prId: string)          // User dismissed PR
- addChangeListener(callback)    // Subscribe to changes
```

### Review Store (`services/state/reviewStore.ts`)

```typescript
interface ReviewState {
  prId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  stage?: ReviewStage
  progress?: number
  result?: ReviewResult
  error?: string
  startedAt?: Date
  completedAt?: Date
}

// Operations:
- startReview(prId: string)
- updateProgress(prId: string, stage: ReviewStage, progress: number)
- completeReview(prId: string, result: ReviewResult)
- failReview(prId: string, error: string)
- cancelReview(prId: string)
- getReview(prId: string): ReviewState | undefined
```

### Agent Store (`services/state/agentStore.ts`)

```typescript
interface AgentStore {
  agents: ReviewAgent[]
  defaultAgentId: string
}

// Operations:
- getAgents(): ReviewAgent[]
- getAgent(id: string): ReviewAgent | undefined
- getDefaultAgent(): ReviewAgent
- addAgent(agent: CreateAgentRequest): ReviewAgent
- updateAgent(id: string, update: UpdateAgentRequest): ReviewAgent
- deleteAgent(id: string): void
- setDefaultAgent(id: string): void
```

---

## Type System

### Zod Schema Validation

Configuration and API requests are validated using Zod:

```typescript
// Config schema example
const GitHubConfigSchema = z.object({
  pat: z.string().min(1, 'GitHub PAT is required'),
  username: z.string().min(1, 'GitHub username is required'),
  org: z.string().min(1, 'GitHub organization is required'),
})

// Type inference from schema
type GitHubConfig = z.infer<typeof GitHubConfigSchema>
```

### Domain Types

```typescript
// Pull Request types (types/pr.ts)
interface PullRequest { ... }
interface PRWithDetails extends PullRequest { ... }
interface PRFile { ... }
interface PRCheck { ... }
interface PRListItem { ... }  // For API response
type PRStatus = 'new' | 'seen' | 'reviewing' | 'reviewed' | 'dismissed'

// Review types (types/review.ts)
interface ReviewResult { ... }
interface AIReviewOutput { ... }
interface ReviewIssue { ... }
interface ReviewSuggestion { ... }
type ReviewVerdict = 'approve' | 'request_changes' | 'comment'
type ReviewSeverity = 'critical' | 'warning' | 'info'

// Agent types (types/agent.ts)
interface ReviewAgent { ... }
interface Skill { ... }
type SkillId = 'security' | 'performance' | ... // 12 built-in skills
```

### GitHub API Types

Raw GitHub API responses are typed in `types/github.ts`:

```typescript
interface GitHubPullRequest { ... }
interface GitHubRepository { ... }
interface GitHubUser { ... }
interface GitHubTeam { ... }
interface GitHubFile { ... }
interface GitHubCheckRun { ... }
interface GitHubReview { ... }
```

---

## External Integrations

### GitHub API

```
Base URL: https://api.github.com
Auth: Bearer token (PAT)
Rate Limit: 5000 req/hour (authenticated)

Used Endpoints:
- GET /orgs/{org}/repos           # List org repos
- GET /repos/{owner}/{repo}/pulls # List PRs
- GET /repos/{owner}/{repo}/pulls/{number}  # PR details
- GET /repos/{owner}/{repo}/pulls/{number}/files  # PR files
- GET /repos/{owner}/{repo}/commits/{ref}/check-runs  # CI checks
- POST /repos/{owner}/{repo}/pulls/{number}/reviews  # Post review
- GET /user/teams                 # User's teams
```

### OpenCode CLI

```
Binary: opencode (must be in PATH)
Communication: stdin/stdout (JSON)
Timeout: Configurable (default 2 minutes)

Invocation:
$ echo "<prompt>" | opencode chat --model <model> --format json

Permissions:
- No file write access
- No file edit access
- Limited bash (git read-only)
```

---

## Security Model

### Network Security

- **Local-only binding** - Server binds to `127.0.0.1` only
- **No authentication** - Since it's local, no auth needed
- **CORS restricted** - Only localhost origins allowed

### Token Security

- **Local storage** - PAT stored in user's config directory
- **Never logged** - PAT is never written to logs
- **Minimal scope** - Only `repo` and `read:org` required

### OpenCode Sandboxing

```typescript
// OpenCode is restricted via agent config
permission: {
  edit: 'deny',
  bash: {
    '*': 'deny',
    'git diff*': 'allow',
    'git log*': 'allow',
    'git show*': 'allow',
  },
}
```

### Human-in-the-Loop

All AI-generated reviews require explicit user action:

1. User views the generated review
2. User can edit the review content
3. User selects which inline comments to post
4. User explicitly clicks "Post Review"

---

## Performance Considerations

### Polling Optimization

- Default interval: 5 minutes (configurable)
- Parallel repo fetching within rate limits
- Incremental state updates (only changed PRs)

### Review Performance

- Async review generation (non-blocking)
- Cancellation support for long-running reviews
- Progress tracking and stage reporting

### Memory Management

- In-memory state only (no persistence)
- Automatic cleanup of dismissed PRs
- Bounded PR list (only open PRs tracked)
