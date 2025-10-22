# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Builds both ESM and CJS outputs from TypeScript source
- `npm test` - Runs full Jest test suite (unit + integration + e2e tests)
- `npm run dev` - Runs unit tests in watch mode during development
- `npm run lint` - Runs ESLint on source files
- `npm run typecheck` - Runs TypeScript type checking without emitting files
- `npm run prepublishOnly` - Runs lint, test, and build before publishing (automatic)

### Additional Test Commands

- `jest --coverage` - Run tests with coverage report
- `jest --selectProjects unit` - Run only unit tests
- `jest --selectProjects integration` - Run only integration tests
- `jest --testNamePattern="specific test"` - Run a specific test by name

The build step is required before publishing (`npm run prepublishOnly` runs it automatically).

## Architecture Overview

This is a simplified Passport.js authentication strategy implementing passwordless "magic link" authentication using JWT tokens.

### Core Components

**MagicLinkStrategy** (`src/Strategy.ts`) - Main strategy class

- All authentication logic consolidated in a single file (~500 lines)
- Two-phase authentication: `requestToken` (generates/sends token) and `acceptToken` (verifies token)
- JWT token generation with configurable TTL (default 10 minutes, validated 1-86400 seconds)
- Token storage system to prevent reuse (default: in-memory)
- Flexible user verification callbacks (`sendToken` and `verifyUser`)
- Inline validation for configuration (secret, TTL, userFields)
- Private methods for token generation, verification, and user field extraction

**MemoryStorage** (`src/MemoryStorage.ts`) - Default token storage implementation

- Simple Map-based storage for used tokens
- Implements async interface: `set()`, `get()`, `delete()`
- Used by Strategy to track and prevent token reuse

**UsedTokens** (`src/collections/UsedTokens.ts`) - Token tracking collection

- Manages collection of used tokens with expiration timestamps
- Handles token reuse detection and expired token cleanup
- Simple wrapper around Map with millisecond timestamp storage

**lookup utility** (`src/lookup.ts`) - Object property accessor

- Handles nested property access with array notation (`user[profile][email]`)
- Used to extract user fields and tokens from request objects

### File Structure

```
src/
├── Strategy.ts              # Main strategy (all auth logic)
├── MemoryStorage.ts         # Token storage interface & implementation
├── lookup.ts                # Utility for nested property access
├── index.ts                 # Public exports
├── collections/
│   └── UsedTokens.ts       # Token reuse prevention
└── __tests__/              # Test files
    ├── integration/        # Integration tests
    ├── e2e/               # End-to-end tests
    └── support/           # Test helpers & fixtures
```

### Key Design Principles

- **Simplicity**: All logic in Strategy class - no unnecessary abstractions
- **Dual callback pattern**: Strategy takes two functions - `sendToken` (delivery mechanism) and `verifyUser` (user lookup/creation)
- **Flexible timing**: User verification can occur before token generation (`verifyUserAfterToken: false`) or after token verification (`verifyUserAfterToken: true`)
- **Token invalidation**: Uses storage layer to track used tokens and prevent replay attacks
- **Request context**: Optional `passReqToCallbacks` passes request object to callback functions
- **Inline validation**: Configuration validated directly in Strategy constructor (no separate config classes)

### Test Structure

- Integration and e2e tests for full authentication flows
- Unit tests for utilities (UsedTokens, MemoryStorage, lookup)
- Tests use Jest with `chai-passport-strategy` for strategy-specific assertions
- Coverage target: 90% for statements and lines

The transpiled code in `lib/` is the published distribution - always run `npm run build` after source changes.

## Maintenance Requirements

**CRITICAL**: If any changes are made to the project that render instructions in this CLAUDE.md file outdated, you MUST immediately update this file to reflect the current state. This includes but is not limited to:

- Changes to build commands, scripts, or development workflow
- Architecture modifications or new components
- Updated dependencies or framework changes
- New testing approaches or tooling
- Modified file structure or naming conventions

Keep this documentation synchronized with the actual codebase at all times.

## Package installation and documentation

You MUST ALWAYS use the Context7 MCP to find the most up-to-date documentation for the libraries you want to use. You have the `resolve-library-id` and `get-library-docs` commands to use.
You MUST ALWAYS install those libraries from the command line interface, using `npm install`. NEVER infer the package version from your training data.
