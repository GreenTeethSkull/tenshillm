import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useThemeStore } from '../../stores/themeStore';
import { THEMES } from '../../types';
import type { ApiProvider, ModelConfig, McpServer, SearchConfig } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Palette,
  Server,
  Cpu,
  Search,
  BookOpen,
  Save,
  Eye,
  EyeOff,
  Plug,
} from 'lucide-react';
import { nanoid } from 'nanoid';

export function SettingsPanel() {
  const { setSettingsOpen } = useChatStore();
  const {
    providers,
    addProvider,
    removeProvider,
    activeProviderId,
    activeModelId,
    setActiveProvider,
    setActiveModel,
    addModelToProvider,
    removeModelFromProvider,
    mcpServers,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
    searchConfig,
    setSearchConfig,
    agentSkills,
    addAgentSkill,
    updateAgentSkill,
    removeAgentSkill,
    defaultSystemPrompt,
    setDefaultSystemPrompt,
    saveSettings,
  } = useSettingsStore();

  const { theme, setTheme } = useThemeStore();

  const [tab, setTab] = useState<'providers' | 'themes' | 'mcp' | 'search' | 'skills'>('providers');

  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [showModelForm, setShowModelForm] = useState<string | null>(null);
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelVision, setModelVision] = useState(false);
  const [modelTools, setModelTools] = useState(false);
  const [modelContext, setModelContext] = useState('128000');
  const [modelMaxOutput, setModelMaxOutput] = useState('4096');

  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpHeaders, setMcpHeaders] = useState('');

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillContent, setSkillContent] = useState('');

  const handleAddProvider = () => {
    if (!providerName || !providerUrl) return;
    const provider: ApiProvider = {
      id: nanoid(),
      name: providerName,
      baseUrl: providerUrl.replace(/\/+$/, ''),
      apiKey: providerKey,
      models: [],
      isActive: true,
      createdAt: Date.now(),
    };
    addProvider(provider);
    setProviderName('');
    setProviderUrl('');
    setProviderKey('');
    setShowProviderForm(false);
    saveSettings();
  };

  const handleAddModel = (providerId: string) => {
    if (!modelId || !modelName) return;
    const model: ModelConfig = {
      id: nanoid(),
      modelId,
      displayName: modelName,
      supportsVision: modelVision,
      supportsTools: modelTools,
      contextWindow: parseInt(modelContext) || 128000,
      maxOutputTokens: parseInt(modelMaxOutput) || 4096,
    };
    addModelToProvider(providerId, model);
    setModelId('');
    setModelName('');
    setModelVision(false);
    setModelTools(false);
    setShowModelForm(null);
    saveSettings();
  };

  const handleAddMcp = () => {
    if (!mcpName || !mcpUrl) return;
    let headers: Record<string, string> = {};
    try {
      if (mcpHeaders.trim()) headers = JSON.parse(mcpHeaders);
    } catch {}
    const server: McpServer = {
      id: nanoid(),
      name: mcpName,
      url: mcpUrl,
      transport: 'streamable-http',
      headers,
      isEnabled: true,
      tools: [],
      connected: false,
    };
    addMcpServer(server);
    setMcpName('');
    setMcpUrl('');
    setMcpHeaders('');
    setShowMcpForm(false);
    saveSettings();
  };

  const handleAddSkill = () => {
    if (!skillName || !skillContent) return;
    addAgentSkill({
      id: nanoid(),
      name: skillName,
      description: skillDesc,
      content: skillContent,
      filePath: '',
      isEnabled: true,
      createdAt: Date.now(),
    });
    setSkillName('');
    setSkillDesc('');
    setSkillContent('');
    setShowSkillForm(false);
    saveSettings();
  };

  const handleClose = () => {
    saveSettings();
    setSettingsOpen(false);
  };

  const tabs = [
    { id: 'providers' as const, label: 'Providers', icon: Server },
    { id: 'themes' as const, label: 'Themes', icon: Palette },
    { id: 'mcp' as const, label: 'MCP', icon: Plug },
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'skills' as const, label: 'Skills', icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-bg border-border flex flex-col shadow-2xl
          w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl sm:border sm:mx-4"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border"
          style={{ paddingTop: 'max(16px, var(--safe-top))' }}
        >
          <h2 className="text-lg font-semibold text-text">Settings</h2>
          <button
            onClick={handleClose}
            className="p-2 -mr-1 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {tab === 'providers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">API Providers</h3>
                <button
                  onClick={() => setShowProviderForm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                    bg-accent text-white text-sm hover:bg-accent-hover active:scale-[0.98] transition-all"
                >
                  <Plus size={14} /> Add Provider
                </button>
              </div>

              {showProviderForm && (
                <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <input
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Provider name (e.g. OpenRouter)"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <input
                    value={providerUrl}
                    onChange={(e) => setProviderUrl(e.target.value)}
                    placeholder="Base URL (e.g. https://openrouter.ai/api/v1)"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={providerKey}
                      onChange={(e) => setProviderKey(e.target.value)}
                      placeholder="API Key"
                      className="w-full px-4 py-2.5 pr-12 rounded-xl bg-bg border border-border
                        text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleAddProvider}
                      className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm hover:bg-accent-hover"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowProviderForm(false)}
                      className="px-4 py-2.5 rounded-xl bg-bg border border-border text-text-secondary text-sm hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {providers.length === 0 && !showProviderForm && (
                <p className="text-sm text-text-muted text-center py-8">
                  No providers configured. Add one to get started.
                </p>
              )}

              {providers.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 rounded-2xl bg-surface border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-text">{p.name}</h4>
                        <button
                          onClick={() => {
                            setActiveProvider(p.id);
                            if (p.models.length > 0) setActiveModel(p.models[0].id);
                            saveSettings();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            activeProviderId === p.id
                              ? 'bg-accent text-white'
                              : 'bg-bg border border-border text-text-muted hover:text-text'
                          }`}
                        >
                          {activeProviderId === p.id ? 'Active' : 'Set Active'}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-1 truncate">{p.baseUrl}</p>
                    </div>
                    <button
                      onClick={() => {
                        removeProvider(p.id);
                        saveSettings();
                      }}
                      className="p-2 rounded-xl hover:bg-error/10 text-text-muted hover:text-error shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {p.models.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <Cpu size={14} className="text-text-muted shrink-0" />
                          <span className="text-sm text-text truncate">{m.displayName}</span>
                          <span className="text-xs text-text-muted hidden sm:inline">{m.modelId}</span>
                          {activeProviderId === p.id && activeModelId === m.id && (
                            <span className="px-1.5 py-0.5 rounded-md bg-accent text-white text-xs font-medium shrink-0">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.supportsVision && (
                            <span className="px-1.5 py-0.5 rounded-md bg-accent-muted text-accent text-xs hidden sm:inline">Vision</span>
                          )}
                          {m.supportsTools && (
                            <span className="px-1.5 py-0.5 rounded-md bg-success/20 text-success text-xs hidden sm:inline">Tools</span>
                          )}
                          <button
                            onClick={() => {
                              setActiveModel(m.id);
                              setActiveProvider(p.id);
                              saveSettings();
                            }}
                            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-accent"
                            title="Set as active model"
                          >
                            <Cpu size={14} />
                          </button>
                          <button
                            onClick={() => {
                              removeModelFromProvider(p.id, m.id);
                              saveSettings();
                            }}
                            className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {showModelForm === p.id ? (
                      <div className="p-4 rounded-xl bg-bg border border-border space-y-3">
                        <input
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                          placeholder="Model ID (e.g. gpt-4o)"
                          className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border
                            text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                        <input
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="Display name (e.g. GPT-4o)"
                          className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border
                            text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                        <div className="flex gap-5">
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={modelVision}
                              onChange={(e) => setModelVision(e.target.checked)}
                              className="rounded w-4 h-4"
                            />
                            Vision
                          </label>
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={modelTools}
                              onChange={(e) => setModelTools(e.target.checked)}
                              className="rounded w-4 h-4"
                            />
                            Tools
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={modelContext}
                            onChange={(e) => setModelContext(e.target.value)}
                            placeholder="Context window"
                            type="number"
                            className="w-1/2 px-4 py-2.5 rounded-xl bg-surface border border-border
                              text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                          />
                          <input
                            value={modelMaxOutput}
                            onChange={(e) => setModelMaxOutput(e.target.value)}
                            placeholder="Max output tokens"
                            type="number"
                            className="w-1/2 px-4 py-2.5 rounded-xl bg-surface border border-border
                              text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleAddModel(p.id)}
                            className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setShowModelForm(null)}
                            className="px-4 py-2.5 rounded-xl bg-surface border border-border text-text-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowModelForm(p.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-3
                          rounded-xl border border-dashed border-border text-text-muted
                          text-sm hover:border-accent hover:text-accent transition-colors"
                      >
                        <Plus size={14} /> Add Model
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'themes' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text">Theme</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      saveSettings();
                    }}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left ${
                      theme === t.id
                        ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
                        : 'border-border hover:border-accent/40 bg-surface'
                    }`}
                  >
                    <div className="flex gap-1.5 shrink-0">
                      <div
                        className="w-7 h-7 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: t.bgPreview }}
                      />
                      <div
                        className="w-7 h-7 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: t.accentPreview }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{t.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'mcp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">MCP Servers (Remote)</h3>
                  <p className="text-xs text-text-muted mt-1">
                    Connect to remote MCP servers via Streamable HTTP
                  </p>
                </div>
                <button
                  onClick={() => setShowMcpForm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                    bg-accent text-white text-sm hover:bg-accent-hover active:scale-[0.98] transition-all"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {showMcpForm && (
                <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <input
                    value={mcpName}
                    onChange={(e) => setMcpName(e.target.value)}
                    placeholder="Server name"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <input
                    value={mcpUrl}
                    onChange={(e) => setMcpUrl(e.target.value)}
                    placeholder="Server URL (e.g. https://mcp.example.com/mcp)"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <textarea
                    value={mcpHeaders}
                    onChange={(e) => setMcpHeaders(e.target.value)}
                    placeholder='Headers JSON (e.g. {"Authorization": "Bearer token"})'
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none font-mono"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleAddMcp}
                      className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowMcpForm(false)}
                      className="px-4 py-2.5 rounded-xl bg-bg border border-border text-text-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {mcpServers.length === 0 && !showMcpForm && (
                <p className="text-sm text-text-muted text-center py-8">
                  No MCP servers configured.
                </p>
              )}

              {mcpServers.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 sm:p-5 rounded-2xl bg-surface border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          srv.connected ? 'bg-success' : srv.isEnabled ? 'bg-warning' : 'bg-text-muted'
                        }`}
                      />
                      <h4 className="text-sm font-semibold text-text truncate">{srv.name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          updateMcpServer(srv.id, { isEnabled: !srv.isEnabled });
                          saveSettings();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          srv.isEnabled
                            ? 'bg-success/20 text-success'
                            : 'bg-bg border border-border text-text-muted'
                        }`}
                      >
                        {srv.isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => {
                          removeMcpServer(srv.id);
                          saveSettings();
                        }}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1.5 truncate">{srv.url}</p>
                  {srv.tools.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {srv.tools.map((tool) => (
                        <span
                          key={tool.name}
                          className="px-2 py-0.5 rounded-md bg-accent-muted text-accent text-xs"
                        >
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'search' && (
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-text">Web Search</h3>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
                <span className="text-sm text-text">Enable web search</span>
                <button
                  onClick={() => {
                    setSearchConfig({ ...searchConfig, enabled: !searchConfig.enabled });
                    saveSettings();
                  }}
                  className={`w-11 h-7 rounded-full transition-colors relative ${
                    searchConfig.enabled ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-1 ${
                      searchConfig.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <div>
                <label className="text-sm text-text-secondary block mb-2">Provider</label>
                <select
                  value={searchConfig.provider}
                  onChange={(e) => {
                    setSearchConfig({
                      ...searchConfig,
                      provider: e.target.value as SearchConfig['provider'],
                    });
                    saveSettings();
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border
                    text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="tavily">Tavily (Recommended)</option>
                  <option value="serpapi">SerpAPI</option>
                  <option value="brave">Brave Search</option>
                  <option value="duckduckgo">DuckDuckGo (No API key)</option>
                </select>
              </div>

              {searchConfig.provider !== 'duckduckgo' && (
                <div>
                  <label className="text-sm text-text-secondary block mb-2">API Key</label>
                  <input
                    type="password"
                    value={searchConfig.apiKey}
                    onChange={(e) => {
                      setSearchConfig({ ...searchConfig, apiKey: e.target.value });
                      saveSettings();
                    }}
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-text-secondary block mb-2">
                  Max results: {searchConfig.maxResults}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={searchConfig.maxResults}
                  onChange={(e) => {
                    setSearchConfig({ ...searchConfig, maxResults: parseInt(e.target.value) });
                    saveSettings();
                  }}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">Agent Skills</h3>
                  <p className="text-xs text-text-muted mt-1">
                    Markdown files that expand model capabilities
                  </p>
                </div>
                <button
                  onClick={() => setShowSkillForm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                    bg-accent text-white text-sm hover:bg-accent-hover active:scale-[0.98] transition-all"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {showSkillForm && (
                <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <input
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="Skill name"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <input
                    value={skillDesc}
                    onChange={(e) => setSkillDesc(e.target.value)}
                    placeholder="Short description"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <textarea
                    value={skillContent}
                    onChange={(e) => setSkillContent(e.target.value)}
                    placeholder="Skill content (Markdown). This will be injected into the system prompt."
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none font-mono"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSkillForm(false)}
                      className="px-4 py-2.5 rounded-xl bg-bg border border-border text-text-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {agentSkills.length === 0 && !showSkillForm && (
                <p className="text-sm text-text-muted text-center py-8">
                  No agent skills configured.
                </p>
              )}

              {agentSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-4 sm:p-5 rounded-2xl bg-surface border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <h4 className="text-sm font-semibold text-text">{skill.name}</h4>
                      {skill.description && (
                        <p className="text-xs text-text-muted mt-0.5">{skill.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          updateAgentSkill(skill.id, { isEnabled: !skill.isEnabled });
                          saveSettings();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          skill.isEnabled
                            ? 'bg-accent-muted text-accent'
                            : 'bg-bg border border-border text-text-muted'
                        }`}
                      >
                        {skill.isEnabled ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => {
                          removeAgentSkill(skill.id);
                          saveSettings();
                        }}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <pre className="mt-3 text-xs text-text-muted bg-bg rounded-xl p-3 max-h-24 overflow-auto leading-relaxed">
                    {skill.content.slice(0, 200)}{skill.content.length > 200 ? '...' : ''}
                  </pre>
                </div>
              ))}

              <div className="pt-5 border-t border-border">
                <h3 className="text-sm font-semibold text-text mb-3">Default System Prompt</h3>
                <textarea
                  value={defaultSystemPrompt}
                  onChange={(e) => {
                    setDefaultSystemPrompt(e.target.value);
                    saveSettings();
                  }}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border
                    text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 sm:px-6 py-3.5 border-t border-border flex justify-end"
          style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}
        >
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-accent text-white text-sm font-medium hover:bg-accent-hover active:scale-[0.98] transition-all"
          >
            <Save size={16} /> Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
