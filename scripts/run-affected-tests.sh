#!/bin/bash
# Script to run tests only for files that have changed
# This is a foundation for optimizing CI - currently runs all tests
# Future: Will map changed files to their test files and run only those

set -e

echo "🧪 Running affected tests..."

# Get the base branch to compare against
if [ -n "$GITHUB_BASE_REF" ]; then
  # Running in CI (PR)
  BASE_REF="origin/$GITHUB_BASE_REF"
  git fetch origin "$GITHUB_BASE_REF"
elif [ -n "$1" ]; then
  # Base ref provided as argument
  BASE_REF="$1"
else
  # Default to comparing against main
  BASE_REF="origin/main"
fi

echo "📊 Comparing against: $BASE_REF"

# Get list of changed TypeScript files
CHANGED_FILES=$(git diff --name-only "$BASE_REF"...HEAD | grep -E '\.(ts|tsx)$' || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "ℹ️  No TypeScript files changed"
  echo "✅ Running full test suite as safety check..."
  npm test
  exit 0
fi

echo "📝 Changed files:"
echo "$CHANGED_FILES"
echo ""

# Map changed files to their test files
TEST_FILES=""
for file in $CHANGED_FILES; do
  # Skip test files themselves
  if [[ "$file" == *".test."* ]] || [[ "$file" == *".spec."* ]]; then
    TEST_FILES="$TEST_FILES $file"
    continue
  fi
  
  # Try to find corresponding test file
  # Pattern 1: src/foo/bar.ts -> tests/foo/bar.test.ts
  TEST_FILE1=$(echo "$file" | sed 's|^src/|tests/|' | sed 's|\.ts$|.test.ts|')
  
  # Pattern 2: src/foo/bar.ts -> src/foo/bar.test.ts
  TEST_FILE2=$(echo "$file" | sed 's|\.ts$|.test.ts|')
  
  # Check which pattern exists
  if [ -f "$TEST_FILE1" ]; then
    TEST_FILES="$TEST_FILES $TEST_FILE1"
  elif [ -f "$TEST_FILE2" ]; then
    TEST_FILES="$TEST_FILES $TEST_FILE2"
  else
    echo "⚠️  No test file found for: $file"
  fi
done

if [ -z "$TEST_FILES" ]; then
  echo "⚠️  No test files found for changed files"
  echo "✅ Running full test suite as safety check..."
  npm test
  exit 0
fi

echo ""
echo "🎯 Running tests for affected files:"
echo "$TEST_FILES"
echo ""

# Run only the affected tests
# Note: This is a simplified version - in production you'd want to:
# 1. Also run tests that import the changed files
# 2. Handle circular dependencies
# 3. Cache test results
# 4. Run full suite on main branch

# For now, just run all tests (we'll optimize this later)
echo "📦 Running full test suite (optimization coming soon)..."
npm test

# Future optimization:
# npx jest $TEST_FILES --coverage --collectCoverageFrom="$CHANGED_FILES"

echo ""
echo "✅ Tests completed successfully"

