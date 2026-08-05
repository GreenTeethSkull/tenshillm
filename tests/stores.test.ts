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

describe('search settings', () => {
  test('defaults to DuckDuckGo without an API key', () => {
    storage.delete('tenshillm-settings');
    useSettingsStore.setState({
      searchConfig: {
        enabled: false,
        provider: 'duckduckgo',
        apiKey: '',
        maxResults: 5,
        region: 'es-ES',
      },
    });

    expect(useSettingsStore.getState().searchConfig.provider).toBe('duckduckgo');
    expect(useSettingsStore.getState().searchConfig.apiKey).toBe('');
  });

  test('persists the new switch value immediately', () => {
    useSettingsStore.getState().setSearchConfig({
      ...useSettingsStore.getState().searchConfig,
      enabled: true,
      provider: 'duckduckgo',
      apiKey: '',
    });

    const persisted = JSON.parse(storage.get('tenshillm-settings') || '{}');
    expect(persisted.searchConfig.enabled).toBe(true);
    expect(persisted.searchConfig.provider).toBe('duckduckgo');
    expect(persisted.searchConfig.apiKey).toBe('');

    storage.delete('tenshillm-settings');
  });

  test('migrates the old keyless Tavily default to DuckDuckGo', () => {
    storage.set(
      'tenshillm-settings',
      JSON.stringify({
        searchConfig: {
          enabled: true,
          provider: 'tavily',
          apiKey: '',
          maxResults: 7,
          region: 'es-PE',
        },
      })
    );

    useSettingsStore.getState().loadSettings();
    const config = useSettingsStore.getState().searchConfig;

    expect(config).toEqual({
      enabled: true,
      provider: 'duckduckgo',
      apiKey: '',
      maxResults: 7,
      region: 'es-PE',
    });
    expect(JSON.parse(storage.get('tenshillm-settings') || '{}').searchConfig.provider).toBe(
      'duckduckgo'
    );

    storage.delete('tenshillm-settings');
  });

  test('delete-all reset removes settings and restores defaults', () => {
    useSettingsStore.setState({
      providers: [{ id: 'provider-1' } as never],
      activeProviderId: 'provider-1',
      activeModelId: 'model-1',
      defaultSystemPrompt: 'Custom prompt',
    });
    storage.set('tenshillm-settings', JSON.stringify({ providers: [{ id: 'provider-1' }] }));

    useSettingsStore.getState().resetSettings();
    const state = useSettingsStore.getState();

    expect(storage.has('tenshillm-settings')).toBe(false);
    expect(state.providers).toEqual([]);
    expect(state.activeProviderId).toBeNull();
    expect(state.activeModelId).toBeNull();
    expect(state.searchConfig.provider).toBe('duckduckgo');
    expect(state.defaultSystemPrompt).toBe('You are a helpful AI assistant.');
  });

  test('persists the system prompt immediately', () => {
    useSettingsStore.getState().setDefaultSystemPrompt('Custom system prompt');

    const persisted = JSON.parse(storage.get('tenshillm-settings') || '{}');
    expect(persisted.defaultSystemPrompt).toBe('Custom system prompt');

    useSettingsStore.getState().resetSettings();
  });
});
