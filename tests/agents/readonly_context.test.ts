/**
 * @fileoverview Tests for the ReadonlyContext class
 * 
 * This test suite ensures that the ReadonlyContext class correctly provides
 * read-only access to the invocation context and properly freezes the state
 * to prevent modifications.
 */

import { ReadonlyContext } from '../../src/google/adk/agents/readonly_context';
import { InvocationContext } from '../../src/google/adk/agents/invocation_context';
import { BaseAgent } from '../../src/google/adk/agents/base_agent';
import { RunConfig } from '../../src/google/adk/agents/run_config';
import { Session } from '../../src/google/adk/sessions/session';
import { State } from '../../src/google/adk/sessions/state';
import { BaseArtifactService } from '../../src/google/adk/artifacts/base_artifact_service';
import { BaseMemoryService } from '../../src/google/adk/memory/base_memory_service';
import { Content } from '../../src/google/adk/models/base_llm';
import { Event } from '../../src/google/adk/events/event';
import { SearchMemoryResponse } from '../../src/google/adk/memory/base_memory_service';

// Mock classes
class MockAgent extends BaseAgent {
  constructor() {
    super({ name: 'MockAgent' });
  }
  
  protected async *runAsyncImpl(_ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    yield new Event({
      author: 'agent',
      content: { role: 'assistant', parts: [{ text: 'Mock response' }] }
    });
  }
}

class MockRunConfig extends RunConfig {
  constructor() {
    super({});
  }
}

class MockSession extends Session {
  constructor(id: string = 'mock-session-id', state?: Record<string, unknown>) {
    super({
      id,
      appName: 'test-app',
      userId: 'test-user',
      state: state || {}
    });
  }
}

class MockArtifactService extends BaseArtifactService {
  async loadArtifact(): Promise<unknown> {
    return { data: 'test data' };
  }
  
  async saveArtifact(): Promise<number> {
    return 0;
  }
  
  async listArtifactKeys(): Promise<string[]> {
    return ['key1', 'key2'];
  }
  
  async deleteArtifact(): Promise<void> {
    return;
  }
  
  async listVersions(): Promise<number[]> {
    return [1, 2, 3];
  }
}

class MockMemoryService extends BaseMemoryService {
  async loadMemory(): Promise<unknown> {
    return { data: 'memory data' };
  }
  
  async saveMemory(): Promise<void> {
    // Mock implementation
  }
  
  addSessionToMemory(_session: Session): void {
    // Mock implementation
  }
  
  searchMemory(_appName: string, _userId: string, _query: string): SearchMemoryResponse {
    return new SearchMemoryResponse({ memories: [] });
  }
}

// Helper functions
function createMockAgent(): BaseAgent {
  return new MockAgent();
}

function createMockRunConfig(): RunConfig {
  return new MockRunConfig();
}

function createMockSession(state?: State): Session {
  // Session should store state as a plain object, not a State instance
  const stateObj = state ? state.toObject() : {};
  return new MockSession('mock-session-id', stateObj);
}

function createMockSessionWithInvalidState(): Session {
  const session = new MockSession('mock-session-id');
  const invalidSession = session as Record<string, any>;
  invalidSession.state = {
    invalidState: true
  };
  return session;
}

function createMockArtifactService(): BaseArtifactService {
  return new MockArtifactService();
}

function createMockMemoryService(): BaseMemoryService {
  return new MockMemoryService();
}

describe('ReadonlyContext', () => {
  describe('constructor', () => {
    it('should correctly initialize with an InvocationContext', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      
      // Act
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Assert
      expect(readonlyContext['_context']).toBe(invocationContext);
    });
  });

  describe('property getters', () => {
    it('should provide read-only access to agent property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const agent = readonlyContext.agent;
      
      // Assert
      expect(agent).toBe(mockAgent);
    });

    it('should provide read-only access to runConfig property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const runConfig = readonlyContext.runConfig;
      
      // Assert
      expect(runConfig).toBe(mockRunConfig);
    });

    it('should provide read-only access to session property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const session = readonlyContext.session;
      
      // Assert
      expect(session).toBe(mockSession);
    });

    it('should provide read-only access to userContent property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockUserContent: Content = { 
        role: 'user',
        parts: [{ text: 'Hello, world!' }]
      };
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        userContent: mockUserContent
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const userContent = readonlyContext.userContent;
      
      // Assert
      expect(userContent).toBe(mockUserContent);
    });

    it('should provide read-only access to appName property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const appName = 'TestApp';
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        appName: appName
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const result = readonlyContext.appName;
      
      // Assert
      expect(result).toBe(appName);
    });

    it('should provide read-only access to userId property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const userId = 'user123';
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        userId: userId
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const result = readonlyContext.userId;
      
      // Assert
      expect(result).toBe(userId);
    });

    it('should provide read-only access to artifactService property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        artifactService: mockArtifactService
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const artifactService = readonlyContext.artifactService;
      
      // Assert
      expect(artifactService).toBe(mockArtifactService);
    });

    it('should provide read-only access to memoryService property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockMemoryService = createMockMemoryService();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        memoryService: mockMemoryService
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const memoryService = readonlyContext.memoryService;
      
      // Assert
      expect(memoryService).toBe(mockMemoryService);
    });

    it('should provide read-only access to invocationId property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationId = 'inv-123';
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        invocationId: invocationId
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const result = readonlyContext.invocationId;
      
      // Assert
      expect(result).toBe(invocationId);
    });

    it('should provide read-only access to branch property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const branch = 'main';
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        branch: branch
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const result = readonlyContext.branch;
      
      // Assert
      expect(result).toBe(branch);
    });
  });

  describe('state property', () => {
    it('should return null when session is null', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const state = readonlyContext.state;
      
      // Assert
      expect(state).toBeNull();
    });

    it('should return a read-only view of the session state', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({ key1: 'value1', key2: 'value2' }, {});
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const state = readonlyContext.state;
      
      // Assert
      expect(state).not.toBeNull();
      expect(state).toEqual({ key1: 'value1', key2: 'value2' });
      
      // Verify it's read-only by attempting to modify it
      const modifyState = () => {
        if (state) {
          (state as any).key1 = 'new value';
        }
      };
      
      expect(modifyState).toThrow();
    });

    it('should properly freeze the state object', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({ key1: 'value1', key2: 'value2' }, {});
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const state = readonlyContext.state;
      
      // Assert
      expect(Object.isFrozen(state)).toBe(true);
    });

    it('should handle nested objects in state', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({ 
        user: { 
          name: 'John', 
          address: { 
            city: 'New York' 
          } 
        } 
      }, {});
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const state = readonlyContext.state;
      
      // Assert
      expect(state).not.toBeNull();
      expect(state).toEqual({ 
        user: { 
          name: 'John', 
          address: { 
            city: 'New York' 
          } 
        } 
      });
      
      // Verify nested objects are also read-only
      const modifyNestedState = () => {
        if (state) {
          (state as any).user.name = 'Jane';
        }
      };
      
      expect(modifyNestedState).toThrow();
    });

    it('should handle plain object states without toObject method', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSessionWithInvalidState();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const state = readonlyContext.state;
      
      // Assert
      // Since session.state is now treated as a plain object,
      // it should return the frozen object, not null
      expect(state).not.toBeNull();
      expect(state).toEqual({ invalidState: true });
      expect(Object.isFrozen(state)).toBe(true);
    });

    it('should return null when session state is null', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const nullStateSession = mockSession as Record<string, any>;
      nullStateSession.state = null;
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const readonlyContext = new ReadonlyContext(invocationContext);
      
      // Act
      const state = readonlyContext.state;
      
      // Assert
      expect(state).toBeNull();
    });
  });
});