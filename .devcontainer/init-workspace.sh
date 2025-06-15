#!/bin/bash

echo "🚀 Initializing ADK TypeScript Development Environment..."

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Run initial build
echo "🏗️ Running initial TypeScript build..."
npm run build

# Run initial tests to verify setup
echo "🧪 Running test suite verification..."
npm test

# Run linting to check code quality
echo "🔍 Running linting check..."
npm run lint

# Display environment info
echo "📋 Development Environment Info:"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "TypeScript version: $(npx tsc --version)"

# Check if Claude Code is available
if command -v claude &> /dev/null; then
    echo "🤖 Claude Code CLI: Available"
    echo "Run 'npm run verify:claude' to analyze code quality with Claude"
else
    echo "⚠️  Claude Code CLI: Not available (install with: curl -fsSL https://claude.ai/cli/install.sh | bash)"
fi

# Display quick start commands
echo ""
echo "🎯 Quick Start Commands:"
echo "  npm run build         - Build TypeScript"
echo "  npm run test          - Run tests"
echo "  npm run lint          - Run ESLint"
echo "  npm run verify:claude - AI-powered code review"
echo "  npm run quality:gate  - Run all quality checks"
echo ""
echo "✅ ADK TypeScript development environment ready!"