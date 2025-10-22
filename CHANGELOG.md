# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - Unreleased

### Breaking Changes

- **TypeScript Migration**: Package is now written in TypeScript with full type definitions
- **Node.js 18+**: Minimum Node.js version is now 18.0.0 (previously no explicit requirement)
- **ESM First**: Package now uses ES modules by default with CommonJS compatibility
- **Simplified Architecture**: Core logic consolidated into single Strategy class
- **API Changes**:
  - Constructor options now use TypeScript interfaces for validation
  - Token TTL validation enforced (1-86400 seconds)
  - Error messages and types updated for better TypeScript support

### Added

- Full TypeScript support with `.d.ts` declaration files
- Dual package support (ESM + CommonJS) via package.json `exports`
- Comprehensive test suite (unit, integration, and e2e tests)
- Modern development tooling:
  - ESLint with TypeScript support
  - Prettier for code formatting
  - Husky + lint-staged for pre-commit hooks
  - GitHub Actions CI/CD workflows
- Documentation:
  - CLAUDE.md for AI-assisted development
  - CONTRIBUTING.md with development guidelines
  - VSCode configuration for optimal development experience
- Better package optimization (73% smaller unpacked size)

### Changed

- Migrated from JavaScript to TypeScript
- Updated build process to generate both ESM and CJS outputs
- Modernized dependencies (jsonwebtoken, passport-strategy)
- Improved test coverage and organization
- Enhanced error handling and validation

### Removed

- Babel build system (replaced with TypeScript compiler)
- Travis CI (replaced with GitHub Actions)
- Legacy JavaScript source files

### Migration Guide

#### For TypeScript Users

```typescript
import { Strategy as MagicLinkStrategy } from 'passport-magic-link';

// Full type inference and autocomplete support
const strategy = new MagicLinkStrategy({
  secret: 'your-secret',
  userFields: ['email'],
  tokenField: 'token',
  ttl: 300, // TypeScript will validate this is 1-86400
}, async (user, token) => {
  // sendToken implementation
}, async (user) => {
  // verifyUser implementation
});
```

#### For JavaScript Users

```javascript
// ESM (recommended)
import { Strategy as MagicLinkStrategy } from 'passport-magic-link';

// CommonJS (still supported)
const { Strategy: MagicLinkStrategy } = require('passport-magic-link');
```

#### Node.js Version

Ensure you're running Node.js 18 or higher:

```bash
node --version  # Should be v18.0.0 or higher
```

## [2.1.1] - Previous Release

See git history for changes prior to TypeScript migration.

---

[3.0.0]: https://github.com/vinialbano/passport-magic-link/compare/v2.1.1...v3.0.0
[2.1.1]: https://github.com/vinialbano/passport-magic-link/releases/tag/v2.1.1
