# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test`
- Run single test: `npx jest tests/path/to/test.test.ts`

## Code Style Guidelines
- **Formatting**: 2-space indentation, single quotes, semicolons required
- **Types**: Use strict TypeScript, explicit return types on functions
- **Naming**:
  - camelCase for variables, methods, functions
  - PascalCase for classes, interfaces, types
  - Agent names must be valid JavaScript identifiers
- **Imports**: Group by local/external, use explicit imports (no namespace imports)
- **Error Handling**: Provide explicit error messages with details
- **Documentation**: Use JSDoc style comments for classes and methods

## Project Structure
- ADK (Agent Development Kit) TypeScript implementation
- Modular organization with focused components (agents, tools, models, etc.)
- Follow existing patterns when adding new code