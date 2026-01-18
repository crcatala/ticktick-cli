# Guardrails

## Project Context

- **Runtime**: Bun (not Node.js directly)
- **Build**: tsgo (TypeScript Go compiler)
- **Test**: `bun test`
- **Package manager**: bun

## CI/CD

- Use `ubicloud-standard-2` runners (not `ubuntu-latest`)
- Bun version: `latest` or pin to specific version
- Always use `--frozen-lockfile` for `bun install` in CI

## Security

- Pin all GitHub Actions to SHA commits with version comment
- Never commit secrets or tokens
- CODEOWNERS should reference @crcatala

## Code Style

- Keep workflows DRY - similar structure to existing ones
- Use descriptive job names
- Add comments for non-obvious configurations

## References

- Existing workflows in .github/workflows/
- raindrop-cli patterns in ~/workspace/raindrop-cli/.github/
