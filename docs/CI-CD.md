# CI/CD Pipeline Documentation

## What is Continuous Integration (CI)?

**Continuous Integration** means automatically testing your code every time you make a change. Instead of discovering bugs weeks later, you find them immediately.

### Why You Need It

Without CI:
- ❌ Broken code piles up
- ❌ You forget what you changed
- ❌ Bugs hide for weeks
- ❌ Fixing becomes expensive

With CI:
- ✅ Bugs caught immediately
- ✅ Code always works
- ✅ Confidence in changes
- ✅ Fast feedback loop

## Our CI/CD Pipeline

### What Runs Automatically

Every time you push code or create a PR, these checks run:

#### 1. **Quick Checks** (runs first, ~2 minutes)
- TypeScript type checking
- ESLint linting
- Detects which files changed

#### 2. **Quality Gates** (prevents bad code, ~1 minute)
- Detects new TODO/FIXME/STUB comments
- Catches "not implemented" placeholders
- Finds "In a real implementation" comments
- Blocks empty functions
- **Prevents coding agents from merging incomplete code**

#### 3. **Test Suite** (~5 minutes)
- Runs all unit tests
- Generates coverage report
- Ensures nothing broke

#### 4. **Build Verification** (~3 minutes)
- Compiles TypeScript
- Verifies package can be built
- Checks output files exist

### What Happens If Checks Fail

- ❌ **PR cannot be merged**
- 🔴 **Red X appears on GitHub**
- 📧 **You get notified**
- 🛠️ **You must fix before merging**

This is **good** - it prevents broken code from entering the codebase.

## Running Checks Locally

### Before You Push

Run this to catch issues before they reach CI:

```bash
./scripts/pre-push-check.sh
```

This runs the same checks as CI, but on your machine. **Much faster feedback.**

### Individual Checks

```bash
# Type checking only
npm run verify:types

# Linting only
npm run lint

# Tests only
npm test

# Everything (same as CI)
npm run quality:gate
```

## Common Issues and Fixes

### ❌ "TypeScript compilation failed"

**Problem:** Type errors in your code

**Fix:**
```bash
npm run verify:types
# Read the errors, fix them
```

### ❌ "ESLint errors found"

**Problem:** Code style issues

**Fix:**
```bash
npm run lint:fix  # Auto-fixes most issues
npm run lint      # Check remaining issues
```

### ❌ "Quality gate failed: Found new placeholder"

**Problem:** You added TODO/STUB/placeholder code

**Fix:**
1. Complete the implementation, OR
2. If you must add a TODO:
   - Add a comment explaining why
   - Create a GitHub issue to track it
   - Reference the issue in the TODO

**Example:**
```typescript
// TODO(#123): Implement OAuth2 token refresh
// Blocked on: Need to decide on token storage strategy
// Tracking issue: https://github.com/waldzellai/adk-typescript/issues/123
```

### ❌ "Tests failed"

**Problem:** Your changes broke existing tests

**Fix:**
```bash
npm test
# Read the test failures
# Fix your code or update the tests
```

## Understanding Test Results

### Test Output

```
PASS  tests/tools/function_tool.test.ts
PASS  tests/agents/base_agent.test.ts
FAIL  tests/models/openai_llm.test.ts
  ● OpenAI LLM › should handle streaming

    Expected: "Hello"
    Received: undefined
```

This tells you:
- ✅ Which tests passed
- ❌ Which test failed
- 📍 Exact line that failed
- 🔍 What was expected vs. what happened

## Optimizing CI (Future)

### Current State
- Runs **all tests** on every change
- Takes ~5 minutes

### Future Optimization
- Run only **affected tests** (tests related to changed files)
- Takes ~1-2 minutes
- Full test suite still runs on `main` branch

The foundation is already in place (`scripts/run-affected-tests.sh`).

## Git Hooks (Optional)

Want to run checks automatically before every commit?

```bash
# Install pre-push hook
cp scripts/pre-push-check.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

Now checks run automatically when you `git push`. You can skip with:
```bash
git push --no-verify  # Use sparingly!
```

## CI/CD Best Practices

### ✅ DO

- Run checks locally before pushing
- Fix issues immediately (while fresh in your mind)
- Keep commits small and focused
- Write tests for new features
- Update tests when changing behavior

### ❌ DON'T

- Push without running tests
- Ignore CI failures ("I'll fix it later")
- Disable checks to "just get it merged"
- Add TODOs without tracking issues
- Commit placeholder/stub code

## Troubleshooting

### "CI is taking too long"

- Run checks locally first (`./scripts/pre-push-check.sh`)
- Fix issues before pushing
- CI will pass faster if code is already clean

### "CI passed but code is broken"

- Tests might not cover the broken case
- Add a test that reproduces the bug
- Fix the bug
- Test will prevent regression

### "I need to merge urgently"

**Don't skip CI.** If it's truly urgent:
1. Fix the CI failures (usually faster than you think)
2. If absolutely necessary, get approval from a maintainer
3. Create an issue to track the technical debt

## Questions?

- Check existing CI runs: https://github.com/waldzellai/adk-typescript/actions
- Read the workflow file: `.github/workflows/ci.yml`
- Ask in issues or discussions

## Summary

**CI/CD prevents the exact problem you experienced:**
- Coding agents can't merge broken code
- Placeholder code gets caught
- Tests must pass
- Types must be correct

**This saves you hundreds of hours of debugging later.**

