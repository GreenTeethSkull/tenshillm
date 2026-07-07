import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import { THEMES } from '@/types';
import type { ApiProvider, ModelConfig, McpServer, SearchConfig } from '@/types';
import {
  Plus,
  Trash2,
  Palette,
  Server,
  Cpu,
  Search as SearchIcon,
  BookOpen,
  Eye,
  EyeOff,
  Plug,
  Save,
  X,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { Tabs, ScrollShadow, Separator } from '@heroui/react';
import { Drawer } from '@/components/Overlay';
import {
  Toggle,
  TextInput,
  TextAreaInput,
  SelectInput,
  RangeInput,
  CheckBox,
  Field,
  PrimaryButton,
  GhostButton,
  IconGhostButton,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

type TabId = 'providers' | 'themes' | 'mcp' | 'search' | 'skills';

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

  const [tab, setTab] = useState<TabId>('providers');

  // Provider form
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [providerUrl, setProviderUrl] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Model form
  const [showModelForm, setShowModelForm] = useState<string | null>(null);
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelVision, setModelVision] = useState(false);
  const [modelTools, setModelTools] = useState(false);
  const [modelContext, setModelContext] = useState('128000');
  const [modelMaxOutput, setModelMaxOutput] = useState('4096');

  // MCP form
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpHeaders, setMcpHeaders] = useState('');

  // Skill form
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
    toast.success('Provider added');
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
    toast.success('Model added');
  };

  const handleAddMcp = () => {
    if (!mcpName || !mcpUrl) return;
    let headers: Record<string, string> = {};
    try {
      if (mcpHeaders.trim()) headers = JSON.parse(mcpHeaders);
    } catch {
      toast.error('Headers JSON is invalid');
      return;
    }
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
    toast.success('MCP server added');
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
    toast.success('Skill added');
  };

  const handleClose = () => {
    saveSettings();
    setSettingsOpen(false);
  };

  const tabs: { id: TabId; label: string; icon: typeof Server }[] = [
    { id: 'providers', label: 'Providers', icon: Server },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'mcp', label: 'MCP', icon: Plug },
    { id: 'search', label: 'Search', icon: SearchIcon },
    { id: 'skills', label: 'Skills', icon: BookOpen },
  ];

  return (
    <Drawer onClose={handleClose} label="Settings" width="max-w-2xl">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-5 border-b border-border"
        style={{ paddingTop: 'max(20px, var(--safe-top))' }}
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure providers, themes, MCP servers, search and agent skills.
          </p>
        </div>
        <IconGhostButton onClick={handleClose} ariaLabel="Close settings">
          <X size={18} />
        </IconGhostButton>
      </header>

      <Tabs
        selectedKey={tab}
        onSelectionChange={(k) => setTab(k as TabId)}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-6 pt-4 pb-3 border-b border-border">
          <Tabs.ListContainer>
            <Tabs.List className="flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <Tabs.Tab
                  key={t.id}
                  id={t.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                    'data-[selected]:bg-primary data-[selected]:text-primary-foreground',
                    'text-muted-foreground hover:bg-muted-bg hover:text-foreground'
                  )}
                >
                  <t.icon size={15} aria-hidden="true" />
                  {t.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </div>

        <ScrollShadow className="flex-1 overflow-y-auto" orientation="vertical" size={8}>
          <div className="px-6 py-6">
            {/* ===== Providers ===== */}
            <Tabs.Panel id="providers" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">API Providers</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add OpenAI-compatible endpoints and their models
                  </p>
                </div>
                <PrimaryButton onClick={() => setShowProviderForm(true)}>
                  <Plus size={15} />
                  Add Provider
                </PrimaryButton>
              </div>

              {showProviderForm && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <Field label="Provider name" htmlFor="prov-name">
                    <TextInput
                      id="prov-name"
                      value={providerName}
                      onChange={setProviderName}
                      placeholder="e.g. OpenRouter"
                    />
                  </Field>
                  <Field label="Base URL" htmlFor="prov-url">
                    <TextInput
                      id="prov-url"
                      value={providerUrl}
                      onChange={setProviderUrl}
                      placeholder="https://openrouter.ai/api/v1"
                    />
                  </Field>
                  <Field label="API Key" htmlFor="prov-key">
                    <div className="relative">
                      <TextInput
                        id="prov-key"
                        type={showKey ? 'text' : 'password'}
                        value={providerKey}
                        onChange={setProviderKey}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-bg transition-colors"
                        aria-label={showKey ? 'Hide key' : 'Show key'}
                      >
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  <div className="flex gap-2 pt-1">
                    <PrimaryButton onClick={handleAddProvider}>Save</PrimaryButton>
                    <GhostButton onClick={() => setShowProviderForm(false)}>Cancel</GhostButton>
                  </div>
                </div>
              )}

              {providers.length === 0 && !showProviderForm && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No providers configured. Add one to get started.
                </p>
              )}

              {providers.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold">{p.name}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProvider(p.id);
                            if (p.models.length > 0) setActiveModel(p.models[0].id);
                            saveSettings();
                          }}
                          className={cn(
                            'h-6 px-2 rounded-md text-[11px] font-medium transition-colors',
                            activeProviderId === p.id
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border hover:bg-muted-bg'
                          )}
                        >
                          {activeProviderId === p.id ? 'Active' : 'Set Active'}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{p.baseUrl}</p>
                    </div>
                    <IconGhostButton
                      onClick={() => {
                        removeProvider(p.id);
                        saveSettings();
                      }}
                      ariaLabel={`Delete ${p.name}`}
                      className="hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </IconGhostButton>
                  </div>

                  <div className="space-y-2">
                    {p.models.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-muted-bg/60 border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Cpu size={14} className="shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{m.displayName}</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {m.modelId}
                          </span>
                          {activeProviderId === p.id && activeModelId === m.id && (
                            <span className="shrink-0 h-5 px-1.5 rounded text-[10px] font-medium bg-primary text-primary-foreground grid place-items-center">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.supportsVision && (
                            <span className="hidden sm:inline-flex h-5 px-1.5 rounded text-[10px] font-medium bg-muted-bg border border-border text-muted-foreground items-center">
                              Vision
                            </span>
                          )}
                          {m.supportsTools && (
                            <span className="hidden sm:inline-flex h-5 px-1.5 rounded text-[10px] font-medium bg-success/15 text-success border border-success/20 items-center">
                              Tools
                            </span>
                          )}
                          <IconGhostButton
                            onClick={() => {
                              setActiveModel(m.id);
                              setActiveProvider(p.id);
                              saveSettings();
                            }}
                            ariaLabel={`Set ${m.displayName} active`}
                            title="Set as active model"
                            className="hover:text-primary size-7"
                          >
                            <Cpu size={14} />
                          </IconGhostButton>
                          <IconGhostButton
                            onClick={() => {
                              removeModelFromProvider(p.id, m.id);
                              saveSettings();
                            }}
                            ariaLabel={`Delete ${m.displayName}`}
                            className="hover:text-destructive size-7"
                          >
                            <Trash2 size={14} />
                          </IconGhostButton>
                        </div>
                      </div>
                    ))}

                    {showModelForm === p.id ? (
                      <div className="rounded-xl bg-muted-bg/40 border border-border p-4 space-y-3">
                        <Field label="Model ID" htmlFor="mod-id">
                          <TextInput
                            id="mod-id"
                            value={modelId}
                            onChange={setModelId}
                            placeholder="gpt-4o"
                          />
                        </Field>
                        <Field label="Display name" htmlFor="mod-name">
                          <TextInput
                            id="mod-name"
                            value={modelName}
                            onChange={setModelName}
                            placeholder="GPT-4o"
                          />
                        </Field>
                        <div className="flex gap-5">
                          <CheckBox
                            id="mod-vision"
                            label="Vision"
                            checked={modelVision}
                            onChange={setModelVision}
                          />
                          <CheckBox
                            id="mod-tools"
                            label="Tools"
                            checked={modelTools}
                            onChange={setModelTools}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Context window" htmlFor="mod-ctx">
                            <TextInput
                              id="mod-ctx"
                              type="number"
                              value={modelContext}
                              onChange={setModelContext}
                            />
                          </Field>
                          <Field label="Max output tokens" htmlFor="mod-out">
                            <TextInput
                              id="mod-out"
                              type="number"
                              value={modelMaxOutput}
                              onChange={setModelMaxOutput}
                            />
                          </Field>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <PrimaryButton onClick={() => handleAddModel(p.id)}>Add</PrimaryButton>
                          <GhostButton onClick={() => setShowModelForm(null)}>Cancel</GhostButton>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowModelForm(p.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus size={14} /> Add Model
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Tabs.Panel>

            {/* ===== Themes ===== */}
            <Tabs.Panel id="themes" className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Theme</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dracula is the default. Tap to switch.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={theme === t.id}
                    aria-label={`Theme ${t.name}`}
                    onClick={() => {
                      setTheme(t.id);
                      saveSettings();
                    }}
                    className={cn(
                      'flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 active:scale-[0.98]',
                      theme === t.id
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                        : 'border-border hover:border-primary/40 bg-card hover:bg-muted-bg'
                    )}
                  >
                    <div className="flex gap-1.5 shrink-0">
                      <div
                        className="size-7 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: t.bgPreview }}
                      />
                      <div
                        className="size-7 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: t.accentPreview }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.name}</p>
                        {t.id === 'dracula' && (
                          <span className="text-[10px] h-4 px-1 rounded bg-muted-bg border border-border text-muted-foreground grid place-items-center">
                            default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Tabs.Panel>

            {/* ===== MCP ===== */}
            <Tabs.Panel id="mcp" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">MCP Servers (Remote)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Streamable HTTP transport — mobile compatible
                  </p>
                </div>
                <PrimaryButton onClick={() => setShowMcpForm(true)}>
                  <Plus size={15} />
                  Add
                </PrimaryButton>
              </div>

              {showMcpForm && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <Field label="Server name" htmlFor="mcp-name">
                    <TextInput
                      id="mcp-name"
                      value={mcpName}
                      onChange={setMcpName}
                      placeholder="My MCP Server"
                    />
                  </Field>
                  <Field label="Server URL" htmlFor="mcp-url">
                    <TextInput
                      id="mcp-url"
                      value={mcpUrl}
                      onChange={setMcpUrl}
                      placeholder="https://mcp.example.com/mcp"
                    />
                  </Field>
                  <Field label="Headers JSON (optional)" htmlFor="mcp-headers">
                    <TextAreaInput
                      id="mcp-headers"
                      value={mcpHeaders}
                      onChange={setMcpHeaders}
                      placeholder='{"Authorization": "Bearer token"}'
                      rows={2}
                      mono
                    />
                  </Field>
                  <div className="flex gap-2 pt-1">
                    <PrimaryButton onClick={handleAddMcp}>Save</PrimaryButton>
                    <GhostButton onClick={() => setShowMcpForm(false)}>Cancel</GhostButton>
                  </div>
                </div>
              )}

              {mcpServers.length === 0 && !showMcpForm && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No MCP servers configured.
                </p>
              )}

              {mcpServers.map((srv) => (
                <div key={srv.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          'size-2.5 rounded-full shrink-0',
                          srv.connected
                            ? 'bg-success'
                            : srv.isEnabled
                              ? 'bg-warning'
                              : 'bg-muted-foreground'
                        )}
                      />
                      <h4 className="text-sm font-semibold truncate">{srv.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Toggle
                        checked={srv.isEnabled}
                        onChange={(v) => {
                          updateMcpServer(srv.id, { isEnabled: v });
                          saveSettings();
                        }}
                        label={`Toggle ${srv.name}`}
                      />
                      <IconGhostButton
                        onClick={() => {
                          removeMcpServer(srv.id);
                          saveSettings();
                        }}
                        ariaLabel={`Delete ${srv.name}`}
                        className="hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </IconGhostButton>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{srv.url}</p>
                  {srv.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {srv.tools.map((tool) => (
                        <span
                          key={tool.name}
                          className="h-5 px-1.5 rounded text-[10px] font-medium bg-muted-bg border border-border text-muted-foreground inline-flex items-center"
                        >
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Tabs.Panel>

            {/* ===== Search ===== */}
            <Tabs.Panel id="search" className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold">Web Search</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inject a web_search tool into the model
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                <label htmlFor="search-enabled" className="text-sm">
                  Enable web search
                </label>
                <Toggle
                  id="search-enabled"
                  checked={searchConfig.enabled}
                  onChange={(v) => {
                    setSearchConfig({ ...searchConfig, enabled: v });
                    saveSettings();
                  }}
                  label="Enable web search"
                />
              </div>

              <Field label="Provider" htmlFor="search-prov">
                <SelectInput
                  id="search-prov"
                  value={searchConfig.provider}
                  onChange={(v) => {
                    setSearchConfig({
                      ...searchConfig,
                      provider: v as SearchConfig['provider'],
                    });
                    saveSettings();
                  }}
                >
                  <option value="tavily">Tavily (Recommended)</option>
                  <option value="serpapi">SerpAPI</option>
                  <option value="brave">Brave Search</option>
                  <option value="duckduckgo">DuckDuckGo (No key)</option>
                </SelectInput>
              </Field>

              {searchConfig.provider !== 'duckduckgo' && (
                <Field label="API Key" htmlFor="search-key">
                  <TextInput
                    id="search-key"
                    type="password"
                    value={searchConfig.apiKey}
                    onChange={(v) => {
                      setSearchConfig({ ...searchConfig, apiKey: v });
                      saveSettings();
                    }}
                    placeholder="Enter your API key"
                  />
                </Field>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Max results</label>
                  <span className="h-5 px-1.5 rounded text-[10px] font-medium bg-muted-bg border border-border text-muted-foreground inline-flex items-center">
                    {searchConfig.maxResults}
                  </span>
                </div>
                <RangeInput
                  min={1}
                  max={10}
                  step={1}
                  value={searchConfig.maxResults}
                  onChange={(v) => {
                    setSearchConfig({ ...searchConfig, maxResults: v });
                    saveSettings();
                  }}
                />
              </div>
            </Tabs.Panel>

            {/* ===== Skills ===== */}
            <Tabs.Panel id="skills" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Agent Skills</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Markdown content injected into the system prompt
                  </p>
                </div>
                <PrimaryButton onClick={() => setShowSkillForm(true)}>
                  <Plus size={15} />
                  Add
                </PrimaryButton>
              </div>

              {showSkillForm && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <Field label="Skill name" htmlFor="skill-name">
                    <TextInput
                      id="skill-name"
                      value={skillName}
                      onChange={setSkillName}
                      placeholder="My skill"
                    />
                  </Field>
                  <Field label="Description" htmlFor="skill-desc">
                    <TextInput
                      id="skill-desc"
                      value={skillDesc}
                      onChange={setSkillDesc}
                      placeholder="Short description"
                    />
                  </Field>
                  <Field label="Content (Markdown)" htmlFor="skill-content">
                    <TextAreaInput
                      id="skill-content"
                      value={skillContent}
                      onChange={setSkillContent}
                      rows={6}
                      mono
                      placeholder="Skill content — injected into the system prompt"
                    />
                  </Field>
                  <div className="flex gap-2 pt-1">
                    <PrimaryButton onClick={handleAddSkill}>Save</PrimaryButton>
                    <GhostButton onClick={() => setShowSkillForm(false)}>Cancel</GhostButton>
                  </div>
                </div>
              )}

              {agentSkills.length === 0 && !showSkillForm && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No agent skills configured.
                </p>
              )}

              {agentSkills.map((skill) => (
                <div key={skill.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold">{skill.name}</h4>
                      {skill.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Toggle
                        checked={skill.isEnabled}
                        onChange={(v) => {
                          updateAgentSkill(skill.id, { isEnabled: v });
                          saveSettings();
                        }}
                        label={`Toggle ${skill.name}`}
                      />
                      <IconGhostButton
                        onClick={() => {
                          removeAgentSkill(skill.id);
                          saveSettings();
                        }}
                        ariaLabel={`Delete ${skill.name}`}
                        className="hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </IconGhostButton>
                    </div>
                  </div>
                  <pre className="text-xs text-muted-foreground bg-muted-bg/50 rounded-lg p-3 max-h-24 overflow-auto leading-relaxed font-mono border border-border">
                    {skill.content.slice(0, 200)}
                    {skill.content.length > 200 ? '...' : ''}
                  </pre>
                </div>
              ))}

              <Separator />

              <Field label="Default System Prompt" htmlFor="sys-prompt">
                <TextAreaInput
                  id="sys-prompt"
                  value={defaultSystemPrompt}
                  onChange={(v) => {
                    setDefaultSystemPrompt(v);
                    saveSettings();
                  }}
                  rows={4}
                  placeholder="Base instructions for every conversation"
                />
              </Field>
            </Tabs.Panel>
          </div>
        </ScrollShadow>
      </Tabs>

      {/* Footer */}
      <footer
        className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
      >
        <PrimaryButton onClick={handleClose}>
          <Save size={15} />
          Save & Close
        </PrimaryButton>
      </footer>
    </Drawer>
  );
}
