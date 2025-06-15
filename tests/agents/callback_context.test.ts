/**
 * @fileoverview Tests for the CallbackContext class
 * 
 * This test suite ensures that the CallbackContext class correctly provides
 * mutable access to the invocation context with state management and
 * artifact operations.
 */

import { CallbackContext } from '../../src/google/adk/agents/callback_context';
import { InvocationContext } from '../../src/google/adk/agents/invocation_context';
import { BaseAgent } from '../../src/google/adk/agents/base_agent';
import { RunConfig } from '../../src/google/adk/agents/run_config';
import { Session } from '../../src/google/adk/sessions/session';
import { State } from '../../src/google/adk/sessions/state';
import { BaseArtifactService } from '../../src/google/adk/artifacts/base_artifact_service';
import { BaseMemoryService } from '../../src/google/adk/memory/base_memory_service';
import { EventActions } from '../../src/google/adk/events/event_actions';
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
  loadArtifact = jest.fn();
  saveArtifact = jest.fn();
  listArtifactKeys = jest.fn().mockResolvedValue(['key1', 'key2']);
  deleteArtifact = jest.fn().mockResolvedValue(undefined);
  listVersions = jest.fn().mockResolvedValue([1, 2, 3]);
}

class _MockMemoryService extends BaseMemoryService {
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
  const stateObj = state ? state.toObject() : {};
  return new MockSession('session-456', stateObj);
}

function createMockSessionWithInvalidState(): Session {
  const session = new MockSession('mock-session-id');
  const invalidSession = session as Record<string, any>;
  invalidSession.state = {
    invalidState: true
  };
  return session;
}

function createMockArtifactService(): MockArtifactService {
  return new MockArtifactService();
}


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
    it('should return null when session is null', () => {
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
      expect(state).toBeNull();
    });

    it('should create a state from session state', () => {
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
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      
      // Assert
      expect(state).toBeInstanceOf(State);
      expect(state!.toObject()).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should return a mutable state instance', () => {
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
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      state!.set('key1', 'new value');
      
      // Assert
      expect(state!.get('key1')).toBe('new value');
    });

    it('should cache the state instance', () => {
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
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state1 = callbackContext.state;
      const state2 = callbackContext.state;
      
      // Assert
      expect(state1).toBe(state2);
    });

    it('should handle plain object states by creating State instance', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSessionWithInvalidState();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      
      // Assert
      // Since session.state is a plain object, CallbackContext should wrap it in a State instance
      expect(state).not.toBeNull();
      expect(state).toBeInstanceOf(State);
      expect(state!.toObject()).toEqual({ invalidState: true });
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
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const state = callbackContext.state;
      
      // Assert
      expect(state).toBeNull();
    });
  });

  describe('loadArtifact', () => {
    it('should throw error when artifact service is not available', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession,
        artifactService: null
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.loadArtifact('test.json'))
        .rejects.toThrow('Artifact service is not available');
    });

    it('should throw error when session is null', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null,
        artifactService: mockArtifactService
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.loadArtifact('test.json'))
        .rejects.toThrow('Session is not available for artifact operations');
    });

    it('should call artifactService.loadArtifact with correct parameters', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const mockSession = createMockSession();
      const appName = 'TestApp';
      const userId = 'user123';
      const sessionId = 'session-456';
      const filename = 'test.json';
      
      // Mock the loadArtifact method
      mockArtifactService.loadArtifact.mockResolvedValue({ data: 'test data' });
      
      // Set up the session with an ID
      mockSession.id = sessionId;
      
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        artifactService: mockArtifactService,
        session: mockSession,
        appName: appName,
        userId: userId
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const result = await callbackContext.loadArtifact(filename);
      
      // Assert
      expect(mockArtifactService.loadArtifact).toHaveBeenCalledWith(
        appName,
        userId,
        sessionId,
        filename
      );
      expect(result).toEqual({ data: 'test data' });
    });

    it('should handle errors from artifactService.loadArtifact', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const mockSession = createMockSession();
      const appName = 'TestApp';
      const userId = 'user123';
      const filename = 'test.json';
      
      // Mock the loadArtifact method to throw an error
      mockArtifactService.loadArtifact.mockRejectedValue(new Error('Load failed'));
      
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        artifactService: mockArtifactService,
        session: mockSession,
        appName: appName,
        userId: userId
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.loadArtifact(filename))
        .rejects.toThrow('Failed to load artifact test.json: Load failed');
    });
  });

  describe('saveArtifact', () => {
    it('should throw error when artifact service is not available', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockSession = createMockSession();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession,
        artifactService: null
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.saveArtifact('test.json', { data: 'test data' }))
        .rejects.toThrow('Artifact service is not available');
    });

    it('should throw error when session is null', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null,
        artifactService: mockArtifactService
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.saveArtifact('test.json', { data: 'test data' }))
        .rejects.toThrow('Session is not available for artifact operations');
    });

    it('should call artifactService.saveArtifact with correct parameters', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const mockSession = createMockSession();
      const appName = 'TestApp';
      const userId = 'user123';
      const sessionId = 'session-456';
      const filename = 'test.json';
      const artifact = { data: 'test data' };
      
      // Mock the saveArtifact method
      mockArtifactService.saveArtifact.mockResolvedValue(1024);
      
      // Set up the session with an ID
      mockSession.id = sessionId;
      
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        artifactService: mockArtifactService,
        session: mockSession,
        appName: appName,
        userId: userId
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const result = await callbackContext.saveArtifact(filename, artifact);
      
      // Assert
      expect(mockArtifactService.saveArtifact).toHaveBeenCalledWith(
        appName,
        userId,
        sessionId,
        filename,
        artifact
      );
      expect(result).toBe(1024);
    });

    it('should return the bytes saved from artifactService.saveArtifact', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const mockSession = createMockSession();
      const appName = 'TestApp';
      const userId = 'user123';
      const sessionId = 'session-456';
      const filename = 'test.json';
      const artifact = { data: 'test data' };
      const bytesSaved = 2048;
      
      // Mock the saveArtifact method
      mockArtifactService.saveArtifact.mockResolvedValue(bytesSaved);
      
      // Set up the session with an ID
      mockSession.id = sessionId;
      
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        artifactService: mockArtifactService,
        session: mockSession,
        appName: appName,
        userId: userId
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act
      const result = await callbackContext.saveArtifact(filename, artifact);
      
      // Assert
      expect(result).toBe(bytesSaved);
    });

    it('should handle errors from artifactService.saveArtifact', async () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockArtifactService = createMockArtifactService();
      const mockSession = createMockSession();
      const appName = 'TestApp';
      const userId = 'user123';
      const filename = 'test.json';
      const artifact = { data: 'test data' };
      
      // Mock the saveArtifact method to throw an error
      mockArtifactService.saveArtifact.mockRejectedValue(new Error('Save failed'));
      
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        artifactService: mockArtifactService,
        session: mockSession,
        appName: appName,
        userId: userId
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Act & Assert
      await expect(callbackContext.saveArtifact(filename, artifact))
        .rejects.toThrow('Failed to save artifact test.json: Save failed');
    });
  });

  describe('hasStateDelta', () => {
    it('should return true when state has delta', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({ key1: 'value1' }, {});
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Create a state with changes
      const state = callbackContext.state;
      state!.set('key2', 'value2');
      
      // Act
      const result = callbackContext.hasStateDelta();
      
      // Assert
      expect(result).toBe(true);
    });

    it('should return true when eventActions has state changes', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig
      });
      const eventActions = new EventActions();
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Mock the hasStateChanges method to return true
      jest.spyOn(eventActions, 'hasStateChanges').mockReturnValue(true);
      
      // Act
      const result = callbackContext.hasStateDelta();
      
      // Assert
      expect(result).toBe(true);
      expect(eventActions.hasStateChanges).toHaveBeenCalled();
    });

    it('should return false when neither state nor eventActions has changes', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({ key1: 'value1' }, {});
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const eventActions = new EventActions();
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Mock the hasStateChanges method to return false
      jest.spyOn(eventActions, 'hasStateChanges').mockReturnValue(false);
      
      // Act
      const result = callbackContext.hasStateDelta();
      
      // Assert
      expect(result).toBe(false);
      expect(eventActions.hasStateChanges).toHaveBeenCalled();
    });

    it('should return false when session is null', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: null
      });
      const eventActions = new EventActions();
      const callbackContext = new CallbackContext(invocationContext, eventActions);
      
      // Mock the hasStateChanges method to return false
      jest.spyOn(eventActions, 'hasStateChanges').mockReturnValue(false);
      
      // Act
      const result = callbackContext.hasStateDelta();
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('resetCachedState', () => {
    it('should reset the cached state', () => {
      // Arrange
      const mockAgent = createMockAgent();
      const mockRunConfig = createMockRunConfig();
      const mockState = new State({ key1: 'value1' }, {});
      const mockSession = createMockSession(mockState);
      const invocationContext = new InvocationContext({
        agent: mockAgent,
        runConfig: mockRunConfig,
        session: mockSession
      });
      const callbackContext = new CallbackContext(invocationContext);
      
      // Get state to cache it
      const state1 = callbackContext.state;
      expect(state1).not.toBeNull();
      
      // Act
      callbackContext.resetCachedState();
      
      // Update the session state directly (since that's what's actually used)
      mockSession.state['key2'] = 'value2';
      
      // Get state again
      const state2 = callbackContext.state;
      
      // Assert
      expect(state1).not.toBe(state2);
      expect(state2).not.toBeNull();
      expect(state2!.toObject()).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });
});