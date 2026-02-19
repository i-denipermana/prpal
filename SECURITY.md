# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email the maintainers directly or use GitHub's private vulnerability reporting feature
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 7 days
- **Resolution Timeline**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will coordinate with you on public disclosure timing

### Scope

The following are in scope for security reports:

- PRPal application code
- Authentication and authorization issues
- Data exposure vulnerabilities
- Remote code execution
- Cross-site scripting (XSS) in the Electron app

### Out of Scope

- Issues in third-party dependencies (report to the respective projects)
- Social engineering attacks
- Physical attacks
- Issues requiring physical access to a user's device

## Security Best Practices for Users

1. **Keep PRPal Updated**: Always use the latest version
2. **Protect Your GitHub PAT**: Never share your Personal Access Token
3. **Review AI Suggestions**: Always review AI-generated content before posting
4. **Secure Your Machine**: Use standard macOS security practices

## Security Features

PRPal implements the following security measures:

- **Context Isolation**: Renderer processes are isolated from Node.js
- **No Remote Content**: The app doesn't load remote web content
- **Secure IPC**: All inter-process communication uses secure channels
- **Token Storage**: GitHub PAT is stored in the user's config directory with appropriate permissions

## Acknowledgments

We appreciate the security research community's efforts in helping keep PRPal secure. Contributors who report valid security issues will be acknowledged here (with permission).
