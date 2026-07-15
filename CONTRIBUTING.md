# Contributing to ticktick-cli

Thank you for your interest in contributing to ticktick-cli! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (primary runtime and package manager)
- Node.js 20+ (for npm publishing compatibility)
- A TickTick account for testing

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ticktick-cli.git
   cd ticktick-cli
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Run tests to verify setup:
   ```bash
   bun test
   ```

### Authentication for Testing

To test against the live TickTick API:

```bash
bun run dev auth login
```

This will guide you through OAuth authentication and store credentials locally.

## Development Workflow

### Running Locally

```bash
# Run CLI in development mode
bun run dev <command>

# Examples
bun run dev task list
bun run dev project list
bun run dev sync
```

### Building

```bash
# TypeScript compilation
bun run build

# Build the JavaScript package output
bun run build
```

### Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage

# Run a specific test file
bun --raw-test src/commands/task.test.ts
```

### Type Checking

```bash
bun run typecheck
```

## Project Structure

```
src/
├── api/          # TickTick API client and request handling
├── commands/     # CLI command implementations
├── config/       # Configuration and credential management
├── output/       # Output formatters (table, JSON, plain)
├── schemas/      # Zod schemas for API data validation
├── utils/        # Shared utilities
└── index.ts      # CLI entry point
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-recurring-tasks`
- `fix/date-parsing-issue`
- `docs/update-readme`

### Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- Keep the first line under 72 characters
- Reference issues when applicable ("Fix #123")

### Code Style

- TypeScript strict mode is enabled
- Use Zod schemas for all API data validation
- Prefer functional patterns where appropriate
- Add JSDoc comments for public APIs

### Adding New Commands

1. Create command file in `src/commands/`
2. Register in `src/index.ts`
3. Add tests in `src/commands/<command>.test.ts`
4. Update README.md if adding user-facing features

### Adding New API Endpoints

1. Add Zod schema in `src/schemas/`
2. Add API method in `src/api/`
3. Add tests for the new functionality

## Pull Request Process

1. Create a new branch from `main`
2. Make your changes
3. Ensure all tests pass: `bun run test`
4. Ensure type checking passes: `bun run typecheck`
5. Update documentation if needed
6. Submit a pull request

### PR Guidelines

- Keep PRs focused on a single change
- Include a clear description of what and why
- Link to related issues
- Add tests for new functionality
- Update documentation as needed

## Reporting Issues

### Bug Reports

Include:
- ticktick-cli version (`tt --version`)
- Operating system and version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

### Feature Requests

Include:
- Clear description of the feature
- Use case / why it would be useful
- Examples of how it would work

## Questions?

Feel free to open an issue for questions or discussions about the project.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
