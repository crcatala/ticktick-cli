# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Package is prepared for npm publication as `@crcatala/ticktick-cli`, with `tt` and `ttcli` command aliases.

## [0.1.0] - 2024-12-17

### Added

- Initial release
- Full TickTick API v2 client with Zod schema validation
- Task management: create, list, update, complete, delete tasks
- Project management: create, list, update, delete projects
- Tag management: list, create, rename, delete tags
- Checklist support for task subtasks
- Multiple output formats: table, JSON, plain text
- OAuth2 authentication flow
- Flexible task filtering by project, tag, priority, dates
- Recurrence/repeat rule support (RRULE format)
- Reminder configuration
- Sync command for fetching latest data
