# API Reference

PRPal exposes a local REST API for the UI and external integrations.

## Overview

| Property           | Value                   |
| ------------------ | ----------------------- |
| **Base URL**       | `http://localhost:3847` |
| **Protocol**       | HTTP (local only)       |
| **Format**         | JSON                    |
| **Authentication** | None (localhost only)   |

## Table of Contents

- [Health & Status](#health--status)
- [Pull Requests](#pull-requests)
- [Reviews](#reviews)
- [Agents](#agents)
- [Models](#models)
- [Settings](#settings)
- [Onboarding](#onboarding)
- [Error Handling](#error-handling)

---

## Health & Status

### GET /health

Simple health check endpoint.

**Response**

```json
{
  "status": "ok"
}
```

**Status Codes**

| Code  | Description       |
| ----- | ----------------- |
| `200` | Server is healthy |

---

### GET /api/status

Detailed application status including polling state and PR counts.

**Response**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "polling": {
    "active": true,
    "lastPoll": "2024-01-15T10:28:00.000Z",
    "pollCount": 42
  },
  "prs": {
    "total": 5,
    "new": 2
  },
  "opencode": {
    "installed": true,
    "path": "/usr/local/bin/opencode"
  }
}
```

**Response Fields**

| Field                | Type           | Description                                    |
| -------------------- | -------------- | ---------------------------------------------- |
| `status`             | `string`       | `ok` if healthy, `degraded` if issues detected |
| `timestamp`          | `string`       | Current server time (ISO 8601)                 |
| `version`            | `string`       | Application version                            |
| `polling.active`     | `boolean`      | Whether polling is running                     |
| `polling.lastPoll`   | `string\|null` | Time of last poll                              |
| `polling.pollCount`  | `number`       | Total polls since startup                      |
| `prs.total`          | `number`       | Total tracked PRs                              |
| `prs.new`            | `number`       | Unseen PRs                                     |
| `opencode.installed` | `boolean`      | Whether OpenCode CLI is available              |
| `opencode.path`      | `string\|null` | Path to OpenCode binary                        |

---

## Pull Requests

### GET /api/prs

List all tracked pull requests where you are a requested reviewer.

**Query Parameters**

| Parameter | Type     | Default | Description                                                           |
| --------- | -------- | ------- | --------------------------------------------------------------------- |
| `status`  | `string` | -       | Filter by status: `new`, `seen`, `reviewing`, `reviewed`, `dismissed` |

**Response**

```json
{
  "prs": [
    {
      "id": "OsomePteLtd/repo#123",
      "number": 123,
      "title": "Add new feature",
      "author": "username",
      "authorAvatar": "https://avatars.githubusercontent.com/u/123",
      "repository": "OsomePteLtd/repo",
      "htmlUrl": "https://github.com/OsomePteLtd/repo/pull/123",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "reviewStatus": "pending",
      "hasNewActivity": true,
      "needsMyReview": true,
      "requestedReviewers": ["alice", "bob"],
      "requestedTeams": ["backend-team"]
    }
  ],
  "total": 1
}
```

**Response Fields**

| Field                | Type       | Description                                |
| -------------------- | ---------- | ------------------------------------------ |
| `id`                 | `string`   | Unique PR identifier (`owner/repo#number`) |
| `number`             | `number`   | PR number                                  |
| `title`              | `string`   | PR title                                   |
| `author`             | `string`   | PR author's username                       |
| `authorAvatar`       | `string`   | URL to author's avatar                     |
| `repository`         | `string`   | Full repository name                       |
| `htmlUrl`            | `string`   | GitHub PR URL                              |
| `updatedAt`          | `string`   | Last update time                           |
| `reviewStatus`       | `string`   | `pending`, `reviewing`, or `reviewed`      |
| `hasNewActivity`     | `boolean`  | True if PR hasn't been seen                |
| `needsMyReview`      | `boolean`  | True if user is requested reviewer         |
| `requestedReviewers` | `string[]` | Individual reviewers requested             |
| `requestedTeams`     | `string[]` | Teams requested for review                 |

---

### GET /api/prs/:id

Get detailed PR information including diff, files, and CI checks.

**Path Parameters**

| Parameter | Type     | Description                                          |
| --------- | -------- | ---------------------------------------------------- |
| `id`      | `string` | URL-encoded PR ID (e.g., `OsomePteLtd%2Frepo%23123`) |

**Response**

```json
{
  "id": "OsomePteLtd/repo#123",
  "number": 123,
  "title": "Add new feature",
  "body": "## Description\nThis PR adds...",
  "author": {
    "login": "username",
    "avatar_url": "https://avatars.githubusercontent.com/u/123"
  },
  "repository": {
    "owner": "OsomePteLtd",
    "name": "repo",
    "fullName": "OsomePteLtd/repo"
  },
  "htmlUrl": "https://github.com/OsomePteLtd/repo/pull/123",
  "state": "open",
  "draft": false,
  "head": {
    "ref": "feature-branch",
    "sha": "abc123def456..."
  },
  "base": {
    "ref": "main",
    "sha": "def456abc123..."
  },
  "requestedReviewers": [{ "login": "alice", "avatar_url": "..." }],
  "requestedTeams": [{ "name": "backend-team", "slug": "backend-team" }],
  "labels": ["enhancement", "needs-review"],
  "files": [
    {
      "filename": "src/index.ts",
      "status": "modified",
      "additions": 10,
      "deletions": 5,
      "patch": "@@ -1,5 +1,10 @@\n-old line\n+new line"
    }
  ],
  "diff": "diff --git a/src/index.ts b/src/index.ts\n...",
  "checks": [
    {
      "name": "CI / build",
      "status": "completed",
      "conclusion": "success"
    },
    {
      "name": "CI / test",
      "status": "completed",
      "conclusion": "success"
    }
  ],
  "stats": {
    "additions": 10,
    "deletions": 5,
    "changedFiles": 1,
    "comments": 2,
    "reviewComments": 0
  },
  "createdAt": "2024-01-14T09:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**File Status Values**

| Status     | Description             |
| ---------- | ----------------------- |
| `added`    | New file                |
| `removed`  | Deleted file            |
| `modified` | Changed file            |
| `renamed`  | Renamed file            |
| `copied`   | Copied file             |
| `changed`  | Permission/type changed |

**Check Status Values**

| Status        | Description       |
| ------------- | ----------------- |
| `queued`      | Waiting to run    |
| `in_progress` | Currently running |
| `completed`   | Finished          |

**Check Conclusion Values**

| Conclusion        | Description         |
| ----------------- | ------------------- |
| `success`         | Passed              |
| `failure`         | Failed              |
| `neutral`         | Informational       |
| `cancelled`       | Was cancelled       |
| `skipped`         | Was skipped         |
| `timed_out`       | Timed out           |
| `action_required` | Needs manual action |

**Error Responses**

| Code  | Response                      |
| ----- | ----------------------------- |
| `404` | `{ "error": "PR not found" }` |

---

### POST /api/prs/:id/seen

Mark a PR as seen (removes the "new" badge).

**Path Parameters**

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `id`      | `string` | URL-encoded PR ID |

**Response**

```json
{
  "success": true
}
```

---

### POST /api/prs/:id/dismiss

Dismiss a PR from the tracking list.

**Path Parameters**

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `id`      | `string` | URL-encoded PR ID |

**Response**

```json
{
  "success": true
}
```

---

## Reviews

### POST /api/review/:prId

Start an AI-powered code review for a pull request.

**Path Parameters**

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `prId`    | `string` | URL-encoded PR ID |

**Request Body**

```json
{
  "agentId": "security-reviewer"
}
```

| Field     | Type     | Required | Description                               |
| --------- | -------- | -------- | ----------------------------------------- |
| `agentId` | `string` | No       | Custom agent ID (uses default if omitted) |

**Response (Success)**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prId": "OsomePteLtd/repo#123",
  "prNumber": 123,
  "agentId": "pr-reviewer",
  "output": {
    "summary": "This PR implements a new authentication feature with good code structure. The changes are well-organized but there are a few security concerns that should be addressed.",
    "verdict": "request_changes",
    "issues": [
      {
        "severity": "critical",
        "file": "src/auth/login.ts",
        "line": 42,
        "endLine": 45,
        "message": "Password is logged in plain text",
        "suggestion": "Remove the console.log statement or use a masked version"
      },
      {
        "severity": "warning",
        "file": "src/auth/session.ts",
        "line": 18,
        "message": "Session timeout is set to 24 hours, which is longer than recommended",
        "suggestion": "Consider reducing to 1-2 hours for sensitive operations"
      },
      {
        "severity": "info",
        "file": "src/utils/crypto.ts",
        "line": 5,
        "message": "Consider using crypto.subtle instead of node:crypto for browser compatibility"
      }
    ],
    "suggestions": [
      {
        "message": "Add unit tests for the new authentication flow"
      },
      {
        "message": "Consider adding rate limiting to prevent brute force attacks",
        "file": "src/auth/login.ts"
      }
    ],
    "positives": [
      "Good separation of concerns between auth modules",
      "Clear error messages for users",
      "TypeScript types are well-defined"
    ]
  },
  "rawResponse": "...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "duration": 5432
}
```

**Response Fields**

| Field                | Type     | Description                                |
| -------------------- | -------- | ------------------------------------------ |
| `id`                 | `string` | Unique review ID (UUID)                    |
| `prId`               | `string` | PR identifier                              |
| `prNumber`           | `number` | PR number                                  |
| `agentId`            | `string` | Agent used for review                      |
| `output`             | `object` | Structured review output                   |
| `output.summary`     | `string` | 2-3 sentence overview                      |
| `output.verdict`     | `string` | `approve`, `request_changes`, or `comment` |
| `output.issues`      | `array`  | Problems found                             |
| `output.suggestions` | `array`  | Improvement recommendations                |
| `output.positives`   | `array`  | Things done well (optional)                |
| `rawResponse`        | `string` | Raw AI response                            |
| `createdAt`          | `string` | Review timestamp                           |
| `duration`           | `number` | Review time in milliseconds                |

**Issue Severity Levels**

| Severity   | Description                |
| ---------- | -------------------------- |
| `critical` | Must be fixed before merge |
| `warning`  | Should be addressed        |
| `info`     | Minor suggestion or note   |

**Error Responses**

| Code  | Response                                    |
| ----- | ------------------------------------------- |
| `400` | `{ "error": "Agent not found" }`            |
| `404` | `{ "error": "PR not found" }`               |
| `409` | `{ "error": "Review already in progress" }` |
| `503` | `{ "error": "OpenCode not available" }`     |

---

### GET /api/review/:prId

Get the current review status or result for a PR.

**Path Parameters**

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `prId`    | `string` | URL-encoded PR ID |

**Response (In Progress)**

```json
{
  "prId": "OsomePteLtd/repo#123",
  "status": "in_progress",
  "stage": "analyzing",
  "progress": 50,
  "startedAt": "2024-01-15T10:30:00.000Z"
}
```

**Response (Completed)**

```json
{
  "prId": "OsomePteLtd/repo#123",
  "status": "completed",
  "result": {
    "id": "...",
    "output": { ... },
    "...": "..."
  },
  "inlineComments": [
    {
      "issue": { "severity": "warning", "message": "..." },
      "file": "src/index.ts",
      "requestedLine": 42,
      "actualLine": 42,
      "isValid": true,
      "selected": true,
      "issueIndex": 0
    }
  ],
  "completedAt": "2024-01-15T10:30:05.000Z"
}
```

**Response (Failed)**

```json
{
  "prId": "OsomePteLtd/repo#123",
  "status": "failed",
  "error": "OpenCode timeout after 120000ms",
  "completedAt": "2024-01-15T10:32:00.000Z"
}
```

**Review Stages**

| Stage           | Description                 |
| --------------- | --------------------------- |
| `starting`      | Initializing review         |
| `fetching_diff` | Getting PR diff from GitHub |
| `analyzing`     | AI analyzing code           |
| `generating`    | AI generating review        |
| `parsing`       | Parsing AI response         |

**Error Responses**

| Code  | Response                         |
| ----- | -------------------------------- |
| `404` | `{ "error": "No review found" }` |

---

### POST /api/review/:prId/cancel

Cancel an in-progress review.

**Path Parameters**

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `prId`    | `string` | URL-encoded PR ID |

**Response**

```json
{
  "success": true
}
```

**Error Responses**

| Code  | Response                               |
| ----- | -------------------------------------- |
| `400` | `{ "error": "No review in progress" }` |

---

### POST /api/review/:prId/post

Post a completed review to GitHub.

**Path Parameters**

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `prId`    | `string` | URL-encoded PR ID |

**Request Body**

```json
{
  "review": {
    "summary": "This PR implements...",
    "verdict": "comment",
    "issues": [...],
    "suggestions": [...]
  },
  "action": "comment",
  "formatOptions": {
    "style": "standard",
    "attribution": "subtle",
    "signature": "- Your Name"
  },
  "includeInlineComments": true,
  "selectedCommentIndices": [0, 1, 3],
  "editedBody": "Optional: custom review body text"
}
```

**Request Fields**

| Field                       | Type       | Required | Description                                |
| --------------------------- | ---------- | -------- | ------------------------------------------ |
| `review`                    | `object`   | Yes      | AI review output                           |
| `action`                    | `string`   | Yes      | `approve`, `request_changes`, or `comment` |
| `formatOptions`             | `object`   | Yes      | Formatting options                         |
| `formatOptions.style`       | `string`   | Yes      | `minimal`, `standard`, or `detailed`       |
| `formatOptions.attribution` | `string`   | Yes      | `none`, `subtle`, or `full`                |
| `formatOptions.signature`   | `string`   | No       | Custom signature line                      |
| `includeInlineComments`     | `boolean`  | No       | Post file-level comments                   |
| `selectedCommentIndices`    | `number[]` | No       | Which inline comments to post              |
| `editedBody`                | `string`   | No       | Override the review body                   |

**Response**

```json
{
  "id": 123456789,
  "htmlUrl": "https://github.com/OsomePteLtd/repo/pull/123#pullrequestreview-123456789",
  "state": "COMMENTED",
  "postedAt": "2024-01-15T10:35:00.000Z"
}
```

**GitHub Review States**

| State               | Description       |
| ------------------- | ----------------- |
| `APPROVED`          | Approved the PR   |
| `CHANGES_REQUESTED` | Requested changes |
| `COMMENTED`         | Left a comment    |

---

## Agents

### GET /api/agents

List all review agents (built-in and custom).

**Response**

```json
{
  "agents": [
    {
      "id": "pr-reviewer",
      "name": "PR Reviewer",
      "description": "General-purpose code reviewer",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.3,
      "prompt": "You are an expert code reviewer...",
      "isDefault": true,
      "isBuiltIn": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "skills": ["code-quality", "security"]
    },
    {
      "id": "security-reviewer",
      "name": "Security Focus",
      "description": "Reviews for security vulnerabilities",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.1,
      "prompt": "You are a security-focused reviewer...",
      "isDefault": false,
      "isBuiltIn": false,
      "createdAt": "2024-01-10T12:00:00.000Z",
      "updatedAt": "2024-01-10T12:00:00.000Z",
      "skills": ["security", "error-handling"]
    }
  ],
  "defaultAgentId": "pr-reviewer"
}
```

---

### POST /api/agents

Create a new custom review agent.

**Request Body**

```json
{
  "name": "Performance Reviewer",
  "description": "Focuses on performance optimization",
  "model": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.2,
  "prompt": "You are a performance-focused code reviewer. Focus on...",
  "isDefault": false,
  "maxSteps": 50,
  "focus": ["performance", "best-practices"],
  "skills": ["performance", "nodejs", "database"]
}
```

**Request Fields**

| Field         | Type       | Required | Description               |
| ------------- | ---------- | -------- | ------------------------- |
| `name`        | `string`   | Yes      | Display name              |
| `description` | `string`   | Yes      | Agent description         |
| `model`       | `string`   | Yes      | AI model identifier       |
| `temperature` | `number`   | Yes      | Model temperature (0-1)   |
| `prompt`      | `string`   | Yes      | System prompt for reviews |
| `isDefault`   | `boolean`  | No       | Set as default agent      |
| `maxSteps`    | `number`   | No       | Maximum reasoning steps   |
| `focus`       | `string[]` | No       | Review focus areas        |
| `skills`      | `string[]` | No       | Skill IDs to apply        |

**Response**

```json
{
  "id": "performance-reviewer",
  "name": "Performance Reviewer",
  "...": "..."
}
```

---

### PUT /api/agents/:id

Update an existing custom agent.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `string` | Agent ID    |

**Request Body** - Same as POST, all fields optional

**Response** - Updated agent object

**Error Responses**

| Code  | Response                                      |
| ----- | --------------------------------------------- |
| `400` | `{ "error": "Cannot modify built-in agent" }` |
| `404` | `{ "error": "Agent not found" }`              |

---

### DELETE /api/agents/:id

Delete a custom agent.

**Path Parameters**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `id`      | `string` | Agent ID    |

**Response**

```json
{
  "success": true
}
```

**Error Responses**

| Code  | Response                                      |
| ----- | --------------------------------------------- |
| `400` | `{ "error": "Cannot delete built-in agent" }` |
| `404` | `{ "error": "Agent not found" }`              |

---

### GET /api/agents/skills

List all available skills (built-in and custom).

**Response**

```json
{
  "skills": [
    {
      "id": "security",
      "name": "Security",
      "description": "Focus on security vulnerabilities and best practices",
      "icon": "lock",
      "isCustom": false
    },
    {
      "id": "custom:osome-conventions",
      "name": "Osome Conventions",
      "description": "Company-specific coding standards",
      "icon": "document",
      "isCustom": true
    }
  ]
}
```

---

## Models

### GET /api/models

List available AI models.

**Response**

```json
{
  "models": [
    {
      "id": "anthropic/claude-sonnet-4-20250514",
      "name": "Claude Sonnet 4",
      "provider": "anthropic",
      "recommended": true
    },
    {
      "id": "anthropic/claude-opus-4-20250514",
      "name": "Claude Opus 4",
      "provider": "anthropic",
      "recommended": false
    }
  ]
}
```

---

## Settings

### GET /api/settings

Get current application settings.

**Response**

```json
{
  "github": {
    "username": "your-username",
    "org": "OsomePteLtd"
  },
  "polling": {
    "intervalMs": 300000
  },
  "opencode": {
    "enabled": true,
    "model": "anthropic/claude-sonnet-4-20250514",
    "autoReview": true
  },
  "notification": {
    "enabled": true,
    "sound": true
  },
  "reviewFormat": {
    "style": "standard",
    "attribution": "subtle"
  }
}
```

Note: The GitHub PAT is never returned for security.

---

### PUT /api/settings

Update application settings.

**Request Body** - Partial settings object

```json
{
  "polling": {
    "intervalMs": 600000
  },
  "notification": {
    "sound": false
  }
}
```

**Response** - Updated settings object

---

## Onboarding

### GET /api/onboarding/status

Check onboarding completion status.

**Response**

```json
{
  "completed": false,
  "steps": {
    "github": false,
    "opencode": true
  }
}
```

---

### POST /api/onboarding/validate

Validate GitHub credentials during onboarding.

**Request Body**

```json
{
  "pat": "ghp_xxxxxxxxxxxx",
  "username": "your-username",
  "org": "OsomePteLtd"
}
```

**Response (Success)**

```json
{
  "valid": true,
  "user": {
    "login": "your-username",
    "name": "Your Name",
    "avatar_url": "https://..."
  },
  "org": {
    "login": "OsomePteLtd",
    "name": "Osome Pte Ltd"
  },
  "teams": ["backend", "platform"]
}
```

**Response (Failure)**

```json
{
  "valid": false,
  "error": "Invalid token or insufficient permissions"
}
```

---

### POST /api/onboarding/complete

Complete onboarding and save settings.

**Request Body**

```json
{
  "github": {
    "pat": "ghp_xxxxxxxxxxxx",
    "username": "your-username",
    "org": "OsomePteLtd"
  }
}
```

**Response**

```json
{
  "success": true
}
```

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "statusCode": 400,
  "details": {
    "field": "Additional context if available"
  }
}
```

### Common Error Codes

| Code  | Description                                       |
| ----- | ------------------------------------------------- |
| `400` | Bad Request - Invalid input or parameters         |
| `404` | Not Found - Resource doesn't exist                |
| `409` | Conflict - Operation conflicts with current state |
| `500` | Internal Server Error - Unexpected error          |
| `502` | Bad Gateway - GitHub API error                    |
| `503` | Service Unavailable - OpenCode not available      |
| `504` | Gateway Timeout - OpenCode or GitHub timeout      |

### GitHub API Rate Limiting

The app respects GitHub's rate limits (5000 requests/hour for authenticated requests). If you encounter rate limit errors:

1. Increase `pollIntervalMs` in configuration
2. Wait for the rate limit to reset (usually 1 hour)

### Retry Behavior

API calls to GitHub are automatically retried with exponential backoff:

- Maximum retries: 3
- Initial delay: 1 second
- Maximum delay: 10 seconds
- Retryable status codes: 408, 429, 500, 502, 503, 504

---

## Security Notes

1. **Local Only** - The API binds to `127.0.0.1` and is not accessible from other machines
2. **No Authentication** - Since it's local-only, no authentication is implemented
3. **Token Handling** - GitHub PAT is stored locally and only transmitted to GitHub API
4. **Never Expose** - Do not expose this API to the network or internet
