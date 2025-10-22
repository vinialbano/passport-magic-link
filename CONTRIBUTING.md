# Contributing to Passport Magic Link

Thank you for considering contributing to this project!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Make your changes
5. Run the full test suite: `npm run test:all`
6. Submit a pull request

## Development Commands

- `npm test` - Run unit tests
- `npm run test:all` - Run all test types  
- `npm run lint` - Run ESLint
- `npm run build` - Build the project
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking

## Testing

We maintain high test coverage (>95%). Please ensure:

- All tests pass
- New features include tests

### Test Types

- **Unit tests**: Test individual components in isolation (includes security edge cases)
- **Integration tests**: Test component interactions with Express.js
- **Performance tests**: Basic smoke tests to catch performance regressions

## Code Style

- We use Prettier for formatting
- ESLint for code quality
- Follow existing patterns in the codebase
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address review feedback

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated (if needed)
- [ ] All CI checks pass
- [ ] Code follows style guidelines
- [ ] No breaking changes (or properly documented)

## Commit Message Convention

We follow conventional commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: improve code structure`
- `chore: update dependencies`

## Release Process

Releases are automated via GitHub Actions when tags are pushed.

## Security

For security vulnerabilities, please email the maintainer directly rather than opening a public issue.

## Questions?

Feel free to open an issue for questions or discussions.

---

Thanks for contributing! 🚀
