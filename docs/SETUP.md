# Setup Guide

This guide provides detailed instructions for installing and configuring PRPal.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [First Run](#first-run)
- [Verification](#verification)
- [Building for Distribution](#building-for-distribution)
- [Updating](#updating)
- [Uninstalling](#uninstalling)

---

## Prerequisites

### 1. Operating System

- **macOS 12.0 (Monterey)** or later
- Apple Silicon (M1/M2/M3) or Intel processor

### 2. Node.js

Node.js 20.0 or later is required.

**Check your version:**

```bash
node --version
# Should output v20.0.0 or higher
```

**Install via Homebrew:**

```bash
brew install node@20
```

**Or using nvm (recommended):**

```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20
```

### 3. OpenCode CLI

The application uses OpenCode CLI for AI-powered code reviews.

**Install OpenCode:**

```bash
# Follow instructions at https://opencode.ai
# Typically:
npm install -g opencode
# or
brew install opencode
```

**Verify installation:**

```bash
opencode --version
```

**Configure OpenCode:**
OpenCode requires API credentials. Follow the [OpenCode documentation](https://opencode.ai/docs) to set up your API key.

### 4. GitHub Personal Access Token

You need a GitHub PAT with appropriate permissions.

**Creating a PAT:**

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name (e.g., "PRPal")
4. Select expiration (recommended: 90 days or custom)
5. Select these scopes:

| Scope       | Required | Purpose                               |
| ----------- | -------- | ------------------------------------- |
| `repo`      | Yes      | Access to private repositories        |
| `read:org`  | Yes      | Read organization and team membership |
| `read:user` | Optional | Read user profile information         |

6. Click **"Generate token"**
7. **Copy the token immediately** - you won't see it again!

**Token security tips:**

- Never commit your token to version control
- Store it securely (the app stores it locally in your config directory)
- Rotate tokens periodically
- Use a token with minimum required permissions

---

## Installation

### Clone the Repository

```bash
cd ~/Workspace  # or your preferred directory
git clone <repository-url> prpal
cd prpal
```

### Install Dependencies

```bash
npm install
```

This installs all required packages including:

- Electron for the desktop app
- Fastify for the local API server
- OpenCode integration libraries
- Testing and development tools

### Verify Installation

```bash
# Run type check
npm run typecheck

# Run tests
npm test
```

---

## Configuration

The application can be configured via environment variables or a JSON configuration file. JSON configuration takes precedence.

### Option A: Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
# Required Settings
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=your-github-username
GITHUB_ORG=YourOrganization

# Polling Settings
POLL_INTERVAL_MS=300000          # 5 minutes (minimum: 30000)

# Server Settings
SERVER_PORT=3847                  # Local API server port
SERVER_HOST=127.0.0.1            # Always localhost for security

# OpenCode Settings
OPENCODE_ENABLED=true            # Enable AI reviews
OPENCODE_MODEL=anthropic/claude-sonnet-4-20250514  # AI model
OPENCODE_TIMEOUT_MS=120000       # 2 minutes timeout
OPENCODE_PATH=                   # Custom path to opencode binary (optional)

# Logging
LOG_LEVEL=info                   # debug, info, warn, error
```

### Option B: JSON Configuration

Create the configuration directory:

```bash
mkdir -p ~/.config/prpal
```

Create `~/.config/prpal/settings.json`:

```json
{
  "github": {
    "pat": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "username": "your-github-username",
    "org": "YourOrganization"
  },
  "polling": {
    "intervalMs": 300000
  },
  "server": {
    "port": 3847,
    "host": "127.0.0.1"
  },
  "opencode": {
    "enabled": true,
    "model": "anthropic/claude-sonnet-4-20250514",
    "timeoutMs": 120000,
    "path": null,
    "autoReview": true,
    "skillsFolder": "~/.config/prpal/skills",
    "memoriesFolder": "~/.config/prpal/memories"
  },
  "notification": {
    "enabled": true,
    "sound": true
  },
  "reviewFormat": {
    "style": "standard",
    "attribution": "subtle",
    "signature": null
  },
  "logLevel": "info"
}
```

### Configuration Reference

#### GitHub Settings

| Setting           | Type   | Required | Default | Description                  |
| ----------------- | ------ | -------- | ------- | ---------------------------- |
| `github.pat`      | string | Yes      | -       | GitHub Personal Access Token |
| `github.username` | string | Yes      | -       | Your GitHub username         |
| `github.org`      | string | Yes      | -       | Organization to monitor      |

#### Polling Settings

| Setting              | Type   | Required | Default  | Description                                   |
| -------------------- | ------ | -------- | -------- | --------------------------------------------- |
| `polling.intervalMs` | number | No       | `300000` | Polling interval in milliseconds (min: 30000) |

#### Server Settings

| Setting       | Type   | Required | Default     | Description                     |
| ------------- | ------ | -------- | ----------- | ------------------------------- |
| `server.port` | number | No       | `3847`      | API server port (1024-65535)    |
| `server.host` | string | No       | `127.0.0.1` | Server host (keep as localhost) |

#### OpenCode Settings

| Setting                   | Type    | Required | Default                              | Description                    |
| ------------------------- | ------- | -------- | ------------------------------------ | ------------------------------ |
| `opencode.enabled`        | boolean | No       | `true`                               | Enable AI reviews              |
| `opencode.model`          | string  | No       | `anthropic/claude-sonnet-4-20250514` | AI model to use                |
| `opencode.timeoutMs`      | number  | No       | `120000`                             | Review timeout in ms           |
| `opencode.path`           | string  | No       | -                                    | Custom path to opencode binary |
| `opencode.autoReview`     | boolean | No       | `true`                               | Auto-start reviews on new PRs  |
| `opencode.skillsFolder`   | string  | No       | -                                    | Custom skills directory        |
| `opencode.memoriesFolder` | string  | No       | -                                    | Memories/context directory     |

#### Notification Settings

| Setting                | Type    | Required | Default | Description                  |
| ---------------------- | ------- | -------- | ------- | ---------------------------- |
| `notification.enabled` | boolean | No       | `true`  | Enable desktop notifications |
| `notification.sound`   | boolean | No       | `true`  | Play notification sounds     |

#### Review Format Settings

| Setting                    | Type   | Required | Default    | Description                          |
| -------------------------- | ------ | -------- | ---------- | ------------------------------------ |
| `reviewFormat.style`       | string | No       | `standard` | `minimal`, `standard`, or `detailed` |
| `reviewFormat.attribution` | string | No       | `subtle`   | `none`, `subtle`, or `full`          |
| `reviewFormat.signature`   | string | No       | -          | Custom signature line                |

#### Logging

| Setting    | Type   | Required | Default | Description                         |
| ---------- | ------ | -------- | ------- | ----------------------------------- |
| `logLevel` | string | No       | `info`  | `debug`, `info`, `warn`, or `error` |

---

## First Run

### Interactive Onboarding

On first launch, the app displays an onboarding wizard:

```bash
# Start the Electron app
npm run dev:electron
```

The wizard will:

1. **Check OpenCode** - Verify OpenCode CLI is installed
2. **Configure GitHub** - Enter your PAT, username, and organization
3. **Validate Credentials** - Test the GitHub connection
4. **Detect Teams** - Find your team memberships

### Command Line Setup

If you prefer, configure via command line before launching:

```bash
# 1. Create config file
cat > ~/.config/prpal/settings.json << EOF
{
  "github": {
    "pat": "YOUR_PAT_HERE",
    "username": "YOUR_USERNAME",
    "org": "YOUR_ORG"
  }
}
EOF

# 2. Launch the app
npm run dev:electron
```

---

## Verification

### Check the Health Endpoint

```bash
curl http://localhost:3847/health
# Response: {"status":"ok"}
```

### Check Application Status

```bash
curl http://localhost:3847/api/status | jq
```

Expected output:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "polling": {
    "active": true,
    "lastPoll": "2024-01-15T10:28:00.000Z",
    "pollCount": 1
  },
  "prs": {
    "total": 0,
    "new": 0
  },
  "opencode": {
    "installed": true,
    "path": "/usr/local/bin/opencode"
  }
}
```

### Check Logs

The app logs to stdout. In the Electron app, you can see logs in the terminal where you launched it:

```
INFO: Starting PRPal (Electron)...
INFO: Server listening on http://127.0.0.1:3847
INFO: Detected 3 teams for user
INFO: PRPal is running
INFO: Menubar ready
```

### Verify PR Detection

If you have pending review requests, you should see them:

```bash
curl http://localhost:3847/api/prs | jq
```

---

## Building for Distribution

### Development Build

```bash
# Build TypeScript
npm run build

# Run the built app
npm run start:electron
```

### Production Distribution

Build a distributable macOS application:

```bash
npm run dist
```

This creates:

- `release/PRPal-X.X.X.dmg` - Disk image installer
- `release/PRPal-X.X.X-mac.zip` - ZIP archive

### Installation from DMG

1. Open the `.dmg` file
2. Drag "PRPal" to Applications
3. Eject the disk image
4. Launch from Applications or Spotlight

**Note:** On first launch, macOS may show a security warning. Go to **System Preferences > Security & Privacy** and click "Open Anyway".

---

## Updating

### From Source

```bash
cd prpal

# Pull latest changes
git pull

# Update dependencies
npm install

# Rebuild
npm run build

# Restart the app
npm run start:electron
```

### From Distributed App

1. Download the new version
2. Quit the running app (right-click tray icon > Quit)
3. Replace the app in Applications
4. Relaunch

Your configuration is preserved in `~/.config/prpal/`.

---

## Uninstalling

### Remove the Application

```bash
# If installed from source
rm -rf ~/Workspace/prpal

# If installed from DMG
rm -rf /Applications/PRPal.app
```

### Remove Configuration

```bash
rm -rf ~/.config/prpal
```

### Remove from Login Items

If you added the app to login items:

1. Go to **System Preferences > Users & Groups**
2. Select **Login Items** tab
3. Remove "PRPal"

---

## Next Steps

- [Architecture Overview](ARCHITECTURE.md) - Understand how the app works
- [Review Agents](AGENTS.md) - Create custom AI review agents
- [Troubleshooting](TROUBLESHOOTING.md) - Solve common issues
