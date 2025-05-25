import { InvocationContext, ReadonlyContext, CallbackContext } from '../../src/google/adk/agents/invocation_context';
import { BaseAgent } from '../../src/google/adk/agents/base_agent';
import { RunConfig } from '../../src/google/adk/agents/run_config';
import { Session } from '../../src/google/adk/sessions/session';
import { State } from '../../src/google/adk/sessions/state';
import { BaseArtifactService } from '../../src/google/adk/artifacts/base_artifact_service'; // Corrected import path
import { BaseMemoryService, SearchMemoryResponse } from '../../src/google/adk/memory/base_memory_service';
import { EventActions } from '../../src/google/adk/events/event_actions';
import { Event } from '../../src/google/adk/events/event'; // Add missing Event import
import { Content } from '@google/genai'; // Import Content from genai

// Mock implementations for dependencies
class MockAgent extends BaseAgent {
  constructor(name: string = 'mock_agent') {
    super({ name }); // Corrected constructor call
  }

  // Implement abstract method from BaseAgent
  async *runAsyncImpl(ctx: InvocationContext): AsyncGenerator<Event, void, unknown> {
    // Mock implementation - yield at least one event for testing
    yield new Event({
      id: Event.newId(),
      invocationId: ctx.invocationId || '',
      author: this.name,
      branch: ctx.branch,
      content: {
        role: this.name,
        parts: [{ text: 'Mock agent response' }]
      }
    });
  }
}

class MockRunConfig extends RunConfig {}

class MockSession extends Session {
  constructor(id: string = 'mock-session-id', state: State = new State()) {
    super({ id, appName: 'mock-app', userId: 'mock-user', state: state.toObject() }); // Corrected constructor call
  }
}

class MockArtifactService extends BaseArtifactService {
  async loadArtifact(_appName: string, _userId: string, _sessionId: string, filename: string, _version?: number): Promise<unknown | null> {
    if (filename === 'existing-artifact') {
      return { data: 'loaded' };
    }
    return null;
  }

  async saveArtifact(_appName: string, _userId: string, _sessionId: string, _filename: string, _artifact: unknown): Promise<number> {
    return 1; // Mock revision ID
  }

  // Implement abstract methods from BaseArtifactService
  async listArtifactKeys(_appName: string, _userId: string, _sessionId: string): Promise<string[]> {
    return [];
  }

  async deleteArtifact(_appName: string, _userId: string, _sessionId: string, _filename: string): Promise<void> {
    // Placeholder
  }

  async listVersions(_appName: string, _userId: string, _sessionId: string, _filename: string): Promise<number[]> {
    return [];
  }
}

class MockMemoryService extends BaseMemoryService {
  // Implement abstract methods from BaseMemoryService
  addSessionToMemory(_session: Session): void {
    // Placeholder - mock implementation
  }

  searchMemory(_appName: string, _userId: string, _query: string): SearchMemoryResponse {
    return new SearchMemoryResponse({ memories: [] });
  }
}

// Helper functions to create mocks
const createMockAgent = () => new MockAgent('mock_agent');
const createMockRunConfig = () => new MockRunConfig();
const createMockSession = (state?: State) => new MockSession('test-session-id', state);
const createMockArtifactService = () => new MockArtifactService();
const createMockMemoryService = () => new MockMemoryService();

// Mock Content object structure based on @google/genai
const createMockContent = (text: string): Content => ({
  parts: [{ text }],
  role: 'user', // Assuming a role is needed for Content
});

// Mock EventActions to include addStateChange for testing purposes
class MockEventActions extends EventActions {
  private _stateChanges: Record<string, unknown> = {};

  addStateChange(key: string, value: unknown): void {
    this._stateChanges[key] = value;
  }

  override hasStateChanges(): boolean {
    return Object.keys(this._stateChanges).length > 0;
  }
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
      const mockUserContent = createMockContent('Hello, world!'); // Corrected mock Content
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
      expect(state?.toObject()).toEqual({ key1: 'value1', key2: 'value2' });
      
      // Verify it's read-only by attempting to modify it
      const modifyState = () => {
        if (state) {
          (state as Record<string, unknown>).key1 = 'new value'; // Use Record type instead of any
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
      expect(state?.toObject()).toEqual({ 
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
          (state as Record<string, { name: string }>).user.name = 'Jane'; // Use specific nested type
        }
      };
      
      expect(modifyNestedState).toThrow();
    });
  });
});

describe('CallbackContext', () => {
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
      const callbackContext = new CallbackContext(invocationContext);
      
      // Assert
      expect(callbackContext['_context']).toBe(invocationContext);
      expect(callbackContext['_eventActions']).toBeInstanceOf(EventActions);
    });

    it('should correctly initialize with an InvocationContext and EventActions', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const eventActions = new EventActions();
      
      // Act
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Assert
      expect(callbackContext['_context']).toBe(invocationContext);
      expect(callbackContext['_eventActions']).toBe(eventActions);
    });
  });

  describe('property getters', () => {
    it('should provide access to invocationContext property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const result = callbackContext.invocationContext;
      
      // Assert
      expect(result).toBe(invocationContext);
    });

    it('should provide access to eventActions property', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const eventActions = new EventActions();
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Act
      const result = callbackContext.eventActions;
      
      // Assert
      expect(result).toBe(eventActions);
    });
  });

  describe('state property', () => {
    it('should create an empty state when session is null', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      
      // Assert
      expect(state).toBeInstanceOf(State);
      expect(state).not.toBeNull();
      expect(Object.keys(state!.toObject())).toHaveLength(0);
    });

    it('should create a state from session state', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig(); // Corrected from createMockAgent()
      const mockSessionState = new State({ key1: 'value1' });
      const mockSession = createMockSession(mockSessionState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      
      // Assert
      expect(state).toBeInstanceOf(State);
      expect(state).not.toBeNull();
      expect(state!.toObject()).toEqual({ key1: 'value1' });
    });

    it('should return a mutable state instance', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSessionState = new State({ key1: 'value1' });
      const mockSession = createMockSession(mockSessionState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      expect(state).not.toBeNull();
      state!.set('key2', 'value2');
      
      // Assert
      expect(state!.toObject()).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should cache the state instance', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSessionState = new State({ key1: 'value1' });
      const mockSession = createMockSession(mockSessionState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state1 = callbackContext.state;
      const state2 = callbackContext.state;
      
      // Assert
      expect(state1).toBe(state2);
    });

    it('should handle errors when creating state from session state', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      // Simulate a session state that is not an instance of State or a plain object
      Object.defineProperty(mockSession, 'state', {
        get: () => 'invalid-state-type'
      });
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      
      // Assert
      expect(state).toBeInstanceOf(State);
      expect(state).not.toBeNull();
      expect(Object.keys(state!.toObject())).toHaveLength(0);
    });
  });

  describe('loadArtifact', () => {
    it('should return null when session is null', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const artifact = await callbackContext.loadArtifact('test-artifact');
      
      // Assert
      expect(artifact).toBeNull();
    });

    it('should call artifactService.loadArtifact with correct parameters', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const mockArtifactService = createMockArtifactService();
      mockArtifactService.loadArtifact = jest.fn().mockResolvedValue({ data: 'test' });
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession,
        artifactService: mockArtifactService
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const artifact = await callbackContext.loadArtifact('test-artifact');
      
      // Assert
      expect(mockArtifactService.loadArtifact).toHaveBeenCalledWith(
        invocationContext.appName,
        invocationContext.userId,
        mockSession.id,
        'test-artifact',
        undefined
      );
      expect(artifact).toEqual({ data: 'test' });
    });

    it('should pass version parameter to artifactService.loadArtifact', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const mockArtifactService = createMockArtifactService();
      mockArtifactService.loadArtifact = jest.fn().mockResolvedValue({ data: 'test-v2' });
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession,
        artifactService: mockArtifactService
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const artifact = await callbackContext.loadArtifact('test-artifact');
      
      // Assert
      expect(mockArtifactService.loadArtifact).toHaveBeenCalledWith(
        invocationContext.appName,
        invocationContext.userId,
        mockSession.id,
        'test-artifact',
        2
      );
      expect(artifact).toEqual({ data: 'test-v2' });
    });
  });

  describe('saveArtifact', () => {
    it('should throw error when session is null', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.saveArtifact('test-artifact', { data: 'test' }))
        .rejects.toThrow('Cannot save artifact without a session');
    });

    it('should call artifactService.saveArtifact with correct parameters', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const mockArtifactService = createMockArtifactService();
      mockArtifactService.saveArtifact = jest.fn().mockResolvedValue(1);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession,
        artifactService: mockArtifactService
      });
      const callbackContext = new CallbackContext(invocationContext);
      const artifactData = { content: 'new-artifact' };
      
      // Act
      const revisionId = await callbackContext.saveArtifact('new-artifact', artifactData);
      
      // Assert
      expect(mockArtifactService.saveArtifact).toHaveBeenCalledWith(
        invocationContext.appName,
        invocationContext.userId,
        mockSession.id,
        'new-artifact',
        artifactData
      );
      expect(revisionId).toBe(1);
    });

    it('should return the revision ID from artifactService.saveArtifact', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const mockArtifactService = createMockArtifactService();
      mockArtifactService.saveArtifact = jest.fn().mockResolvedValue(5); // Simulate a different revision ID
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession,
        artifactService: mockArtifactService
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const revisionId = await callbackContext.saveArtifact('another-artifact', { data: 'another' });
      
      // Assert
      expect(revisionId).toBe(5);
    });
  });

  describe('hasStateDelta', () => {
    it('should return true when state has delta', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({}, { key1: 'deltaValue' }); // State with delta
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      // Access state to initialize _stateInstance
      callbackContext.state; 
      const hasDelta = callbackContext.hasStateDelta();
      
      // Assert
      expect(hasDelta).toBe(true);
    });

    it('should return true when eventActions has state changes', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const eventActions = new MockEventActions(); // Use MockEventActions
      eventActions.addStateChange('key', 'value'); // Simulate state change in event actions
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Act
      const hasDelta = callbackContext.hasStateDelta();
      
      // Assert
      expect(hasDelta).toBe(true);
    });

    it('should return false when neither state nor eventActions has changes', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State(); // No delta
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const eventActions = new EventActions(); // No state changes
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Act
      // Access state to initialize _stateInstance
      callbackContext.state;
      const hasDelta = callbackContext.hasStateDelta();
      
      // Assert
      expect(hasDelta).toBe(false);
    });
  });
});