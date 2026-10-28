# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `tt update` (with `--check` and `--force`) updates the CLI the way it was installed: a clone is pulled
  with `git pull --ff-only`, then `bun install` and `bun run build`; a global npm, pnpm or bun install is
  reinstalled from the registry.
- `tt version [--json]` reports the version, full commit, commit date, dirty state, install method and
  install path.
- Install documentation now covers running from source and updating.

### Changed

- `tt --version` / `tt -V` now prints `tt X.Y.Z (sha7 YYYY-MM-DD)`, with `-dirty` for builds made from a
  working tree with uncommitted changes, instead of the bare version number. The same line is printed by
  a registry install and by a local build.

## [0.1.3] - 2026-07-15

### Added

- simple version bump

## [0.1.2] - 2026-07-15

### Fixed

- Corrected `auth whoami` alias delegation so it no longer rejects arguments ([#73](https://github.com/crcatala/ticktick-cli/pull/73))

## [0.1.1] - 2026-07-15

### Added

- First-class note creation and task/note conversion commands ([#66](https://github.com/crcatala/ticktick-cli/pull/66))
- Task titles and project names as command references ([#67](https://github.com/crcatala/ticktick-cli/pull/67))
- Shell installer for binary releases ([#32](https://github.com/crcatala/ticktick-cli/pull/32))
- Contributor guide ([#35](https://github.com/crcatala/ticktick-cli/pull/35))

### Changed

- Package is prepared for npm publication as `@crcatala/ticktick-cli`, with `tt` and `ttcli` command aliases.
- Raised the Node.js requirement to 22.12+ for Commander v15 compatibility ([#64](https://github.com/crcatala/ticktick-cli/pull/64))
- CLI version now reads from `package.json` ([#35](https://github.com/crcatala/ticktick-cli/pull/35))
- Refreshed the private web API device fingerprint and added a `TICKTICK_WEB_VERSION` compatibility override ([#63](https://github.com/crcatala/ticktick-cli/pull/63))

### Fixed

- Display full IDs instead of truncated IDs in CLI output ([#40](https://github.com/crcatala/ticktick-cli/pull/40))
- Restore `project edit --no-folder` behavior after the Commander v15 upgrade ([#64](https://github.com/crcatala/ticktick-cli/pull/64))
- Make release dry runs non-mutating ([#71](https://github.com/crcatala/ticktick-cli/pull/71))

### Removed

- Unsupported `auth login --totp-secret` option; use `--totp-code` instead ([#68](https://github.com/crcatala/ticktick-cli/pull/68))

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
