# Releasing

Releases are cut by hand from a clean `main` with
[release-it](https://github.com/release-it/release-it), wrapped by
`scripts/release.mjs`. One command bumps the version, moves the changelog's
Unreleased section into the new version, commits, tags `vX.Y.Z`, pushes, creates
the GitHub Release, and then publishes `@crcatala/ticktick-cli` to npm from the
tagged commit.

The package is public and installs the `tt` and `ttcli` commands.

## Prerequisites

- Push access to `main`, and a GitHub token for the release (`GITHUB_TOKEN`
  with repository **Contents: read and write**, or release-it opens the GitHub
  release form in the browser instead).
- An npm login with publish rights to the `@crcatala` scope: `npm whoami`,
  else `npm login`.
- Node.js `^22.21.0 || >=24.0.0` (release-it v21 requirement) and Bun.
- A clean checkout on `main`.

## Before releasing

1. Start from an up-to-date `main`:

   ```bash
   git checkout main
   git pull --ff-only
   ```

2. Draft the changelog:

   ```bash
   bun run release:prep
   ```

   Paste the output into an LLM, review the result, and put it under
   `## [Unreleased]` in `CHANGELOG.md` (Added, Changed, Fixed, Removed,
   Security; user-facing changes only). Commit it to `main` and push.

3. Run the full local verification suite, which is also what the release
   preflight runs:

   ```bash
   bun run verify
   ```

   This runs the tests, linting, type checking, the JavaScript build (stamped
   with the commit by `scripts/build-info.mjs`), and an install smoke test of
   the exact `npm pack` tarball (`tt` and `ttcli` must answer `--help` and print
   the standard `--version` line).

## Release

```bash
bun run release:dry       # preview; changes nothing and skips the hooks
bun run release           # asks for the version; or: bun run release -- patch|minor|major
```

`release:dry` runs the same preflight as `release`, so it also needs an npm
login (`npm whoami`). To preview the release-it steps without one, run
release-it directly:

```bash
npx release-it --dry-run --ci --no-npm --no-github
```

In order, `bun run release`:

1. refuses to start when not logged in to npm or when `HEAD` is already a release;
2. checks that Unreleased has entries and runs `bun run verify`;
3. bumps the version and the changelog, then runs `bun run test:package` (packs
   the tarball, installs it, checks `--help` and `--version` for every command);
4. commits `chore: release vX.Y.Z`, tags `vX.Y.Z`, pushes both;
5. creates the GitHub Release;
6. publishes to npm from the tagged commit (npm may ask for a one-time password).

A prerelease is published under a dist-tag named after its identifier, so
`latest` keeps pointing at the last full release:

```bash
bun run release -- --preRelease=beta                  # 1.3.0-beta.0, published as @crcatala/ticktick-cli@beta
bun run release -- --preRelease=beta --npm.tag=next   # same version, under "next"
```

## When a step fails

- **Before the commit** (steps 1–3): nothing was changed on the remote. Fix the
  cause and run `bun run release` again; `git checkout -- .` discards a
  half-made bump.
- **GitHub Release** (step 5): the tag is pushed. Create the release from the
  tag with that version's CHANGELOG section as notes
  (`gh release create vX.Y.Z --title vX.Y.Z --notes-file <section>`), then run
  `bun run release:publish`.
- **npm publish** (step 6): the tag is pushed; only the publish is left. Run
  `bun run release:publish` from the tagged commit (it picks the prerelease
  dist-tag again; `bun run release:publish -- --tag <tag>` chooses another).

Published npm versions are immutable. If a release has a defect, publish a
corrective version rather than replacing the existing one.

## Verify

```bash
npm view @crcatala/ticktick-cli version
npx @crcatala/ticktick-cli@latest --version     # tt X.Y.Z (sha7 YYYY-MM-DD)
npx @crcatala/ticktick-cli@latest --help
```
