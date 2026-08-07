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
const { DEFAULT_SYSTEM_PROMPT, useSettingsStore } = await import('../src/stores/settingsStore');

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

  test('moves the active conversation to trash without deleting its messages', () => {
    useChatStore.getState().deleteAllConversations();
    const conversationId = useChatStore
      .getState()
      .createNewConversation('provider-1', 'model-1', 'Be concise.');
    useChatStore.getState().addMessage(conversationId, {
      id: 'message-trash',
      conversationId,
      role: 'user',
      content: 'Keep this message',
      attachments: [],
      toolCalls: [],
      toolResults: [],
      timestamp: 1,
      tokenUsage: null,
    });

    useChatStore.getState().archiveConversation(conversationId);
    const state = useChatStore.getState();
    const [conversation] = state.conversations;

    expect(conversation.isArchived).toBe(true);
    expect(state.activeConversationId).toBeNull();
    expect(state.messages[conversationId]).toHaveLength(1);

    useChatStore.getState().deleteAllConversations();
  });

  test('deletes all chats without changing settings', () => {
    useChatStore.getState().deleteAllConversations();
    const archivedId = useChatStore
      .getState()
      .createNewConversation('provider-1', 'model-1', 'Archived prompt');
    useChatStore.getState().archiveConversation(archivedId);
    const activeId = useChatStore
      .getState()
      .createNewConversation('provider-2', 'model-2', 'Active prompt');

    useSettingsStore.setState({
      providers: [{ id: 'provider-keep' } as never],
      activeProviderId: 'provider-keep',
      activeModelId: 'model-keep',
      defaultSystemPrompt: 'Keep this setting',
    });

    useChatStore.getState().deleteAllConversations();

    const chatState = useChatStore.getState();
    const settingsState = useSettingsStore.getState();
    expect(chatState.conversations).toEqual([]);
    expect(chatState.messages).toEqual({});
    expect(chatState.activeConversationId).toBeNull();
    expect(settingsState.providers).toEqual([{ id: 'provider-keep' }]);
    expect(settingsState.activeProviderId).toBe('provider-keep');
    expect(settingsState.activeModelId).toBe('model-keep');
    expect(settingsState.defaultSystemPrompt).toBe('Keep this setting');
    expect(activeId).toBeTruthy();

    useSettingsStore.getState().resetSettings();
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
    expect(state.defaultSystemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  test('persists the system prompt immediately', () => {
    useSettingsStore.getState().setDefaultSystemPrompt('Custom system prompt');

    const persisted = JSON.parse(storage.get('tenshillm-settings') || '{}');
    expect(persisted.defaultSystemPrompt).toBe('Custom system prompt');

    useSettingsStore.getState().resetSettings();
  });
});
