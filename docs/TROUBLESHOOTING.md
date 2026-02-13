# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with PRPal.

## Table of Contents

- [Startup Issues](#startup-issues)
- [Configuration Issues](#configuration-issues)
- [GitHub API Issues](#github-api-issues)
- [OpenCode Issues](#opencode-issues)
- [Review Issues](#review-issues)
- [Notification Issues](#notification-issues)
- [UI Issues](#ui-issues)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

---

## Startup Issues

### App doesn't start

**Symptoms:** Nothing happens when running the app, or it crashes immediately.

**Solutions:**

1. **Check Node.js version:**

```bash
node --version
# Must be v20.0.0 or higher
```

2. **Rebuild dependencies:**

```bash
rm -rf node_modules
npm install
npm run rebuild
```

3. **Check for port conflicts:**

```bash
lsof -i :3847
# Kill any process using the port, or change SERVER_PORT in config
```

4. **Run with verbose logging:**

```bash
LOG_LEVEL=debug npm run start:electron 2>&1 | tee debug.log
```

### "No valid configuration" error

**Symptoms:** Error message about missing or invalid configuration.

**Solutions:**

1. **Check config file exists:**

```bash
cat ~/.config/prpal/settings.json
```

2. **Validate JSON syntax:**

```bash
cat ~/.config/prpal/settings.json | jq .
```

3. **Re-run onboarding:**
   - Right-click tray icon > "Re-run Setup"
   - Or delete config and restart:
   ```bash
   rm ~/.config/prpal/settings.json
   npm run start:electron
   ```

### App shows in Dock but no tray icon

**Symptoms:** The app appears in the Dock but no tray icon is visible.

**Solutions:**

1. **Check system tray visibility:**
   - The tray might be hidden by other icons
   - Try expanding the menu bar icon area

2. **Restart the app:**

```bash
# Force quit and restart
pkill -f "PRPal"
npm run start:electron
```

3. **Check for multiple instances:**

```bash
ps aux | grep -i prpal
# Kill duplicate processes
```

---

## Configuration Issues

### Environment variables not loading

**Symptoms:** App doesn't recognize values from `.env` file.

**Solutions:**

1. **Check file location:**
   - `.env` must be in the project root directory
   - Not inside `src/` or other subdirectories

2. **Check file format:**

```bash
# Correct format (no spaces around =)
GITHUB_PAT=ghp_xxxxx
GITHUB_USERNAME=myuser

# Incorrect
GITHUB_PAT = ghp_xxxxx  # Wrong: spaces
```

3. **JSON config takes precedence:**
   - If `~/.config/prpal/settings.json` exists, it overrides env vars

### Invalid PAT error

**Symptoms:** "GitHub API forbidden" or "401 Unauthorized" errors.

**Solutions:**

1. **Verify token scopes:**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Your token must have `repo` and `read:org` scopes

2. **Check token expiration:**
   - Tokens can expire; generate a new one if needed

3. **Test token manually:**

```bash
curl -H "Authorization: token ghp_YOUR_TOKEN" https://api.github.com/user
# Should return your user info
```

4. **Regenerate token:**
   - If issues persist, create a new token with correct scopes

---

## GitHub API Issues

### No PRs appearing

**Symptoms:** The PR list is empty even though you have pending reviews.

**Solutions:**

1. **Verify you're a requested reviewer:**
   - On GitHub, check the PR shows "Review requested" for you
   - Team-based requests require correct team membership detection

2. **Check organization setting:**

```bash
# In config, verify org is correct
cat ~/.config/prpal/settings.json | jq '.github.org'
```

3. **Check polling status:**

```bash
curl http://localhost:3847/api/status | jq
# Verify polling.active is true
```

4. **Force a refresh:**

```bash
# Wait for next poll or restart the app
curl http://localhost:3847/api/status
```

5. **Check your team memberships:**

```bash
# The app logs detected teams on startup
LOG_LEVEL=debug npm run start:electron 2>&1 | grep -i team
```

### Rate limit exceeded

**Symptoms:** "403 Forbidden" errors with "rate limit exceeded" message.

**Solutions:**

1. **Wait for reset:**
   - GitHub rate limits reset hourly
   - Check reset time:

   ```bash
   curl -I -H "Authorization: token $GITHUB_PAT" https://api.github.com/rate_limit
   ```

2. **Reduce polling frequency:**

```json
{
  "polling": {
    "intervalMs": 600000 // 10 minutes instead of 5
  }
}
```

3. **Check for runaway requests:**
   - Review logs for excessive API calls

### "Cannot read organization" error

**Symptoms:** Error detecting teams or fetching organization repositories.

**Solutions:**

1. **Verify organization membership:**
   - Ensure you're a member of the configured organization

2. **Check token scopes:**
   - `read:org` scope is required for team detection

3. **Check organization visibility:**
   - Private organizations require proper membership

---

## OpenCode Issues

### "OpenCode not installed" error

**Symptoms:** Error about OpenCode CLI not being found.

**Solutions:**

1. **Verify installation:**

```bash
which opencode
opencode --version
```

2. **Install OpenCode:**
   - Follow instructions at https://opencode.ai

3. **Specify custom path:**

```json
{
  "opencode": {
    "path": "/path/to/opencode"
  }
}
```

4. **Check PATH:**

```bash
# Add to your shell profile if needed
export PATH="$PATH:/path/to/opencode/directory"
```

### Review timeout

**Symptoms:** Reviews fail with "timeout" error.

**Solutions:**

1. **Increase timeout:**

```json
{
  "opencode": {
    "timeoutMs": 180000 // 3 minutes
  }
}
```

2. **Check PR size:**
   - Very large PRs take longer to review
   - Consider reviewing large PRs in parts

3. **Verify OpenCode is working:**

```bash
echo "Hello" | opencode chat --format json
```

### "Failed to parse review output"

**Symptoms:** Review completes but output can't be parsed.

**Solutions:**

1. **Check OpenCode response format:**
   - The app expects JSON output
   - OpenCode must be configured for JSON responses

2. **View raw response:**

```bash
# Check logs for raw AI response
LOG_LEVEL=debug npm run start:electron
```

3. **Try a different model:**

```json
{
  "opencode": {
    "model": "anthropic/claude-sonnet-4-20250514"
  }
}
```

---

## Review Issues

### Inline comments not appearing

**Symptoms:** Posted review doesn't have inline comments on files.

**Solutions:**

1. **Verify comments were selected:**
   - In the review preview, ensure checkboxes are checked

2. **Check line mapping:**
   - AI-suggested lines might not exist in the diff
   - These appear as "invalid" comments and are added to the body

3. **GitHub API limitations:**
   - Comments can only be placed on lines in the diff
   - Lines outside the diff context cannot have inline comments

### Review posts to wrong PR

**Symptoms:** Review appears on a different PR than expected.

**Solutions:**

1. **Verify PR selection:**
   - Ensure you're viewing the correct PR detail window

2. **Check for stale state:**
   - Close and reopen the PR detail window
   - The app might have cached old PR data

### "Review already in progress" error

**Symptoms:** Can't start a new review because one is already running.

**Solutions:**

1. **Wait for completion:**
   - The current review should complete or timeout

2. **Cancel the review:**

```bash
curl -X POST http://localhost:3847/api/review/PR_ID/cancel
```

3. **Restart the app:**
   - This clears in-progress review state

---

## Notification Issues

### No notifications appearing

**Symptoms:** Desktop notifications don't show for new PRs.

**Solutions:**

1. **Check macOS notification settings:**
   - System Preferences > Notifications
   - Find "PRPal" and enable alerts

2. **Verify notifications are enabled:**

```json
{
  "notification": {
    "enabled": true,
    "sound": true
  }
}
```

3. **Check Focus/Do Not Disturb:**
   - Notifications are suppressed in Focus mode

4. **Test notifications:**

```bash
# Use terminal-notifier or similar to test
osascript -e 'display notification "Test" with title "Test"'
```

### Duplicate notifications

**Symptoms:** Multiple notifications for the same PR.

**Solutions:**

1. **Check for multiple app instances:**

```bash
ps aux | grep -i prpal
```

2. **Restart the app:**
   - State might be inconsistent

---

## UI Issues

### Menu bar dropdown is blank

**Symptoms:** Clicking the tray icon shows an empty window.

**Solutions:**

1. **Check server is running:**

```bash
curl http://localhost:3847/health
```

2. **Clear Electron cache:**

```bash
rm -rf ~/Library/Application\ Support/prpal/
npm run start:electron
```

3. **Rebuild the app:**

```bash
npm run rebuild
npm run start:electron
```

### PR detail window shows error

**Symptoms:** Opening a PR shows an error instead of details.

**Solutions:**

1. **Check PR still exists:**
   - The PR might have been closed or merged

2. **Refresh the PR list:**
   - Wait for next poll or restart app

3. **Check console for errors:**
   - Open DevTools in the PR window (if available)

### Styles not loading

**Symptoms:** UI appears unstyled or broken.

**Solutions:**

1. **Rebuild assets:**

```bash
npm run rebuild
```

2. **Check file paths:**
   - Verify `dist/renderer/` contains HTML/CSS files

---

## Performance Issues

### High CPU usage

**Symptoms:** App uses excessive CPU even when idle.

**Solutions:**

1. **Increase poll interval:**

```json
{
  "polling": {
    "intervalMs": 600000 // 10 minutes
  }
}
```

2. **Check for stuck processes:**

```bash
ps aux | grep opencode
# Kill any orphaned OpenCode processes
```

3. **Reduce number of tracked repos:**
   - Consider using a more specific organization

### High memory usage

**Symptoms:** App consumes excessive memory over time.

**Solutions:**

1. **Restart periodically:**
   - In-memory state can grow over time

2. **Dismiss old PRs:**
   - Dismissed PRs are removed from memory

3. **Report if persistent:**
   - Memory leaks should be reported as bugs

### Slow API responses

**Symptoms:** PR list and details load slowly.

**Solutions:**

1. **Check network:**

```bash
ping api.github.com
```

2. **Check GitHub status:**
   - Visit https://www.githubstatus.com/

3. **Check rate limits:**

```bash
curl -H "Authorization: token $GITHUB_PAT" https://api.github.com/rate_limit
```

---

## Getting Help

### Collecting Debug Information

When reporting issues, include:

1. **App version:**

```bash
cat package.json | jq '.version'
```

2. **System info:**

```bash
sw_vers  # macOS version
node --version
npm --version
```

3. **Debug logs:**

```bash
LOG_LEVEL=debug npm run start:electron 2>&1 | tee debug.log
# Attach debug.log to your report
```

4. **Configuration (redacted):**

```bash
cat ~/.config/prpal/settings.json | \
  jq 'del(.github.pat)'  # Remove token before sharing
```

### Reporting Bugs

When filing a bug report, include:

1. **What you expected** to happen
2. **What actually happened**
3. **Steps to reproduce** the issue
4. **Debug logs** from above
5. **Screenshots** if relevant

### Common Log Messages

| Message                      | Meaning                                  |
| ---------------------------- | ---------------------------------------- |
| `Starting PRPal...`          | App is initializing                      |
| `Detected X teams for user`  | Successfully fetched team memberships    |
| `Server listening on...`     | API server started                       |
| `Polling started`            | PR monitoring is active                  |
| `Found X PRs needing review` | PRs detected for your review             |
| `OpenCode not installed`     | OpenCode CLI not found                   |
| `GitHub API error: 401`      | Invalid or expired token                 |
| `GitHub API error: 403`      | Rate limited or insufficient permissions |
| `Review timeout`             | OpenCode took too long                   |
