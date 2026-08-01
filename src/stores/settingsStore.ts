import { create } from 'zustand';
import type { ApiProvider, ModelConfig, McpServer, SearchConfig, AgentSkill } from '../types';

interface SettingsState {
  providers: ApiProvider[];
  activeProviderId: string | null;
  activeModelId: string | null;
  mcpServers: McpServer[];
  searchConfig: SearchConfig;
  agentSkills: AgentSkill[];
  defaultSystemPrompt: string;
  fontSize: number;

  setProviders: (providers: ApiProvider[]) => void;
  addProvider: (provider: ApiProvider) => void;
  updateProvider: (id: string, updates: Partial<ApiProvider>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string | null) => void;
  setActiveModel: (id: string | null) => void;
  addModelToProvider: (providerId: string, model: ModelConfig) => void;
  removeModelFromProvider: (providerId: string, modelId: string) => void;
  setMcpServers: (servers: McpServer[]) => void;
  addMcpServer: (server: McpServer) => void;
  updateMcpServer: (id: string, updates: Partial<McpServer>) => void;
  removeMcpServer: (id: string) => void;
  setSearchConfig: (config: SearchConfig) => void;
  setAgentSkills: (skills: AgentSkill[]) => void;
  addAgentSkill: (skill: AgentSkill) => void;
  updateAgentSkill: (id: string, updates: Partial<AgentSkill>) => void;
  removeAgentSkill: (id: string) => void;
  setDefaultSystemPrompt: (prompt: string) => void;
  setFontSize: (size: number) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: false,
  provider: 'tavily',
  apiKey: '',
  maxResults: 5,
  region: 'es-ES',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  providers: [],
  activeProviderId: null,
  activeModelId: null,
  mcpServers: [],
  searchConfig: DEFAULT_SEARCH_CONFIG,
  agentSkills: [],
  defaultSystemPrompt: 'You are a helpful AI assistant.',
  fontSize: 14,

  setProviders: (providers) => set({ providers }),
  addProvider: (provider) => set((s) => ({ providers: [...s.providers, provider] })),
  updateProvider: (id, updates) =>
    set((s) => ({
      providers: s.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removeProvider: (id) =>
    set((s) => ({
      providers: s.providers.filter((p) => p.id !== id),
      activeProviderId: s.activeProviderId === id ? null : s.activeProviderId,
    })),
  setActiveProvider: (id) => set({ activeProviderId: id }),
  setActiveModel: (id) => set({ activeModelId: id }),
  addModelToProvider: (providerId, model) =>
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId ? { ...p, models: [...p.models, model] } : p
      ),
    })),
  removeModelFromProvider: (providerId, modelId) =>
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId
          ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
          : p
      ),
    })),
  setMcpServers: (servers) => set({ mcpServers: servers }),
  addMcpServer: (server) => set((s) => ({ mcpServers: [...s.mcpServers, server] })),
  updateMcpServer: (id, updates) =>
    set((s) => ({
      mcpServers: s.mcpServers.map((srv) => (srv.id === id ? { ...srv, ...updates } : srv)),
    })),
  removeMcpServer: (id) =>
    set((s) => ({ mcpServers: s.mcpServers.filter((srv) => srv.id !== id) })),
  setSearchConfig: (config) => set({ searchConfig: config }),
  setAgentSkills: (skills) => set({ agentSkills: skills }),
  addAgentSkill: (skill) => set((s) => ({ agentSkills: [...s.agentSkills, skill] })),
  updateAgentSkill: (id, updates) =>
    set((s) => ({
      agentSkills: s.agentSkills.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk)),
    })),
  removeAgentSkill: (id) =>
    set((s) => ({ agentSkills: s.agentSkills.filter((sk) => sk.id !== id) })),
  setDefaultSystemPrompt: (prompt) => set({ defaultSystemPrompt: prompt }),
  setFontSize: (size) => set({ fontSize: size }),
  loadSettings: () => {
    try {
      const raw = localStorage.getItem('tenshillm-settings');
      if (raw) {
        const data = JSON.parse(raw);
        const mcpServers = Array.isArray(data.mcpServers)
          ? data.mcpServers.map((server: McpServer) => ({
              ...server,
              // MCP sessions are runtime state and may expire between launches.
              connected: false,
              tools: [],
              sessionId: undefined,
              protocolVersion: undefined,
            }))
          : [];
        set({ ...data, mcpServers });
      }
    } catch {
      // ignore
    }
  },
  saveSettings: () => {
    const state = get();
    const data = {
      providers: state.providers,
      activeProviderId: state.activeProviderId,
      activeModelId: state.activeModelId,
      mcpServers: state.mcpServers,
      searchConfig: state.searchConfig,
      agentSkills: state.agentSkills,
      defaultSystemPrompt: state.defaultSystemPrompt,
      fontSize: state.fontSize,
    };
    localStorage.setItem('tenshillm-settings', JSON.stringify(data));
  },
}));
