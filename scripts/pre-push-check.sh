#!/bin/bash
# Pre-push check script
# Run this before pushing to catch issues locally
# Usage: ./scripts/pre-push-check.sh

set -e

echo "🚀 Running pre-push checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Function to run a check
run_check() {
  local name="$1"
  local command="$2"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if eval "$command"; then
    echo -e "${GREEN}✅ $name passed${NC}"
  else
    echo -e "${RED}❌ $name failed${NC}"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
}

# Check 1: TypeScript compilation
run_check "TypeScript Type Check" "npm run verify:types"

# Check 2: Linting
run_check "ESLint" "npm run lint"

# Check 3: Tests
run_check "Test Suite" "npm test"

# Check 4: Build
run_check "Build" "npm run build"

# Check 5: Placeholder detection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Placeholder Detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get uncommitted changes
UNCOMMITTED=$(git diff --name-only | grep -E '\.(ts|js)$' || echo "")
STAGED=$(git diff --cached --name-only | grep -E '\.(ts|js)$' || echo "")

ALL_CHANGED="$UNCOMMITTED $STAGED"

if [ -z "$ALL_CHANGED" ]; then
  echo "ℹ️  No changed files to check"
else
  PLACEHOLDER_FOUND=0
  
  for file in $ALL_CHANGED; do
    if [ -f "$file" ]; then
      # Check for common placeholder patterns
      if grep -n -E "(TODO|FIXME|STUB|PLACEHOLDER|not implemented|For now|In a real implementation)" "$file" > /dev/null; then
        echo -e "${YELLOW}⚠️  Found placeholders in: $file${NC}"
        grep -n -E "(TODO|FIXME|STUB|PLACEHOLDER|not implemented|For now|In a real implementation)" "$file" | head -5
        PLACEHOLDER_FOUND=1
      fi
    fi
  done
  
  if [ $PLACEHOLDER_FOUND -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Warning: Placeholder code detected${NC}"
    echo "Consider completing the implementation before pushing."
    echo "If these are intentional, document them with tracking issues."
    # Don't fail on this, just warn
  else
    echo -e "${GREEN}✅ No placeholders detected${NC}"
  fi
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Safe to push.${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED check(s) failed${NC}"
  echo ""
  echo "Please fix the issues before pushing."
  echo "Or use 'git push --no-verify' to skip these checks (not recommended)."
  exit 1
fi

