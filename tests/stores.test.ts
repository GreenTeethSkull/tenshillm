import { describe, expect, test } from 'bun:test';

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
});

const { useChatStore } = await import('../src/stores/chatStore');
const { useSettingsStore } = await import('../src/stores/settingsStore');

describe('chat persistence', () => {
  test('persists conversations and messages without transient UI state', () => {
    useChatStore.getState().deleteAllConversations();
    const conversationId = useChatStore
      .getState()
      .createNewConversation('provider-1', 'model-1', 'Be concise.');
    useChatStore.getState().setIsStreaming(true);
    useChatStore.getState().addMessage(conversationId, {
      id: 'message-1',
      conversationId,
      role: 'user',
      content: 'Hello',
      attachments: [],
      toolCalls: [],
      toolResults: [],
      timestamp: 1,
      tokenUsage: null,
    });

    const persisted = JSON.parse(storage.get('tenshillm-chat') || '{}');
    expect(persisted.state.conversations[0].id).toBe(conversationId);
    expect(persisted.state.messages[conversationId]).toHaveLength(1);
    expect(persisted.state.isStreaming).toBeUndefined();

    useChatStore.getState().deleteAllConversations();
    useChatStore.getState().setIsStreaming(false);
  });
});

describe('MCP runtime state hydration', () => {
  test('does not restore expired MCP sessions as connected', () => {
    storage.set(
      'tenshillm-settings',
      JSON.stringify({
        mcpServers: [
          {
            id: 'server-1',
            name: 'Demo',
            url: 'https://example.com/mcp',
            transport: 'streamable-http',
            headers: {},
            isEnabled: true,
            connected: true,
            sessionId: 'expired-session',
            protocolVersion: '2025-06-18',
            tools: [{ name: 'old-tool' }],
          },
        ],
      })
    );

    useSettingsStore.getState().loadSettings();
    const [server] = useSettingsStore.getState().mcpServers;

    expect(server.connected).toBe(false);
    expect(server.tools).toEqual([]);
    expect(server.sessionId).toBeUndefined();
    expect(server.protocolVersion).toBeUndefined();

    storage.delete('tenshillm-settings');
  });
});
