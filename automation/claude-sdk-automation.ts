/**
 * Claude Code SDK Automation for ADK TypeScript
 * Advanced programmatic integration for development workflows
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface AutomationConfig {
  maxTurns: number;
  includeContext: boolean;
  projectRoot: string;
  outputFormat: 'text' | 'json' | 'streaming';
}

interface CodeAnalysisResult {
  issues: Array<{
    file: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion: string;
  }>;
  metrics: {
    typeScore: number;
    complexityScore: number;
    maintainabilityScore: number;
  };
  recommendations: string[];
}

export class ClaudeAutomationEngine {
  private config: AutomationConfig;

  constructor(config: Partial<AutomationConfig> = {}) {
    this.config = {
      maxTurns: 3,
      includeContext: true,
      projectRoot: process.cwd(),
      outputFormat: 'json',
      ...config
    };
  }

  /**
   * Analyze TypeScript code quality with Claude
   */
  async analyzeCodeQuality(filePaths: string[]): Promise<CodeAnalysisResult> {
    const projectContext = this.gatherProjectContext();
    const fileContents = filePaths.map(fp => ({
      path: fp,
      content: fs.readFileSync(path.join(this.config.projectRoot, fp), 'utf-8')
    }));

    const prompt = `
    You are a TypeScript code quality expert analyzing the ADK TypeScript project.
    
    Project Context:
    ${projectContext}
    
    Files to analyze:
    ${fileContents.map(f => `
    File: ${f.path}
    \`\`\`typescript
    ${f.content}
    \`\`\`
    `).join('\n')}
    
    Please provide a comprehensive analysis in JSON format:
    {
      "issues": [
        {
          "file": "path/to/file.ts",
          "line": 42,
          "severity": "error|warning|info",
          "message": "Description of issue",
          "suggestion": "Specific fix recommendation"
        }
      ],
      "metrics": {
        "typeScore": 0-100,
        "complexityScore": 0-100,
        "maintainabilityScore": 0-100
      },
      "recommendations": ["List of actionable improvements"]
    }
    
    Focus on:
    1. TypeScript usage (avoid 'any', proper typing)
    2. Code patterns and anti-patterns
    3. Performance considerations
    4. Maintainability issues
    `;

    const response = await this.executeClaudeQuery(prompt);
    return JSON.parse(response) as CodeAnalysisResult;
  }

  /**
   * Generate TypeScript code with Claude
   */
  async generateCode(specification: string, targetFile: string): Promise<string> {
    const projectContext = this.gatherProjectContext();
    const existingCode = fs.existsSync(targetFile) 
      ? fs.readFileSync(targetFile, 'utf-8') 
      : '';

    const prompt = `
    You are generating TypeScript code for the ADK TypeScript project.
    
    Project Context:
    ${projectContext}
    
    Specification:
    ${specification}
    
    ${existingCode ? `
    Existing Code:
    \`\`\`typescript
    ${existingCode}
    \`\`\`
    ` : ''}
    
    Requirements:
    1. Follow ADK TypeScript project conventions
    2. Use proper TypeScript types (no 'any')
    3. Include comprehensive JSDoc documentation
    4. Follow existing patterns in the codebase
    5. Include error handling
    6. Write testable, maintainable code
    
    Generate only the code content, no explanations.
    `;

    return await this.executeClaudeQuery(prompt);
  }

  /**
   * Fix specific issues with Claude
   */
  async fixIssues(issueDescription: string, affectedFiles: string[]): Promise<{ [file: string]: string }> {
    const projectContext = this.gatherProjectContext();
    const currentState = this.getCurrentProjectState();
    
    const fileContents = affectedFiles.map(fp => ({
      path: fp,
      content: fs.readFileSync(path.join(this.config.projectRoot, fp), 'utf-8')
    }));

    const prompt = `
    You are fixing issues in the ADK TypeScript project.
    
    Project Context:
    ${projectContext}
    
    Current State:
    ${currentState}
    
    Issue Description:
    ${issueDescription}
    
    Affected Files:
    ${fileContents.map(f => `
    File: ${f.path}
    \`\`\`typescript
    ${f.content}
    \`\`\`
    `).join('\n')}
    
    Please provide fixed versions of each file in JSON format:
    {
      "path/to/file1.ts": "fixed content",
      "path/to/file2.ts": "fixed content"
    }
    
    Requirements:
    1. Fix the specific issues described
    2. Maintain existing functionality
    3. Follow TypeScript best practices
    4. Preserve code formatting and style
    5. Add comments for significant changes
    `;

    const response = await this.executeClaudeQuery(prompt);
    return JSON.parse(response);
  }

  /**
   * Generate test cases with Claude
   */
  async generateTests(sourceFile: string, testType: 'unit' | 'integration' = 'unit'): Promise<string> {
    const sourceContent = fs.readFileSync(path.join(this.config.projectRoot, sourceFile), 'utf-8');
    const projectContext = this.gatherProjectContext();

    const prompt = `
    Generate ${testType} tests for the ADK TypeScript project.
    
    Project Context:
    ${projectContext}
    
    Source File: ${sourceFile}
    \`\`\`typescript
    ${sourceContent}
    \`\`\`
    
    Requirements:
    1. Use Jest testing framework
    2. Test all public methods and edge cases
    3. Mock external dependencies appropriately  
    4. Follow existing test patterns in the project
    5. Include setup/teardown as needed
    6. Test error conditions
    7. Achieve high code coverage
    
    Generate comprehensive test code.
    `;

    return await this.executeClaudeQuery(prompt);
  }

  /**
   * Refactor code with Claude
   */
  async refactorCode(targetFile: string, refactorGoals: string[]): Promise<string> {
    const sourceContent = fs.readFileSync(path.join(this.config.projectRoot, targetFile), 'utf-8');
    const projectContext = this.gatherProjectContext();

    const prompt = `
    Refactor TypeScript code for the ADK TypeScript project.
    
    Project Context:
    ${projectContext}
    
    Target File: ${targetFile}
    \`\`\`typescript
    ${sourceContent}
    \`\`\`
    
    Refactoring Goals:
    ${refactorGoals.map(goal => `- ${goal}`).join('\n')}
    
    Requirements:
    1. Maintain all existing functionality
    2. Improve code quality and maintainability
    3. Follow TypeScript best practices
    4. Preserve public API compatibility
    5. Add appropriate documentation
    6. Optimize performance where possible
    
    Provide the refactored code.
    `;

    return await this.executeClaudeQuery(prompt);
  }

  /**
   * Execute Claude query with error handling
   */
  private async executeClaudeQuery(prompt: string): Promise<string> {
    try {
      const messages: SDKMessage[] = [];
      
      for await (const message of query({
        prompt,
        abortController: new AbortController(),
        options: { 
          maxTurns: this.config.maxTurns
        }
      })) {
        messages.push(message);
      }
      
      // Extract content from assistant messages
      return messages
        .filter(msg => msg.type === 'assistant')
        .map(msg => (msg as { content?: string }).content || '')
        .join('\n');
    } catch (error) {
      console.error('Claude query failed:', error);
      throw new Error(`Claude automation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gather project context for Claude
   */
  private gatherProjectContext(): string {
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.config.projectRoot, 'package.json'), 'utf-8'));
    const claudeMd = fs.existsSync(path.join(this.config.projectRoot, 'CLAUDE.md'))
      ? fs.readFileSync(path.join(this.config.projectRoot, 'CLAUDE.md'), 'utf-8')
      : '';

    return `
    Project: ${packageJson.name} v${packageJson.version}
    Description: ${packageJson.description}
    
    CLAUDE.md Guidelines:
    ${claudeMd}
    
    Key Dependencies:
    ${Object.entries(packageJson.dependencies || {}).map(([name, version]) => `- ${name}@${version}`).join('\n')}
    `;
  }

  /**
   * Get current project state (tests, lint, build status)
   */
  private getCurrentProjectState(): string {
    try {
      const testResult = execSync('npm test 2>&1', { encoding: 'utf-8', cwd: this.config.projectRoot }).slice(0, 1000);
      const lintResult = execSync('npm run lint 2>&1', { encoding: 'utf-8', cwd: this.config.projectRoot }).slice(0, 1000);
      const buildResult = execSync('npm run build 2>&1', { encoding: 'utf-8', cwd: this.config.projectRoot }).slice(0, 500);

      return `
      Test Status:
      ${testResult}
      
      Lint Status:
      ${lintResult}
      
      Build Status:
      ${buildResult}
      `;
    } catch (error) {
      return `Unable to gather current state: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

// Example usage
export const automationScripts = {
  /**
   * Run comprehensive code analysis
   */
  async analyzeProject() {
    const engine = new ClaudeAutomationEngine();
    const tsFiles = execSync('find src -name "*.ts" -not -path "*/node_modules/*"', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim())
      .slice(0, 10); // Analyze first 10 files

    const analysis = await engine.analyzeCodeQuality(tsFiles);
    
    console.log('📊 Code Quality Analysis:');
    console.log(`Type Safety Score: ${analysis.metrics.typeScore}/100`);
    console.log(`Complexity Score: ${analysis.metrics.complexityScore}/100`);
    console.log(`Maintainability Score: ${analysis.metrics.maintainabilityScore}/100`);
    
    console.log('\n🔍 Issues Found:');
    analysis.issues.forEach(issue => {
      console.log(`${issue.severity.toUpperCase()}: ${issue.file}:${issue.line} - ${issue.message}`);
    });
    
    console.log('\n💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`- ${rec}`));
  },

  /**
   * Fix any type violations automatically
   */
  async fixAnyTypes() {
    const engine = new ClaudeAutomationEngine();
    
    // Find files with 'any' types
    const anyTypeFiles = execSync('find src -name "*.ts" -exec grep -l ": any\\|<any>" {} \\;', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim());

    for (const file of anyTypeFiles) {
      console.log(`🔧 Fixing 'any' types in ${file}...`);
      
      const fixes = await engine.fixIssues(
        'Replace all "any" types with proper TypeScript types while maintaining functionality',
        [file]
      );
      
      if (fixes[file]) {
        fs.writeFileSync(path.join(process.cwd(), file), fixes[file]);
        console.log(`✅ Fixed ${file}`);
      }
    }
  },

  /**
   * Generate missing tests
   */
  async generateMissingTests() {
    const engine = new ClaudeAutomationEngine();
    
    // Find source files without corresponding tests
    const sourceFiles = execSync('find src -name "*.ts" -not -name "*.test.ts"', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.trim());

    for (const sourceFile of sourceFiles) {
      const testFile = sourceFile.replace(/\.ts$/, '.test.ts').replace('src/', 'tests/');
      
      if (!fs.existsSync(testFile)) {
        console.log(`📝 Generating tests for ${sourceFile}...`);
        
        const testCode = await engine.generateTests(sourceFile);
        
        // Ensure test directory exists
        const testDir = path.dirname(testFile);
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        
        fs.writeFileSync(testFile, testCode);
        console.log(`✅ Generated ${testFile}`);
      }
    }
  }
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
  case 'analyze':
    automationScripts.analyzeProject();
    break;
  case 'fix-any':
    automationScripts.fixAnyTypes();
    break;
  case 'gen-tests':
    automationScripts.generateMissingTests();
    break;
  default:
    console.log('Usage: npx ts-node automation/claude-sdk-automation.ts <analyze|fix-any|gen-tests>');
  }
}