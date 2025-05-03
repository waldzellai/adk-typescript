// Tests for the RemoteAgent class

import { RemoteAgent } from './remote_agent';
import { InvocationContext } from './invocation_context';
import { Session } from '../sessions/session';
import { Event } from '../events/event';
import { RunConfig } from './run_config';
import { Content } from '../models/llm_types';
import { InMemorySessionService } from '../sessions/in_memory_session_service';
import { InMemoryArtifactService } from '../artifacts';

// Mock fetch
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 'test-event-id',
          invocation_id: 'test-invocation-id',
          author: 'remote-service',
          content: {
            role: 'model',
            parts: [{ text: 'Response from remote service' }]
          }
        }
      ])
    });
  });
});

describe('RemoteAgent', () => {
  let remoteAgent: RemoteAgent;
  let context: InvocationContext;
  
  beforeEach(() => {
    // Create a remote agent
    remoteAgent = new RemoteAgent({
      name: 'test_remote_agent',
      url: 'http://example.com/agent',
      description: 'Test remote agent'
    });
    
    // Create a session
    const session = new Session({
      id: 'test-session',
      appName: 'test-app',
      userId: 'test-user',
      state: {}
    });
    
    // Create user content
    const userContent: Content = {
      role: 'user',
      parts: [{ text: 'Hello, remote agent!' }]
    };
    
    // Create an invocation context
    context = new InvocationContext({
      agent: remoteAgent,
      runConfig: new RunConfig(),
      session,
      userContent,
      appName: 'test-app',
      userId: 'test-user',
      artifactService: new InMemoryArtifactService(),
      sessionService: new InMemorySessionService()
    });
  });
  
  it('should communicate with a remote endpoint and yield events', async () => {
    // Run the remote agent
    const events: Event[] = [];
    for await (const event of remoteAgent.runAsync(context)) {
      events.push(event);
    }
    
    // Verify that we got an event from the remote service
    expect(events.length).toBe(1);
    expect(events[0].getAuthor()).toBe('test_remote_agent');
    expect(events[0].getContent()?.parts[0].text).toBe('Response from remote service');
  });
});
