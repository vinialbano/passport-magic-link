# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-04-21

### Breaking Changes

- **Node.js 22+**: Minimum Node.js version is now 22.0.0 (previously 20.0.0). Node.js 20 reaches end-of-life on April 30, 2026. CI matrix updated to Node 22.x and 24.x.
- **Subpath exports removed**: `passport-magic-link/lib/cjs` and `passport-magic-link/lib/esm` are no longer exposed. The main entry point already routes ESM and CJS consumers to the correct build via conditional exports; consumers should `import` / `require` `passport-magic-link` directly.

### Added

- **Custom token signing**: Optional `createToken` and `verifyToken` callbacks on `MagicLinkOptions` as an alternative to `secret`. Enables asymmetric signing (e.g., RS256), key rotation, KMS integration, and external token services. The `secret`-based API remains supported. Providing both `secret` and custom callbacks throws. (#48)
- **Async token handling**: `generateToken` and `verifyJwtToken` are now async internally to accommodate custom async signing functions. The strategy's public behavior is unchanged for existing users.
- **Format-specific TypeScript declarations**: The package now ships both `.d.ts` (for the ESM entry) and `.d.cts` (for the CJS entry) so consumers using `moduleResolution: node16`/`nodenext` resolve types correctly under the `require` condition.

### Changed

- **Upgraded to TypeScript 6.0**. Project compiles cleanly against the TS 6 compiler with no deprecated options.
- **Build tooling**: `tsup` now produces both ESM and CJS bundles in a single pass; `tsc --emitDeclarationOnly` emits type declarations, and `scripts/dual-dts.mjs` writes `.d.cts` siblings. Replaces the previous dual-`tsc` invocation and CJS package-type helper.
- **Test tooling**: migrated from `ts-jest` to `@swc/jest` for test transformation. Faster, and avoids the hardcoded `moduleResolution: node10` in ts-jest 29.x that conflicts with TS 6.

### Removed

- `tsconfig.cjs.json`, `scripts/create-cjs-package.cjs`, and the root `index.cjs` bridge file — no longer needed with the tsup pipeline.
- Dev dependencies `ts-jest`, `tslib`, and `rimraf` (unused after the tooling changes).

### Security

- Bumped transitive `jws` 3.2.2 → 3.2.3 (GHSA-869p-cjfg-cm3x, via `jsonwebtoken`). (#49)
- Bumped `express` 5.1.0 → 5.2.1 (CVE-2024-51999), used in tests. (#49)

### Dependencies

- `jsonwebtoken` 9.0.2 → 9.0.3
- `typescript` 5.9 → 6.0
- `eslint` 9 → 10 (+ `@eslint/js` bump, new `jiti` peer)
- `@types/node` 24 → 25
- `@types/supertest` 6 → 7
- Added: `tsup`, `@swc/jest`, `@swc/core`

### Migration Guide

#### Node.js version

```bash
node --version  # Must be v22.0.0 or higher
```

#### If you imported a specific variant

```diff
- const strategy = require('passport-magic-link/lib/cjs').Strategy
- import { Strategy } from 'passport-magic-link/lib/esm'
+ const { Strategy } = require('passport-magic-link')
+ import { Strategy } from 'passport-magic-link'
```

#### Custom token signing (new, optional)

```typescript
import { Strategy as MagicLinkStrategy } from 'passport-magic-link'

const strategy = new MagicLinkStrategy(
  {
    userFields: ['email'],
    tokenField: 'token',
    createToken: async (payload, ttlSeconds) =>
      signWithKms(payload, ttlSeconds),
    verifyToken: async token => verifyWithKms(token)
  },
  async (user, token) => { /* sendToken */ },
  async user => { /* verifyUser */ }
)
```

## [3.0.0] - 2025-10-22

### Breaking Changes

- **TypeScript Migration**: Package is now written in TypeScript with full type definitions
- **Node.js 20+**: Minimum Node.js version is now 20.0.0 (previously no explicit requirement). Node.js 20 is in Maintenance LTS until April 2026, Node.js 22 is in Active LTS until April 2027.
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
import { Strategy as MagicLinkStrategy } from 'passport-magic-link'

// Full type inference and autocomplete support
const strategy = new MagicLinkStrategy(
  {
    secret: 'your-secret',
    userFields: ['email'],
    tokenField: 'token',
    ttl: 300 // TypeScript will validate this is 1-86400
  },
  async (user, token) => {
    // sendToken implementation
  },
  async user => {
    // verifyUser implementation
  }
)
```

#### For JavaScript Users

```javascript
// ESM (recommended)
import { Strategy as MagicLinkStrategy } from 'passport-magic-link'

// CommonJS (still supported)
const { Strategy: MagicLinkStrategy } = require('passport-magic-link')
```

#### Node.js Version

Ensure you're running Node.js 20 or higher:

```bash
node --version  # Should be v20.0.0 or higher
```

**Note**: Node.js 18 reaches end-of-life on April 30, 2025. We recommend using Node.js 22 (Active LTS) or Node.js 20 (Maintenance LTS).

## [2.1.1] - Previous Release

See git history for changes prior to TypeScript migration.

---

[4.0.0]: https://github.com/vinialbano/passport-magic-link/compare/v3.0.0...v4.0.0
[3.0.0]: https://github.com/vinialbano/passport-magic-link/compare/v2.1.1...v3.0.0
[2.1.1]: https://github.com/vinialbano/passport-magic-link/releases/tag/v2.1.1
