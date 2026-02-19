# Changelog

All notable changes to PRPal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub workflows for CI/CD (build, release)
- CodeQL security scanning
- Dependabot for automated dependency updates
- Issue and PR templates
- Comprehensive unit test suite

### Fixed

- Quit button now works correctly in menubar window

## [1.0.1] - 2024

### Added

- Application switcher (Cmd+Tab) support when PR detail windows are open
- Settings window with dock visibility

### Changed

- Improved menubar window behavior

### Fixed

- Various bug fixes and stability improvements

## [1.0.0] - 2024

### Added

- Initial release of PRPal
- macOS menu bar integration with badge notifications
- GitHub organization PR monitoring
- Team-based PR detection
- AI-powered code reviews using OpenCode CLI
- Support for multiple Claude AI models
- Custom review agents system
- Skills system for focused reviews
- Review preview and editing before posting
- Inline comments on specific lines
- Desktop notifications for new review requests
- Settings UI for configuration
- Onboarding wizard for first-time setup

### Technical

- Electron-based desktop application
- Fastify server for local API
- TypeScript codebase
- Vitest for unit testing

[Unreleased]: https://github.com/ArekSredzki/prpal/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/ArekSredzki/prpal/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ArekSredzki/prpal/releases/tag/v1.0.0

<!-- 
Note: Update these URLs when the repository is moved to its final location.
Replace 'ArekSredzki/prpal' with your actual repository path.
-->
