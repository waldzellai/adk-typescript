# Parallel Worktree Initialization

Initialize three parallel git worktree directories for concurrent development workflows.

## Variables

FEATURE_NAME: {feature or branch identifier}

## Execute these tasks

CREATE new directory 'trees/' for worktree organization

> Execute these steps in parallel for concurrency
> Use absolute paths for all commands

CREATE first worktree:

- RUN `git worktree add -b ${FEATURE_NAME}-1 ./trees/${FEATURE_NAME}-1`
- COPY configuration files if they exist (`.env`, `.env.local`, `config/*`)
- RUN dependency installation based on project type:
  - Node.js: `cd ./trees/${FEATURE_NAME}-1 && npm install` or `pnpm install` or `yarn install`
  - Python: `cd ./trees/${FEATURE_NAME}-1 && pip install -r requirements.txt`
  - Rust: `cd ./trees/${FEATURE_NAME}-1 && cargo build`
  - Go: `cd ./trees/${FEATURE_NAME}-1 && go mod download`
- RUN build process:
  - Node.js: `cd ./trees/${FEATURE_NAME}-1 && npm run build`
  - Python: `cd ./trees/${FEATURE_NAME}-1 && python setup.py build`
  - Rust: `cd ./trees/${FEATURE_NAME}-1 && cargo build`
  - Go: `cd ./trees/${FEATURE_NAME}-1 && go build`
- CONFIGURE for development instance 1

CREATE second worktree:

- RUN `git worktree add -b ${FEATURE_NAME}-2 ./trees/${FEATURE_NAME}-2`
- COPY configuration files if they exist (`.env`, `.env.local`, `config/*`)
- RUN dependency installation based on project type:
  - Node.js: `cd ./trees/${FEATURE_NAME}-2 && npm install` or `pnpm install` or `yarn install`
  - Python: `cd ./trees/${FEATURE_NAME}-2 && pip install -r requirements.txt`
  - Rust: `cd ./trees/${FEATURE_NAME}-2 && cargo build`
  - Go: `cd ./trees/${FEATURE_NAME}-2 && go mod download`
- RUN build process:
  - Node.js: `cd ./trees/${FEATURE_NAME}-2 && npm run build`
  - Python: `cd ./trees/${FEATURE_NAME}-2 && python setup.py build`
  - Rust: `cd ./trees/${FEATURE_NAME}-2 && cargo build`
  - Go: `cd ./trees/${FEATURE_NAME}-2 && go build`
- CONFIGURE for development instance 2

CREATE third worktree:

- RUN `git worktree add -b ${FEATURE_NAME}-3 ./trees/${FEATURE_NAME}-3`
- COPY configuration files if they exist (`.env`, `.env.local`, `config/*`)
- RUN dependency installation based on project type:
  - Node.js: `cd ./trees/${FEATURE_NAME}-3 && npm install` or `pnpm install` or `yarn install`
  - Python: `cd ./trees/${FEATURE_NAME}-3 && pip install -r requirements.txt`
  - Rust: `cd ./trees/${FEATURE_NAME}-3 && cargo build`
  - Go: `cd ./trees/${FEATURE_NAME}-3 && go mod download`
- RUN build process:
  - Node.js: `cd ./trees/${FEATURE_NAME}-3 && npm run build`
  - Python: `cd ./trees/${FEATURE_NAME}-3 && python setup.py build`
  - Rust: `cd ./trees/${FEATURE_NAME}-3 && cargo build`
  - Go: `cd ./trees/${FEATURE_NAME}-3 && go build`
- CONFIGURE for development instance 3

## Use Cases

- **Feature development**: Test different approaches to the same feature in parallel
- **A/B testing**: Compare multiple implementation strategies
- **Refactoring**: Maintain working version while experimenting with changes
- **Bug fixing**: Isolate different fix attempts
- **Dependency testing**: Test different versions or configurations
- **Performance optimization**: Compare optimization strategies
- **Code review**: Create separate environments for reviewer feedback

## Post-Setup Tasks

After worktree creation:

1. **Verify git status** in each worktree: `git status`
2. **Confirm build success** in each environment
3. **Test basic functionality** to ensure environment integrity
4. **Configure IDE/editor** to work with multiple worktrees
5. **Set up environment-specific configuration** if needed

## Cleanup

To remove worktrees when done:

```bash
git worktree remove ./trees/${FEATURE_NAME}-1
git worktree remove ./trees/${FEATURE_NAME}-2  
git worktree remove ./trees/${FEATURE_NAME}-3
git branch -d ${FEATURE_NAME}-1 ${FEATURE_NAME}-2 ${FEATURE_NAME}-3
rm -rf ./trees
```

## Notes

- Each worktree maintains its own working directory but shares the same git repository
- Changes in one worktree don't affect others until committed and merged
- Useful for comparing different implementation approaches side-by-side
- Ideal for concurrent development without branch switching overhead
