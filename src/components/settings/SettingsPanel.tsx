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

  // Provider form state
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Model form state
  const [showModelForm, setShowModelForm] = useState<string | null>(null);
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelVision, setModelVision] = useState(false);
  const [modelTools, setModelTools] = useState(false);
  const [modelContext, setModelContext] = useState('128000');
  const [modelMaxOutput, setModelMaxOutput] = useState('4096');

  // MCP form state
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpHeaders, setMcpHeaders] = useState('');

  // Skill form state
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

  const tabs = [
    { id: 'providers' as const, label: 'Providers', icon: Server },
    { id: 'themes' as const, label: 'Themes', icon: Palette },
    { id: 'mcp' as const, label: 'MCP', icon: Plug },
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'skills' as const, label: 'Skills', icon: BookOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Settings</h2>
          <button
            onClick={() => {
              saveSettings();
              setSettingsOpen(false);
            }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Providers Tab */}
          {tab === 'providers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">API Providers</h3>
                <button
                  onClick={() => setShowProviderForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    bg-accent text-white text-sm hover:bg-accent-hover"
                >
                  <Plus size={14} /> Add Provider
                </button>
              </div>

              {showProviderForm && (
                <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                  <input
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Provider name (e.g. OpenRouter)"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <input
                    value={providerUrl}
                    onChange={(e) => setProviderUrl(e.target.value)}
                    placeholder="Base URL (e.g. https://openrouter.ai/api/v1)"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={providerKey}
                      onChange={(e) => setProviderKey(e.target.value)}
                      placeholder="API Key"
                      className="w-full px-3 py-2 pr-10 rounded-lg bg-bg border border-border
                        text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddProvider}
                      className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowProviderForm(false)}
                      className="px-4 py-2 rounded-lg bg-surface text-text-secondary text-sm hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {providers.length === 0 && !showProviderForm && (
                <p className="text-sm text-text-muted text-center py-4">
                  No providers configured. Add one to get started.
                </p>
              )}

              {providers.map((p) => (
                <div key={p.id} className="p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-text">{p.name}</h4>
                        <button
                          onClick={() => {
                            setActiveProvider(p.id);
                            if (p.models.length > 0) setActiveModel(p.models[0].id);
                            saveSettings();
                          }}
                          className={`px-2 py-0.5 rounded text-xs ${
                            activeProviderId === p.id
                              ? 'bg-accent text-white'
                              : 'bg-bg border border-border text-text-muted hover:text-text'
                          }`}
                        >
                          {activeProviderId === p.id ? 'Active' : 'Set Active'}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{p.baseUrl}</p>
                    </div>
                    <button
                      onClick={() => {
                        removeProvider(p.id);
                        saveSettings();
                      }}
                      className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Models */}
                  <div className="space-y-2">
                    {p.models.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Cpu size={14} className="text-text-muted shrink-0" />
                          <span className="text-sm text-text truncate">{m.displayName}</span>
                          <span className="text-xs text-text-muted">{m.modelId}</span>
                          {activeProviderId === p.id && activeModelId === m.id && (
                            <span className="px-1.5 py-0.5 rounded bg-accent text-white text-xs">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {m.supportsVision && (
                            <span className="px-1.5 py-0.5 rounded bg-accent-muted text-accent text-xs">Vision</span>
                          )}
                          {m.supportsTools && (
                            <span className="px-1.5 py-0.5 rounded bg-success/20 text-success text-xs">Tools</span>
                          )}
                          <button
                            onClick={() => {
                              setActiveModel(m.id);
                              setActiveProvider(p.id);
                              saveSettings();
                            }}
                            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-accent"
                            title="Set as active model"
                          >
                            <Cpu size={14} />
                          </button>
                          <button
                            onClick={() => {
                              removeModelFromProvider(p.id, m.id);
                              saveSettings();
                            }}
                            className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {showModelForm === p.id ? (
                      <div className="p-3 rounded-lg bg-bg border border-border space-y-2">
                        <input
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                          placeholder="Model ID (e.g. gpt-4o)"
                          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border
                            text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <input
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          placeholder="Display name (e.g. GPT-4o)"
                          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border
                            text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={modelVision}
                              onChange={(e) => setModelVision(e.target.checked)}
                              className="rounded"
                            />
                            Vision
                          </label>
                          <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                              type="checkbox"
                              checked={modelTools}
                              onChange={(e) => setModelTools(e.target.checked)}
                              className="rounded"
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
                            className="w-1/2 px-3 py-1.5 rounded-lg bg-surface border border-border
                              text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                          />
                          <input
                            value={modelMaxOutput}
                            onChange={(e) => setModelMaxOutput(e.target.value)}
                            placeholder="Max output tokens"
                            type="number"
                            className="w-1/2 px-3 py-1.5 rounded-lg bg-surface border border-border
                              text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddModel(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setShowModelForm(null)}
                            className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowModelForm(p.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2
                          rounded-lg border border-dashed border-border text-text-muted
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

          {/* Themes Tab */}
          {tab === 'themes' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text mb-3">Theme</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      saveSettings();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      theme === t.id
                        ? 'border-accent ring-2 ring-accent/30'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded-full border border-white/20"
                        style={{ backgroundColor: t.bgPreview }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-white/20"
                        style={{ backgroundColor: t.accentPreview }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">{t.name}</p>
                      <p className="text-xs text-text-muted">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MCP Tab */}
          {tab === 'mcp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">MCP Servers (Remote)</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Connect to remote MCP servers via Streamable HTTP
                  </p>
                </div>
                <button
                  onClick={() => setShowMcpForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    bg-accent text-white text-sm hover:bg-accent-hover"
                >
                  <Plus size={14} /> Add Server
                </button>
              </div>

              {showMcpForm && (
                <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                  <input
                    value={mcpName}
                    onChange={(e) => setMcpName(e.target.value)}
                    placeholder="Server name"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <input
                    value={mcpUrl}
                    onChange={(e) => setMcpUrl(e.target.value)}
                    placeholder="Server URL (e.g. https://mcp.example.com/mcp)"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <textarea
                    value={mcpHeaders}
                    onChange={(e) => setMcpHeaders(e.target.value)}
                    placeholder='Headers JSON (e.g. {"Authorization": "Bearer token"})'
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddMcp}
                      className="px-4 py-2 rounded-lg bg-accent text-white text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowMcpForm(false)}
                      className="px-4 py-2 rounded-lg bg-surface text-text-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {mcpServers.length === 0 && !showMcpForm && (
                <p className="text-sm text-text-muted text-center py-4">
                  No MCP servers configured.
                </p>
              )}

              {mcpServers.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-xl bg-surface border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          srv.connected ? 'bg-success' : srv.isEnabled ? 'bg-warning' : 'bg-text-muted'
                        }`}
                      />
                      <h4 className="text-sm font-semibold text-text">{srv.name}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          updateMcpServer(srv.id, { isEnabled: !srv.isEnabled });
                          saveSettings();
                        }}
                        className={`px-2 py-0.5 rounded text-xs ${
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
                        className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{srv.url}</p>
                  {srv.tools.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {srv.tools.map((tool) => (
                        <span
                          key={tool.name}
                          className="px-2 py-0.5 rounded bg-accent-muted text-accent text-xs"
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

          {/* Search Tab */}
          {tab === 'search' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text">Web Search</h3>

              <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                <span className="text-sm text-text">Enable web search</span>
                <button
                  onClick={() => {
                    setSearchConfig({ ...searchConfig, enabled: !searchConfig.enabled });
                    saveSettings();
                  }}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    searchConfig.enabled ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                      searchConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <div>
                <label className="text-sm text-text-secondary block mb-1.5">Provider</label>
                <select
                  value={searchConfig.provider}
                  onChange={(e) => {
                    setSearchConfig({
                      ...searchConfig,
                      provider: e.target.value as SearchConfig['provider'],
                    });
                    saveSettings();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border
                    text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="tavily">Tavily (Recommended)</option>
                  <option value="serpapi">SerpAPI</option>
                  <option value="brave">Brave Search</option>
                  <option value="duckduckgo">DuckDuckGo (No API key)</option>
                </select>
              </div>

              {searchConfig.provider !== 'duckduckgo' && (
                <div>
                  <label className="text-sm text-text-secondary block mb-1.5">API Key</label>
                  <input
                    type="password"
                    value={searchConfig.apiKey}
                    onChange={(e) => {
                      setSearchConfig({ ...searchConfig, apiKey: e.target.value });
                      saveSettings();
                    }}
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-text-secondary block mb-1.5">
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

          {/* Skills Tab */}
          {tab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">Agent Skills</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Markdown files that expand model capabilities
                  </p>
                </div>
                <button
                  onClick={() => setShowSkillForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    bg-accent text-white text-sm hover:bg-accent-hover"
                >
                  <Plus size={14} /> Add Skill
                </button>
              </div>

              {showSkillForm && (
                <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                  <input
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="Skill name"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <input
                    value={skillDesc}
                    onChange={(e) => setSkillDesc(e.target.value)}
                    placeholder="Short description"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <textarea
                    value={skillContent}
                    onChange={(e) => setSkillContent(e.target.value)}
                    placeholder="Skill content (Markdown). This will be injected into the system prompt."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border
                      text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2 rounded-lg bg-accent text-white text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSkillForm(false)}
                      className="px-4 py-2 rounded-lg bg-surface text-text-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {agentSkills.length === 0 && !showSkillForm && (
                <p className="text-sm text-text-muted text-center py-4">
                  No agent skills configured.
                </p>
              )}

              {agentSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-4 rounded-xl bg-surface border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-text">{skill.name}</h4>
                      {skill.description && (
                        <p className="text-xs text-text-muted mt-0.5">{skill.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          updateAgentSkill(skill.id, { isEnabled: !skill.isEnabled });
                          saveSettings();
                        }}
                        className={`px-2 py-0.5 rounded text-xs ${
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
                        className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <pre className="mt-2 text-xs text-text-muted bg-bg rounded-lg p-2 max-h-24 overflow-auto">
                    {skill.content.slice(0, 200)}{skill.content.length > 200 ? '...' : ''}
                  </pre>
                </div>
              ))}

              {/* Default System Prompt */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-text mb-2">Default System Prompt</h3>
                <textarea
                  value={defaultSystemPrompt}
                  onChange={(e) => {
                    setDefaultSystemPrompt(e.target.value);
                    saveSettings();
                  }}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border
                    text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex justify-end">
          <button
            onClick={() => {
              saveSettings();
              setSettingsOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-accent text-white text-sm hover:bg-accent-hover"
          >
            <Save size={16} /> Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Need to import SearchConfig type for the select handler

