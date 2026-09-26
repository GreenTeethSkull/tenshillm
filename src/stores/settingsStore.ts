// TenshiLLM - Mobile-first AI chat client
// Copyright (C) 2026 Angel Rios
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  ApiProvider,
  ModelConfig,
  McpServer,
  SearchConfig,
  AgentSkill,
  ProviderSessionMode,
} from '../types';
import { normalizeDefaultEffort, normalizeEffortParam, normalizeEfforts } from '../lib/effort';

export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';

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
  updateModelInProvider: (providerId: string, modelId: string, updates: Partial<ModelConfig>) => void;
  removeModelFromProvider: (providerId: string, modelId: string) => void;
  setMcpServers: (servers: McpServer[]) => void;
  addMcpServer: (server: McpServer) => void;
  updateMcpServer: (id: string, updates: Partial<McpServer>) => void;
  removeMcpServer: (id: string) => void;
  setSearchConfig: (config: SearchConfig) => void;
  setAgentSkills: (skills: AgentSkill[]) => void;
  addAgentSkill: (skill: AgentSkill) => void;
  addAgentSkills: (skills: AgentSkill[]) => void;
  updateAgentSkill: (id: string, updates: Partial<AgentSkill>) => void;
  removeAgentSkill: (id: string) => void;
  setDefaultSystemPrompt: (prompt: string) => void;
  setFontSize: (size: number) => void;
  resetSettings: () => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: false,
  provider: 'duckduckgo',
  apiKey: '',
  maxResults: 5,
  region: 'es-ES',
};

function normalizeSearchConfig(value: Partial<SearchConfig> | undefined): SearchConfig {
  const config = { ...DEFAULT_SEARCH_CONFIG, ...(value || {}) };
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey : '';

  // Migrate the previous default, which could never search without a Tavily key.
  if (config.provider === 'tavily' && !apiKey.trim()) {
    return { ...config, provider: 'duckduckgo', apiKey: '' };
  }

  return { ...config, apiKey };
}

// Coerces a persisted model to a valid ModelConfig. Effort fields may be
// missing (models saved before effort support) or stale (hand-edited storage);
// `changed` reports whether the effort fields had to be rewritten so the
// settings can be re-persisted once.
function normalizeModelConfig(raw: unknown): { model: ModelConfig; changed: boolean } {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<ModelConfig>;
  const efforts = normalizeEfforts(value.efforts);
  const defaultEffort = normalizeDefaultEffort(value.defaultEffort, efforts);
  const effortParam = normalizeEffortParam(value.effortParam);
  const changed =
    JSON.stringify(value.efforts ?? null) !== JSON.stringify(efforts) ||
    (value.defaultEffort ?? null) !== defaultEffort ||
    (value.effortParam ?? null) !== effortParam;

  return {
    model: {
      id: typeof value.id === 'string' && value.id ? value.id : nanoid(),
      modelId: typeof value.modelId === 'string' ? value.modelId : '',
      displayName: typeof value.displayName === 'string' ? value.displayName : '',
      supportsVision: Boolean(value.supportsVision),
      supportsTools: Boolean(value.supportsTools),
      contextWindow:
        typeof value.contextWindow === 'number' && Number.isFinite(value.contextWindow)
          ? value.contextWindow
          : 128000,
      maxOutputTokens:
        typeof value.maxOutputTokens === 'number' && Number.isFinite(value.maxOutputTokens)
          ? value.maxOutputTokens
          : 4096,
      efforts,
      defaultEffort,
      effortParam,
    },
    changed,
  };
}

function normalizeProviderConfig(raw: unknown): { provider: ApiProvider; changed: boolean } {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<ApiProvider>;
  let changed = false;
  const models: ModelConfig[] = [];

  if (Array.isArray(value.models)) {
    for (const rawModel of value.models) {
      const normalized = normalizeModelConfig(rawModel);
      if (normalized.changed) changed = true;
      models.push(normalized.model);
    }
  }

  const sessionMode: ProviderSessionMode | undefined =
    value.sessionMode === 'auto' ||
    value.sessionMode === 'opencode' ||
    value.sessionMode === 'standard'
      ? value.sessionMode
      : undefined;
  if ((value.sessionMode ?? undefined) !== sessionMode) changed = true;

  return {
    provider: {
      id: typeof value.id === 'string' && value.id ? value.id : nanoid(),
      name: typeof value.name === 'string' ? value.name : '',
      baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
      models,
      isActive: value.isActive !== false,
      createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
      sessionMode,
    },
    changed,
  };
}

function persistSettings(state: SettingsState): void {
  localStorage.setItem(
    'tenshillm-settings',
    JSON.stringify({
      providers: state.providers,
      activeProviderId: state.activeProviderId,
      activeModelId: state.activeModelId,
      mcpServers: state.mcpServers,
      searchConfig: state.searchConfig,
      agentSkills: state.agentSkills,
      defaultSystemPrompt: state.defaultSystemPrompt,
      fontSize: state.fontSize,
    })
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  providers: [],
  activeProviderId: null,
  activeModelId: null,
  mcpServers: [],
  searchConfig: DEFAULT_SEARCH_CONFIG,
  agentSkills: [],
  defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
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
  updateModelInProvider: (providerId, modelId, updates) =>
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId
          ? {
              ...p,
              // Normalize the merged model so effort defaults stay consistent
              // with the enabled levels even for partial updates.
              models: p.models.map((m) =>
                m.id === modelId ? normalizeModelConfig({ ...m, ...updates }).model : m
              ),
            }
          : p
      ),
    })),
  removeModelFromProvider: (providerId, modelId) =>
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === providerId
          ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
          : p
      ),
      activeModelId: s.activeModelId === modelId ? null : s.activeModelId,
    })),
  setMcpServers: (servers) => set({ mcpServers: servers }),
  addMcpServer: (server) => set((s) => ({ mcpServers: [...s.mcpServers, server] })),
  updateMcpServer: (id, updates) =>
    set((s) => ({
      mcpServers: s.mcpServers.map((srv) => (srv.id === id ? { ...srv, ...updates } : srv)),
    })),
  removeMcpServer: (id) =>
    set((s) => ({ mcpServers: s.mcpServers.filter((srv) => srv.id !== id) })),
  setSearchConfig: (config) => {
    set({ searchConfig: config });
    // Search controls update and persist together so a rapid toggle cannot
    // serialize the previous Zustand snapshot.
    persistSettings(get());
  },
  setAgentSkills: (skills) => set({ agentSkills: skills }),
  addAgentSkill: (skill) => set((s) => ({ agentSkills: [...s.agentSkills, skill] })),
  addAgentSkills: (skills) => set((s) => ({ agentSkills: [...s.agentSkills, ...skills] })),
  updateAgentSkill: (id, updates) =>
    set((s) => ({
      agentSkills: s.agentSkills.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk)),
    })),
  removeAgentSkill: (id) =>
    set((s) => ({ agentSkills: s.agentSkills.filter((sk) => sk.id !== id) })),
  setDefaultSystemPrompt: (prompt) => {
    set({ defaultSystemPrompt: prompt });
    persistSettings(get());
  },
  setFontSize: (size) => set({ fontSize: size }),
  resetSettings: () => {
    localStorage.removeItem('tenshillm-settings');
    set({
      providers: [],
      activeProviderId: null,
      activeModelId: null,
      mcpServers: [],
      searchConfig: { ...DEFAULT_SEARCH_CONFIG },
      agentSkills: [],
      defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
      fontSize: 14,
    });
  },
  loadSettings: () => {
    try {
      const raw = localStorage.getItem('tenshillm-settings');
      if (raw) {
        const data = JSON.parse(raw);
        const rawSearchConfig =
          data.searchConfig && typeof data.searchConfig === 'object'
            ? (data.searchConfig as Partial<SearchConfig>)
            : undefined;
        const searchConfig = normalizeSearchConfig(rawSearchConfig);
        const searchConfigMigrated =
          rawSearchConfig?.provider === 'tavily' &&
          !(typeof rawSearchConfig.apiKey === 'string' && rawSearchConfig.apiKey.trim());
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
        let providersMigrated = false;
        const providers = Array.isArray(data.providers)
          ? data.providers.map((rawProvider: unknown) => {
              const normalized = normalizeProviderConfig(rawProvider);
              if (normalized.changed) providersMigrated = true;
              return normalized.provider;
            })
          : [];
        set({ ...data, providers, searchConfig, mcpServers });
        if (searchConfigMigrated || providersMigrated) persistSettings(get());
      }
    } catch {
      // ignore
    }
  },
  saveSettings: () => {
    persistSettings(get());
  },
}));
