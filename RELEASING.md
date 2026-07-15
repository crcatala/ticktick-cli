# Releasing

This project uses [release-it](https://github.com/release-it/release-it) for manual releases from a maintainer machine. A release builds and validates the npm package, updates the changelog and version, publishes to npm, pushes a signed-off release commit and tag, and creates a GitHub Release.

## Prerequisites

- Push access to `crcatala/ticktick-cli`
- An npm account with publish access to the `@crcatala` scope (`npm whoami`)
- A GitHub token available as `GITHUB_TOKEN` with repository **Contents: read and write** permission, so release-it can create the GitHub Release
- Node.js 22.13+ (release-it v20 requirement) and Bun
- A clean checkout on `main`

The package is public and is published as `@crcatala/ticktick-cli`. It installs the `tt` and `ttcli` commands.

## Before releasing

1. Pull the current main branch:

   ```bash
   git checkout main
   git pull --ff-only
   ```

2. Prepare and update the changelog. The helper lists changes since the last tag:

   ```bash
   bun run release:prep
   ```

   Add user-facing entries beneath `## [Unreleased]` in `CHANGELOG.md`, using [Keep a Changelog](https://keepachangelog.com/) sections such as Added, Changed, Fixed, Removed, or Security.

3. Run the complete local verification suite:

   ```bash
   bun run verify
   ```

   This runs tests, linting, type checking, the JavaScript build, and an install smoke test of the exact `npm pack` tarball.

## Release

Preview the local release steps first:

```bash
bun run release:dry
```

`release:dry` deliberately disables the npm and GitHub integrations, so it cannot publish or open GitHub's release form. Run `release` for the full process.

Then release interactively:

```bash
export GITHUB_TOKEN=github_pat_... # if not already configured
bun run release
```

Release-it prompts for the version bump and then:

1. validates the clean `main` checkout and runs `bun run verify`;
2. bumps `package.json` and moves the changelog's Unreleased entries into the new version;
3. builds `dist/`;
4. commits and tags `vX.Y.Z`;
5. publishes `@crcatala/ticktick-cli` publicly to npm;
6. pushes the commit and tag; and
7. creates a GitHub Release using the changelog notes.

Useful recovery options:

```bash
# Skip npm publishing if it already succeeded in a partial release
bun run release -- --no-npm

# Skip GitHub Release creation
bun run release -- --no-github

# Release a specific version without the bump prompt
bun run release -- 0.1.1

# Publish a prerelease
bun run release -- --preRelease=alpha
```

## Verify the release

```bash
npm view @crcatala/ticktick-cli
npx @crcatala/ticktick-cli@latest --version
npx @crcatala/ticktick-cli@latest --help
```

Published npm versions are immutable. If a release has a defect, publish a corrective version rather than replacing the existing one.
