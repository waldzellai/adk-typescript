# Parallel Task Execution Framework

Execute multiple development tasks concurrently using parallel git worktrees and agent coordination.

## Variables

TASK_DESCRIPTION: $ARGUMENTS
WORKTREE_COUNT: $ARGUMENTS (default: 3)
WORKSPACE_PREFIX: $ARGUMENTS (default: "parallel-task")

## Setup Commands

RUN `mkdir -p trees && find trees -type d -maxdepth 3 | sort`
RUN `git worktree list`
READ: TASK_DESCRIPTION

## Framework Overview

This command creates multiple parallel development environments where independent agents can work on:

- **Feature Development**: Different implementation approaches for the same feature
- **Refactoring Tasks**: Multiple refactoring strategies for comparison
- **Bug Fixes**: Alternative solutions to complex issues  
- **Performance Optimization**: Competing optimization strategies
- **Architecture Experiments**: Testing different architectural patterns
- **Security Implementations**: Various security approaches
- **UI/UX Alternatives**: Different interface designs
- **Testing Strategies**: Multiple testing approaches

## Execution Strategy

### Worktree Organization
Create WORKTREE_COUNT parallel environments:
```
trees/
├── ${WORKSPACE_PREFIX}-1/    # Agent 1 workspace
├── ${WORKSPACE_PREFIX}-2/    # Agent 2 workspace  
└── ${WORKSPACE_PREFIX}-N/    # Agent N workspace
```

### Agent Assignment
Each agent operates independently in their designated worktree:
- **Agent 1**: `trees/${WORKSPACE_PREFIX}-1/`
- **Agent 2**: `trees/${WORKSPACE_PREFIX}-2/`
- **Agent N**: `trees/${WORKSPACE_PREFIX}-N/`

### Task Execution
Each agent will:
1. **Analyze** the TASK_DESCRIPTION independently
2. **Implement** their solution approach
3. **Test** their implementation thoroughly
4. **Document** their results in `RESULTS.md`

## Implementation Guidelines

### For Each Agent
- Work exclusively in your assigned worktree directory
- Focus on code implementation, avoid starting servers
- Create comprehensive tests for your solution
- Document architectural decisions and trade-offs
- Report final changes in a detailed `RESULTS.md` file

### Quality Standards
- Ensure code builds successfully
- Maintain existing functionality
- Follow project coding standards
- Include performance considerations
- Address security implications

### Documentation Requirements
Each agent's `RESULTS.md` should include:
```markdown
# Implementation Results - [Agent ID]

## Approach Summary
Brief description of the implementation strategy

## Changes Made
- List of files modified/created
- Key architectural decisions
- Implementation highlights

## Testing Results
- Test coverage achieved
- Performance benchmarks
- Compatibility verification

## Trade-offs & Considerations
- Benefits of this approach
- Potential drawbacks
- Future enhancement opportunities

## Next Steps
- Recommended follow-up actions
- Integration considerations
- Maintenance requirements
```

## Use Cases

### 🎯 **Feature Development**
- Multiple UI/UX approaches for the same feature
- Different API design patterns
- Alternative data modeling strategies
- Competing algorithm implementations

### 🔧 **Refactoring & Optimization**  
- Performance optimization techniques
- Code organization strategies
- Dependency management approaches
- Architecture modernization paths

### 🐛 **Problem Solving**
- Bug fix alternatives
- Error handling strategies
- Edge case resolution approaches
- Compatibility solutions

### 🧪 **Experimentation**
- New technology integration
- Framework comparison
- Pattern validation
- Scalability testing

## Coordination & Integration

### Progress Monitoring
- Each agent reports status independently
- Central coordination through git worktree system
- Regular checkpoint documentation

### Result Evaluation
After completion:
1. **Compare** all RESULTS.md reports
2. **Analyze** trade-offs and benefits
3. **Select** best elements from each approach
4. **Integrate** chosen solutions
5. **Test** combined implementation

### Quality Assurance
- Cross-agent code review
- Performance comparison
- Security audit across implementations
- Integration testing

## Success Metrics

### Implementation Quality
- ✅ All implementations build successfully
- ✅ Comprehensive test coverage
- ✅ Clear documentation
- ✅ Performance benchmarks

### Approach Diversity
- ✅ Different implementation strategies
- ✅ Varied architectural patterns
- ✅ Multiple problem-solving angles
- ✅ Creative solution approaches

### Knowledge Generation
- ✅ Documented trade-offs
- ✅ Performance comparisons
- ✅ Best practice identification
- ✅ Future roadmap insights

This parallel execution framework maximizes development velocity while ensuring thorough exploration of solution spaces and comprehensive quality validation.
