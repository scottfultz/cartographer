# Contributing to Cartographer Engine

Thank you for your interest in contributing to Cartographer Engine! This guide will help you get started.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.0.0
- **Git** for version control
- **TypeScript** knowledge (ES2022 modules)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/scottfultz/cartographer.git
   cd cartographer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

---

## 🔄 Development Workflow

### Branch Strategy

- **`main`** - Production-ready code, tagged releases
- **`develop`** - Integration branch for features
- **`feature/*`** - Individual feature branches
- **`bugfix/*`** - Bug fix branches
- **`hotfix/*`** - Urgent production fixes

### Workflow Steps

1. **Create a feature branch from `develop`:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes:**
   - Write clean, idiomatic TypeScript
   - Follow existing code patterns
   - Add comprehensive JSDoc comments
   - Update types in `src/core/types.ts` if needed

3. **Add tests:**
   - Create or update test files in `test/`
   - Aim for 100% coverage of new code
   - Test edge cases and error conditions
   - Use descriptive test names

4. **Run tests and linting:**
   ```bash
   npm test        # Run all tests
   npm run lint    # Check code quality
   npm run build   # Verify TypeScript compilation
   ```

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```
   
   Use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test additions or changes
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvements
   - `ci:` - CI/CD changes
   - `chore:` - Maintenance tasks

6. **Push to GitHub:**
   ```bash
   git push origin feature/my-new-feature
   ```

7. **Open a Pull Request:**
   - Target the `develop` branch
   - Fill out the PR template completely
   - Link any related issues
   - Add appropriate labels (see `.github/labels.yml`)

8. **Code Review:**
   - CI/CD will run tests on Node 20 & 22
   - Address review feedback
   - Update tests if needed
   - Ensure all checks pass

9. **Merge:**
   - Squash and merge when approved
   - Delete feature branch after merge

---

## 📋 Code Standards

### TypeScript

- **Strict Mode** - All code uses TypeScript strict mode
- **ES2022 Modules** - Use `import`/`export` syntax
- **Type Safety** - No `any` types without justification
- **Async/Await** - Prefer async/await over raw Promises
- **Error Handling** - Always handle errors explicitly

### File Structure

```
src/
├── cli/                    # CLI commands and entrypoints
│   ├── commands/          # Individual command implementations
│   └── index.ts           # Main CLI entry
├── core/                   # Core crawling engine
│   ├── types.ts           # Shared TypeScript types
│   ├── config.ts          # Configuration builder
│   ├── scheduler.ts       # BFS queue and depth tracking
│   ├── renderer.ts        # Playwright browser automation
│   └── extractors.ts      # DOM parsing and extraction
├── io/                     # Input/output operations
│   ├── atlas/             # Atlas archive writer
│   ├── export/            # CSV export
│   └── readers/           # Archive readers
└── utils/                  # Utility functions

test/                       # Test files (mirrors src/ structure)
packages/                   # Sub-packages (e.g., atlas-sdk)
docs/                       # Additional documentation
```

### Code Style

- **Indentation:** 2 spaces (no tabs)
- **Line Length:** 100 characters max
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants
  - Descriptive names (avoid abbreviations)

### Comments and Documentation

- **JSDoc Comments** for all exported functions/classes:
  ```typescript
  /**
   * Crawls a website and produces an Atlas archive.
   * @param config - Crawl configuration
   * @returns Promise resolving to crawl summary
   */
  export async function startJob(config: EngineConfig): Promise<CrawlSummary> {
    // ...
  }
  ```

- **Inline Comments** for complex logic:
  ```typescript
  // Check if maxDepth is exceeded (unlimited if -1)
  if (config.maxDepth >= 0 && depth > config.maxDepth) {
    return;
  }
  ```

---

## 🧪 Testing Guidelines

### Test Structure

- **Location:** Tests live in `test/` directory
- **Naming:** `*.test.ts` for test files
- **Framework:** Node.js built-in test runner

### Test Patterns

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  describe('Specific behavior', () => {
    it('should do something specific', () => {
      const result = myFunction();
      assert.strictEqual(result, expected);
    });

    it('should handle edge case', () => {
      assert.throws(() => myFunction(invalid), /error message/);
    });
  });
});
```

### Test Coverage

- **Unit Tests** - Test individual functions and classes
- **Integration Tests** - Test component interactions
- **Edge Cases** - Test boundary conditions, errors, invalid input
- **Smoke Tests** - End-to-end CLI validation (see `test/smoke/`)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/maxDepth.test.ts

# Run tests in watch mode (dev)
npm run dev -- test/maxDepth.test.ts

# Run with increased timeout
npm test -- --test-timeout=30000
```

---

## 🐛 Debugging

### Development Mode

Run CLI commands without building:

```bash
npm run dev -- crawl --seeds https://example.com --out test.atls
```

### Structured Logs

Enable debug logging:

```bash
node dist/src/cli/index.js crawl \
  --seeds https://example.com \
  --logLevel debug \
  --logFile ./logs/debug.jsonl
```

Parse logs with `jq`:

```bash
cat logs/debug.jsonl | jq 'select(.event == "crawl.error")'
```

### Browser Debugging

Enable headful mode (modify `src/core/renderer.ts`):

```typescript
const browser = await playwright.chromium.launch({
  headless: false,  // Show browser
  devtools: true,   // Open DevTools
});
```

---

## 📚 Documentation

### Update Documentation

When adding features, update:

1. **README.md** - Usage examples and CLI reference
2. **CODEBASE_DOCUMENTATION.md** - Architecture details
3. **CHANGELOG.md** - Version history
4. **JSDoc Comments** - In-code documentation

### Documentation Standards

- **Clear Examples** - Show real-world usage
- **Complete Options** - Document all parameters
- **Error Handling** - Explain error codes and messages
- **Performance Notes** - Include benchmarks where relevant

---

## 🔍 Code Review Checklist

Before submitting a PR, verify:

- ✅ All tests pass (`npm test`)
- ✅ Linting passes (`npm run lint`)
- ✅ TypeScript compiles (`npm run build`)
- ✅ New features have tests
- ✅ Documentation updated
- ✅ Commit messages follow Conventional Commits
- ✅ No console.log or debug code
- ✅ Types are strict (no `any` without justification)
- ✅ Error handling is comprehensive
- ✅ Code follows existing patterns

---

## 🏷️ GitHub Labels

Use labels to categorize issues and PRs:

**Type:**
- `type: bug` - Something isn't working
- `type: feature` - New feature or enhancement
- `type: documentation` - Documentation improvements
- `type: testing` - Test suite additions

**Priority:**
- `priority: critical` - Immediate attention required
- `priority: high` - High priority
- `priority: medium` - Medium priority
- `priority: low` - Low priority

**Status:**
- `status: in-progress` - Currently being worked on
- `status: needs-review` - Ready for code review
- `status: blocked` - Blocked by dependency

**Component:**
- `component: crawler` - Core crawling engine
- `component: renderer` - Browser automation
- `component: atlas` - Archive format
- `component: cli` - Command-line interface

See `.github/labels.yml` for complete list.

---

## 📊 Performance Guidelines

### Optimization Principles

1. **Minimize Browser Context Creation** - Reuse contexts when possible
2. **Batch Writes** - Write records in batches to reduce I/O
3. **Memory Management** - Monitor heap usage and implement backpressure
4. **Concurrency Control** - Balance parallelism with resource limits
5. **Compression** - Use Zstandard for optimal compression ratio

### Profiling

```bash
# Profile with Node.js inspector
node --inspect dist/src/cli/index.js crawl --seeds https://example.com

# Profile memory usage
node --max-old-space-size=4096 dist/src/cli/index.js crawl
```

---

## 🚦 CI/CD

### GitHub Actions

The CI/CD pipeline runs on every push/PR to `main` and `develop`:

1. **Build** - TypeScript compilation
2. **Test** - All test suites on Node 20 & 22
3. **Lint** - Code quality checks
4. **Validate** - Archive integrity verification

See `.github/workflows/ci.yml` for details.

### Local CI Simulation

Run the same checks locally:

```bash
npm run clean
npm run build
npm test
npm run lint
```

---

## 📞 Getting Help

### Internal Communication

- **Issues** - Create GitHub issues for bugs and features
- **Discussions** - Use GitHub Discussions for questions
- **Code Review** - Comment on PRs for feedback

### Documentation References

- [README.md](README.md) - Usage guide
- [CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md) - Architecture
- [TEST_SUITE_DOCUMENTATION.md](docs/TEST_SUITE_DOCUMENTATION.md) - Testing
- [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) - Current limitations

---

## 📄 License

Copyright © 2025 Cai Frazier. All rights reserved.  
Proprietary and confidential. Internal contributions only.

---

**Thank you for contributing to Cartographer Engine!** 🚀
