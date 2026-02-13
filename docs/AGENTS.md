# Review Agents Guide

Review agents are configurable AI profiles that determine how code reviews are conducted. This guide explains how to use built-in agents, create custom agents, and leverage the skills system.

## Table of Contents

- [Overview](#overview)
- [Built-in Agent](#built-in-agent)
- [Creating Custom Agents](#creating-custom-agents)
- [Skills System](#skills-system)
- [Custom Skills](#custom-skills)
- [Memories](#memories)
- [Advanced Configuration](#advanced-configuration)
- [Best Practices](#best-practices)

---

## Overview

An agent defines:

| Property        | Description                                        |
| --------------- | -------------------------------------------------- |
| **Prompt**      | System instructions for the AI reviewer            |
| **Model**       | Which AI model to use (Claude Sonnet, Opus, etc.)  |
| **Temperature** | Creativity level (0 = deterministic, 1 = creative) |
| **Skills**      | Specialized knowledge areas to apply               |

### How Agents Work

```
User selects agent
        │
        ▼
Agent's prompt + selected skills
        │
        ▼
Combined with PR data (diff, description)
        │
        ▼
Sent to AI model via OpenCode
        │
        ▼
Structured review output
```

---

## Built-in Agent

The app includes a default "PR Reviewer" agent:

```json
{
  "id": "pr-reviewer",
  "name": "PR Reviewer",
  "description": "General-purpose code reviewer",
  "model": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.3,
  "isBuiltIn": true,
  "isDefault": true
}
```

The default agent analyzes:

- **Code Quality** - Clean code, naming, DRY violations
- **Potential Bugs** - Edge cases, null checks, async issues
- **Security** - Input validation, injection risks, auth issues
- **Performance** - N+1 queries, memory leaks, inefficiencies
- **Best Practices** - Framework conventions, testing, documentation

---

## Creating Custom Agents

### Via Settings UI

1. Click the tray icon and select **Settings**
2. Navigate to **Agents** tab
3. Click **Create Agent**
4. Fill in the form:
   - Name
   - Description
   - Model
   - Temperature
   - Prompt
   - Skills
5. Click **Save**

### Via API

```bash
curl -X POST http://localhost:3847/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Security Reviewer",
    "description": "Focuses on security vulnerabilities",
    "model": "anthropic/claude-sonnet-4-20250514",
    "temperature": 0.1,
    "prompt": "You are a security-focused code reviewer...",
    "skills": ["security", "error-handling"]
  }'
```

### Agent Properties

| Property      | Type     | Required | Description                            |
| ------------- | -------- | -------- | -------------------------------------- |
| `name`        | string   | Yes      | Display name for the agent             |
| `description` | string   | Yes      | Brief description of the agent's focus |
| `model`       | string   | Yes      | AI model identifier                    |
| `temperature` | number   | Yes      | 0.0 to 1.0 (lower = more consistent)   |
| `prompt`      | string   | Yes      | System prompt for the AI               |
| `isDefault`   | boolean  | No       | Set as the default agent               |
| `maxSteps`    | number   | No       | Maximum reasoning steps (default: 50)  |
| `focus`       | string[] | No       | Review focus areas                     |
| `skills`      | string[] | No       | Skill IDs to apply                     |

---

## Skills System

Skills are specialized knowledge modules that enhance agent reviews. They inject focused instructions into the review prompt.

### Built-in Skills

| Skill ID         | Name           | Focus Area                               |
| ---------------- | -------------- | ---------------------------------------- |
| `security`       | Security       | Vulnerabilities, auth, injection attacks |
| `performance`    | Performance    | N+1 queries, memory, algorithms          |
| `code-quality`   | Code Quality   | SOLID, DRY, complexity, naming           |
| `testing`        | Testing        | Coverage, edge cases, test quality       |
| `documentation`  | Documentation  | JSDoc, comments, README                  |
| `accessibility`  | Accessibility  | ARIA, keyboard nav, screen readers       |
| `typescript`     | TypeScript     | Types, generics, strict mode             |
| `react`          | React          | Hooks, components, state management      |
| `nodejs`         | Node.js        | Async, streams, error handling           |
| `database`       | Database       | Queries, indexes, transactions           |
| `api-design`     | API Design     | REST conventions, error handling         |
| `error-handling` | Error Handling | Try-catch, recovery, logging             |

### Skill Details

#### Security Skill

```markdown
## Security Focus

Pay special attention to:

- SQL injection, XSS, CSRF vulnerabilities
- Authentication and authorization issues
- Sensitive data exposure (API keys, passwords, tokens)
- Input validation and sanitization
- Secure communication (HTTPS, encryption)
- Dependency vulnerabilities
- Rate limiting and DoS protection
- Secure session management
```

#### Performance Skill

```markdown
## Performance Focus

Pay special attention to:

- N+1 query problems
- Unnecessary re-renders in React
- Memory leaks and resource cleanup
- Inefficient algorithms (O(n^2) when O(n) is possible)
- Missing caching opportunities
- Large bundle sizes and code splitting
- Lazy loading opportunities
- Database index usage
- Unnecessary computations in loops
```

#### TypeScript Skill

```markdown
## TypeScript Focus

Pay special attention to:

- Proper type definitions (avoid 'any')
- Type inference vs explicit types
- Union types and discriminated unions
- Proper use of generics
- Type guards and narrowing
- Interface vs type usage
- Strict null checks
- Readonly and immutability
- Utility types usage
```

### Combining Skills

Agents can use multiple skills:

```json
{
  "name": "Full Stack Reviewer",
  "skills": ["security", "typescript", "react", "nodejs", "database"]
}
```

The skills are combined in the prompt, giving the AI reviewer comprehensive knowledge.

---

## Custom Skills

You can create custom skills by adding markdown files to a skills folder.

### Setup

1. Create a skills directory:

```bash
mkdir -p ~/.config/prpal/skills
```

2. Configure the skills folder in settings:

```json
{
  "opencode": {
    "skillsFolder": "~/.config/prpal/skills"
  }
}
```

### Creating a Custom Skill

Create a markdown file in your skills folder:

```bash
cat > ~/.config/prpal/skills/company-standards.md << 'EOF'
---
name: Company Standards
description: Osome coding conventions and standards
icon: building
---

## Company Coding Standards

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes and React components
- Use SCREAMING_SNAKE_CASE for constants
- Prefix interfaces with 'I' (e.g., IUser)

### File Structure
- One component per file
- Co-locate tests with source files
- Use barrel exports (index.ts)

### Code Style
- Maximum line length: 100 characters
- Use early returns to reduce nesting
- Prefer const over let
- No magic numbers - use named constants

### Testing Requirements
- Minimum 80% code coverage
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
EOF
```

### Skill File Format

```markdown
---
name: Display Name
description: Brief description
icon: emoji-or-icon-name
---

# Skill Content

Your custom review instructions here...
```

**Frontmatter Fields:**

| Field         | Required | Description                         |
| ------------- | -------- | ----------------------------------- |
| `name`        | No       | Display name (defaults to filename) |
| `description` | No       | Brief description                   |
| `icon`        | No       | Icon identifier (default: document) |

### Using Custom Skills

Custom skills appear with the `custom:` prefix:

```json
{
  "skills": ["security", "custom:company-standards"]
}
```

---

## Memories

Memories provide persistent context about your project that applies to all reviews.

### Setup

1. Create a memories directory:

```bash
mkdir -p ~/.config/prpal/memories
```

2. Configure the memories folder:

```json
{
  "opencode": {
    "memoriesFolder": "~/.config/prpal/memories"
  }
}
```

### Creating Memories

Create markdown files with project context:

```bash
cat > ~/.config/prpal/memories/project-context.md << 'EOF'
---
name: Project Context
---

# Project Overview

This is a fintech SaaS application for small business accounting.

## Technology Stack
- Frontend: React 18 with TypeScript
- Backend: Node.js with Fastify
- Database: PostgreSQL with Prisma ORM
- Queue: Redis with BullMQ
- Infrastructure: AWS ECS, RDS

## Key Architectural Decisions
- Domain-driven design with bounded contexts
- Event sourcing for financial transactions
- CQRS for complex queries
- Multi-tenant with row-level security

## Security Requirements
- SOC 2 Type II compliant
- PCI DSS for payment processing
- GDPR compliance for EU users
- All PII must be encrypted at rest

## Performance SLAs
- API response time < 200ms p95
- Page load time < 3s
- Uptime 99.9%
EOF
```

### How Memories Work

Memories are **always included** in every review, providing consistent project context:

```
Agent Prompt
    │
    ├── Skills (selected per agent)
    │
    └── Memories (always included)
            │
            ▼
      Combined Prompt
```

---

## Advanced Configuration

### Temperature Guidelines

| Temperature | Use Case                                |
| ----------- | --------------------------------------- |
| 0.0 - 0.2   | Security reviews, compliance checks     |
| 0.2 - 0.4   | General code reviews (recommended)      |
| 0.4 - 0.6   | Creative suggestions, refactoring ideas |
| 0.6 - 1.0   | Not recommended for code reviews        |

### Model Selection

| Model             | Best For                            |
| ----------------- | ----------------------------------- |
| `claude-sonnet-4` | Most reviews (fast, capable)        |
| `claude-opus-4`   | Complex codebases, critical reviews |

### Example Agents

#### Security-Focused Agent

```json
{
  "name": "Security Auditor",
  "description": "Deep security analysis for sensitive code",
  "model": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.1,
  "skills": ["security", "error-handling"],
  "prompt": "You are a senior security engineer conducting a thorough security audit. Be very strict and flag any potential vulnerabilities, even minor ones. Consider OWASP Top 10, supply chain attacks, and business logic flaws."
}
```

#### Performance-Focused Agent

```json
{
  "name": "Performance Optimizer",
  "description": "Identifies performance bottlenecks",
  "model": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.2,
  "skills": ["performance", "database", "nodejs"],
  "prompt": "You are a performance expert. Focus on identifying bottlenecks, inefficient patterns, and optimization opportunities. Consider both runtime performance and resource utilization."
}
```

#### Junior-Friendly Agent

```json
{
  "name": "Mentor",
  "description": "Educational reviews for junior developers",
  "model": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.4,
  "skills": ["code-quality", "documentation"],
  "prompt": "You are a senior developer mentoring a junior team member. Provide educational feedback that explains the 'why' behind suggestions. Be encouraging while still maintaining code quality standards."
}
```

#### Quick Review Agent

```json
{
  "name": "Quick Check",
  "description": "Fast review for small PRs",
  "model": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.3,
  "skills": [],
  "maxSteps": 20,
  "prompt": "Perform a quick review focusing only on critical issues. Skip minor style suggestions. Only flag problems that could cause bugs or security issues."
}
```

---

## Best Practices

### Agent Design

1. **Single Purpose** - Each agent should have a clear focus
2. **Appropriate Skills** - Select skills relevant to the agent's purpose
3. **Clear Prompts** - Be specific about what the agent should focus on
4. **Test Your Agents** - Try them on representative PRs before relying on them

### Prompt Writing

```markdown
Good prompt structure:

1. Role definition (who is the reviewer)
2. Focus areas (what to look for)
3. Output expectations (how to format findings)
4. Constraints (what to ignore/emphasize)
```

**Example:**

```
You are a senior backend engineer reviewing API changes.

Focus on:
- RESTful design principles
- Error handling and status codes
- Request/response validation
- Breaking changes

Ignore:
- Minor formatting issues
- Documentation style
- Test implementation details

For each issue, explain the impact and provide a concrete fix.
```

### Skill Selection

| Review Type        | Recommended Skills                         |
| ------------------ | ------------------------------------------ |
| API changes        | `api-design`, `error-handling`, `security` |
| Frontend changes   | `react`, `typescript`, `accessibility`     |
| Database changes   | `database`, `performance`, `security`      |
| Full-stack feature | `code-quality`, `typescript`, `testing`    |
| Security-sensitive | `security`, `error-handling`               |

### Memory Management

- Keep memories focused on **stable** project context
- Update memories when major architectural decisions change
- Don't include frequently changing information
- Keep memory files reasonably sized (under 2000 words each)
