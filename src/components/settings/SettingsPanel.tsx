import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { DEFAULT_SYSTEM_PROMPT, useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import { THEMES } from '@/types';
import type {
  ApiProvider,
  ModelConfig,
  McpServer,
  SearchConfig,
  AgentSkill,
  SkillContentResult,
  SkillDirectoryEntry,
  SkillSource,
  SkillsResolveResult,
} from '@/types';
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
  RotateCcw,
  X,
  Download,
  RefreshCw,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { Tabs, ScrollShadow, Separator } from '@heroui/react';
import { Drawer } from '@/components/Overlay';
import { listMcpTools } from '@/lib/mcp';
import {
  checkSkillUpdates,
  fetchSkill,
  formatInstalls,
  resolveSkillSource,
  searchSkillDirectory,
  skillSourceForListing,
} from '@/lib/skills';
import { describeRuntimeError, isTauriRuntime } from '@/lib/runtime';
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
    addAgentSkills,
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
  const [connectingMcpId, setConnectingMcpId] = useState<string | null>(null);

  // Skill form
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillContent, setSkillContent] = useState('');

  // Skill install / update
  const [skillSourceInput, setSkillSourceInput] = useState('');
  const [resolvingSource, setResolvingSource] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<SkillsResolveResult | null>(null);
  const [selectedSkillPaths, setSelectedSkillPaths] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [searchingDirectory, setSearchingDirectory] = useState(false);
  const [directoryResults, setDirectoryResults] = useState<SkillDirectoryEntry[] | null>(null);
  const [installingEntryId, setInstallingEntryId] = useState<string | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingSkillId, setUpdatingSkillId] = useState<string | null>(null);

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

  const handleConnectMcp = async (server: McpServer) => {
    if (!isTauriRuntime()) {
      toast.error('MCP connections require the Tauri desktop or mobile runtime.');
      return;
    }

    setConnectingMcpId(server.id);
    try {
      const result = await listMcpTools(server);
      updateMcpServer(server.id, {
        connected: true,
        tools: result.tools,
        sessionId: result.sessionId,
        protocolVersion: result.protocolVersion,
      });
      saveSettings();
      toast.success(`${server.name} connected (${result.tools.length} tools)`);
    } catch (error) {
      updateMcpServer(server.id, {
        connected: false,
        tools: [],
        sessionId: undefined,
        protocolVersion: undefined,
      });
      saveSettings();
      toast.error(
        `${server.name} connection failed: ${describeRuntimeError(error)}`
      );
    } finally {
      setConnectingMcpId(null);
    }
  };

  const handleToggleMcp = async (server: McpServer, enabled: boolean) => {
    if (!enabled) {
      updateMcpServer(server.id, {
        isEnabled: false,
        connected: false,
        tools: [],
        sessionId: undefined,
        protocolVersion: undefined,
      });
      saveSettings();
      return;
    }

    updateMcpServer(server.id, { isEnabled: true });
    await handleConnectMcp({ ...server, isEnabled: true });
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

  const sourcedSkills = agentSkills.filter(
    (skill) => skill.source && skill.source.kind !== 'manual'
  );

  const resetInstallState = () => {
    setPendingInstall(null);
    setSelectedSkillPaths([]);
    setSkillSourceInput('');
  };

  const buildSkillFromContent = (content: SkillContentResult): AgentSkill => ({
    id: nanoid(),
    name: content.name,
    description: content.description,
    content: content.content,
    filePath: '',
    isEnabled: true,
    createdAt: Date.now(),
    source: content.source,
    updatedAt: Date.now(),
  });

  const upsertRemoteSkill = (skill: AgentSkill): 'added' | 'updated' => {
    const existing = agentSkills.find(
      (candidate) =>
        candidate.source &&
        skill.source &&
        candidate.source.kind === skill.source.kind &&
        candidate.source.repo === skill.source.repo &&
        candidate.source.skillPath === skill.source.skillPath
    );
    if (existing) {
      updateAgentSkill(existing.id, {
        name: skill.name,
        description: skill.description,
        content: skill.content,
        source: skill.source,
        updatedAt: skill.updatedAt,
      });
      return 'updated';
    }
    addAgentSkill(skill);
    return 'added';
  };

  const requireRuntime = (): boolean => {
    if (isTauriRuntime()) return true;
    toast.error('Skill installation requires the Tauri desktop or mobile runtime.');
    return false;
  };

  const handleResolveSource = async () => {
    const source = skillSourceInput.trim();
    if (!source || !requireRuntime()) return;
    setResolvingSource(true);
    try {
      const result = await resolveSkillSource(source);
      if (result.skills.length === 0) {
        toast.error('No SKILL.md files found at that source');
        return;
      }
      setPendingInstall(result);
      setSelectedSkillPaths(result.skills.map((listing) => listing.skillPath));
    } catch (error) {
      toast.error(`Could not resolve source: ${describeRuntimeError(error)}`);
    } finally {
      setResolvingSource(false);
    }
  };

  const handleInstallSelected = async () => {
    if (!pendingInstall || !requireRuntime()) return;
    const selected = pendingInstall.skills.filter((listing) =>
      selectedSkillPaths.includes(listing.skillPath)
    );
    if (selected.length === 0) return;
    setInstalling(true);
    try {
      const results = await Promise.allSettled(
        selected.map((listing) => fetchSkill(skillSourceForListing(pendingInstall.source, listing)))
      );
      const newSkills: AgentSkill[] = [];
      const updates: { id: string; skill: AgentSkill }[] = [];
      let failures = 0;
      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value.content.trim()) {
          failures += 1;
          continue;
        }
        const skill = buildSkillFromContent(result.value);
        const existing = agentSkills.find(
          (candidate) =>
            candidate.source &&
            skill.source &&
            candidate.source.kind === skill.source.kind &&
            candidate.source.repo === skill.source.repo &&
            candidate.source.skillPath === skill.source.skillPath
        );
        if (existing) updates.push({ id: existing.id, skill });
        else newSkills.push(skill);
      }

      if (newSkills.length > 0 || updates.length > 0) {
        if (newSkills.length > 0) addAgentSkills(newSkills);
        for (const { id, skill } of updates) {
          updateAgentSkill(id, {
            name: skill.name,
            description: skill.description,
            content: skill.content,
            source: skill.source,
            updatedAt: skill.updatedAt,
          });
        }
        saveSettings();
        const total = newSkills.length + updates.length;
        const parts = [`${total} skill${total === 1 ? '' : 's'} installed`];
        if (updates.length > 0) parts.push(`${updates.length} updated`);
        if (failures > 0) parts.push(`${failures} failed`);
        toast.success(parts.join(', '));
        resetInstallState();
      } else {
        toast.error('All skill downloads failed');
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleSearchDirectory = async () => {
    const query = directoryQuery.trim();
    if (!query || !requireRuntime()) return;
    setSearchingDirectory(true);
    try {
      setDirectoryResults(await searchSkillDirectory(query, 10));
    } catch (error) {
      toast.error(`skills.sh search failed: ${describeRuntimeError(error)}`);
    } finally {
      setSearchingDirectory(false);
    }
  };

  const handleInstallDirectoryEntry = async (entry: SkillDirectoryEntry) => {
    if (!requireRuntime()) return;
    setInstallingEntryId(entry.id);
    try {
      const resolved = await resolveSkillSource(entry.source);
      const listing =
        resolved.skills.find((candidate) => candidate.name === entry.name) ?? resolved.skills[0];
      if (!listing) {
        toast.error(`Could not find "${entry.name}" in ${entry.source}`);
        return;
      }
      const content = await fetchSkill(skillSourceForListing(resolved.source, listing));
      if (!content.content.trim()) {
        toast.error(`"${entry.name}" has no usable content`);
        return;
      }
      const outcome = upsertRemoteSkill(buildSkillFromContent(content));
      saveSettings();
      toast.success(outcome === 'updated' ? `${content.name} updated` : `${content.name} installed`);
    } catch (error) {
      toast.error(`Install failed: ${describeRuntimeError(error)}`);
    } finally {
      setInstallingEntryId(null);
    }
  };

  const handleCheckUpdates = async () => {
    if (sourcedSkills.length === 0 || !requireRuntime()) return;
    setCheckingUpdates(true);
    try {
      const updates = await checkSkillUpdates(
        sourcedSkills.map((skill) => skill.source as SkillSource)
      );
      let changed = 0;
      let current = 0;
      let failed = 0;
      for (const info of updates) {
        const skill = sourcedSkills[info.index];
        if (!skill) continue;
        if (info.error) {
          failed += 1;
          continue;
        }
        if (
          info.content !== skill.content ||
          (info.name && info.name !== skill.name) ||
          (info.description && info.description !== skill.description)
        ) {
          updateAgentSkill(skill.id, {
            name: info.name || skill.name,
            description: info.description,
            content: info.content,
            updatedAt: Date.now(),
          });
          changed += 1;
        } else {
          current += 1;
        }
      }
      saveSettings();
      toast.success(
        `${changed} updated, ${current} up to date${failed > 0 ? `, ${failed} failed` : ''}`
      );
    } catch (error) {
      toast.error(`Update check failed: ${describeRuntimeError(error)}`);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleUpdateSkill = async (skill: AgentSkill) => {
    if (!skill.source || !requireRuntime()) return;
    setUpdatingSkillId(skill.id);
    try {
      const content = await fetchSkill(skill.source);
      if (!content.content.trim()) {
        toast.error(`"${skill.name}" has no usable content`);
        return;
      }
      updateAgentSkill(skill.id, {
        name: content.name || skill.name,
        description: content.description,
        content: content.content,
        source: content.source,
        updatedAt: Date.now(),
      });
      saveSettings();
      toast.success(`${skill.name} updated`);
    } catch (error) {
      toast.error(`Update failed: ${describeRuntimeError(error)}`);
    } finally {
      setUpdatingSkillId(null);
    }
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
            <Tabs.List className="flex gap-1 overflow-x-hidden px-2 sm:overflow-x-auto sm:px-0">
              {tabs.map((t) => (
                <Tabs.Tab
                  key={t.id}
                  id={t.id}
                  aria-label={t.label}
                  className={cn(
                    'group inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                    'data-[selected]:bg-primary data-[selected]:text-primary-foreground',
                    'text-foreground/80 hover:bg-muted-bg hover:text-foreground'
                  )}
                >
                  <t.icon size={15} aria-hidden="true" />
                  <span className="hidden sm:inline group-data-[selected]:inline">{t.label}</span>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </div>

        <ScrollShadow className="flex-1 overflow-y-auto" orientation="vertical" size={8}>
          <div className="px-6 py-6">
            {/* ===== Providers ===== */}
            <Tabs.Panel id="providers" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">API Providers</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add OpenAI-compatible endpoints and their models
                  </p>
                </div>
                <PrimaryButton
                  onClick={() => setShowProviderForm(true)}
                  className="self-start shrink-0"
                >
                  <Plus size={15} />
                  Add Provider
                </PrimaryButton>
              </div>

              {showProviderForm && (
                <form
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAddProvider();
                  }}
                >
                  <Field label="Provider name" htmlFor="prov-name">
                    <TextInput
                      id="prov-name"
                      name="provider-name"
                      autoComplete="off"
                      value={providerName}
                      onChange={setProviderName}
                      placeholder="e.g. OpenRouter"
                    />
                  </Field>
                  <Field label="Base URL" htmlFor="prov-url">
                    <TextInput
                      id="prov-url"
                      name="provider-url"
                      autoComplete="url"
                      value={providerUrl}
                      onChange={setProviderUrl}
                      placeholder="https://openrouter.ai/api/v1"
                    />
                  </Field>
                  <Field label="API Key" htmlFor="prov-key">
                    <div className="relative">
                      <TextInput
                        id="prov-key"
                        name="provider-key"
                        autoComplete="off"
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
                    <PrimaryButton type="submit">Save</PrimaryButton>
                    <GhostButton onClick={() => setShowProviderForm(false)}>Cancel</GhostButton>
                  </div>
                </form>
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
                       'flex items-center gap-3.5 p-4 rounded-xl border text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98]',
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">MCP Servers (Remote)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Streamable HTTP transport — mobile compatible
                  </p>
                </div>
                <PrimaryButton onClick={() => setShowMcpForm(true)} className="self-start shrink-0">
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
                        onChange={(v) => void handleToggleMcp(srv, v)}
                        label={`Toggle ${srv.name}`}
                      />
                      <GhostButton
                        onClick={() => void handleConnectMcp(srv)}
                        disabled={!srv.isEnabled || connectingMcpId === srv.id}
                        className="h-7 px-2 text-xs"
                      >
                        <Plug size={13} />
                        {connectingMcpId === srv.id
                          ? 'Connecting'
                          : srv.connected
                            ? 'Reconnect'
                            : 'Connect'}
                      </GhostButton>
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
                    }}
                    placeholder="Enter your API key"
                  />
                </Field>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="search-max-results" className="text-xs font-medium">
                    Max results
                  </label>
                  <span className="h-5 px-1.5 rounded text-[10px] font-medium bg-muted-bg border border-border text-muted-foreground inline-flex items-center">
                    {searchConfig.maxResults}
                  </span>
                </div>
                <RangeInput
                  id="search-max-results"
                  min={1}
                  max={10}
                  step={1}
                  value={searchConfig.maxResults}
                  onChange={(v) => {
                    setSearchConfig({ ...searchConfig, maxResults: v });
                  }}
                />
              </div>
            </Tabs.Panel>

            {/* ===== Skills ===== */}
            <Tabs.Panel id="skills" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Agent Skills</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Markdown content injected into the system prompt
                  </p>
                </div>
                <PrimaryButton onClick={() => setShowSkillForm(true)} className="self-start shrink-0">
                  <Plus size={15} />
                  Add
                </PrimaryButton>
              </div>

              {/* Install from remote source */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">Install from source</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    GitHub repo (owner/repo), GitHub/GitLab URL, or a direct SKILL.md link
                  </p>
                </div>
                <div className="flex gap-2">
                  <TextInput
                    value={skillSourceInput}
                    onChange={setSkillSourceInput}
                    placeholder="vercel-labs/agent-skills"
                    autoComplete="off"
                  />
                  <GhostButton
                    onClick={() => void handleResolveSource()}
                    disabled={resolvingSource || !skillSourceInput.trim()}
                    className="shrink-0"
                  >
                    <Download size={14} />
                    {resolvingSource ? 'Looking up' : 'Find'}
                  </GhostButton>
                </div>

                {pendingInstall && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium">
                      {pendingInstall.skills.length} skill
                      {pendingInstall.skills.length === 1 ? '' : 's'} found — select to install:
                    </p>
                    {pendingInstall.skills.map((listing) => (
                      <CheckBox
                        key={listing.skillPath}
                        checked={selectedSkillPaths.includes(listing.skillPath)}
                        onChange={(checked) => {
                          setSelectedSkillPaths((current) =>
                            checked
                              ? [...current, listing.skillPath]
                              : current.filter((path) => path !== listing.skillPath)
                          );
                        }}
                        label={listing.name}
                      />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <PrimaryButton
                        onClick={() => void handleInstallSelected()}
                        disabled={installing || selectedSkillPaths.length === 0}
                      >
                        <Download size={14} />
                        {installing ? 'Installing' : `Install ${selectedSkillPaths.length}`}
                      </PrimaryButton>
                      <GhostButton onClick={resetInstallState}>Cancel</GhostButton>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold">Browse skills.sh</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Experimental directory search — same ecosystem as npx skills
                  </p>
                </div>
                <div className="flex gap-2">
                  <TextInput
                    value={directoryQuery}
                    onChange={setDirectoryQuery}
                    placeholder="Search skills.sh"
                    autoComplete="off"
                  />
                  <GhostButton
                    onClick={() => void handleSearchDirectory()}
                    disabled={searchingDirectory || !directoryQuery.trim()}
                    className="shrink-0"
                  >
                    <SearchIcon size={14} />
                    {searchingDirectory ? 'Searching' : 'Search'}
                  </GhostButton>
                </div>

                {directoryResults && (
                  <div className="space-y-2">
                    {directoryResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No skills found. Try installing directly from a source above.
                      </p>
                    ) : (
                      directoryResults.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-muted-bg/60 border border-border"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{entry.name}</span>
                              {formatInstalls(entry.installs) && (
                                <span className="shrink-0 h-5 px-1.5 rounded text-[10px] font-medium bg-muted-bg border border-border text-muted-foreground inline-flex items-center">
                                  {formatInstalls(entry.installs)} installs
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {entry.source}
                            </p>
                          </div>
                          <GhostButton
                            onClick={() => void handleInstallDirectoryEntry(entry)}
                            disabled={installingEntryId === entry.id}
                            className="h-7 px-2.5 text-xs shrink-0"
                          >
                            <Download size={13} />
                            {installingEntryId === entry.id ? 'Installing' : 'Install'}
                          </GhostButton>
                        </div>
                      ))
                    )}
                  </div>
                )}
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

              {sourcedSkills.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-xs text-muted-foreground">
                    {sourcedSkills.length} skill{sourcedSkills.length === 1 ? '' : 's'} from remote
                    sources
                  </p>
                  <GhostButton
                    onClick={() => void handleCheckUpdates()}
                    disabled={checkingUpdates}
                    className="h-7 px-2.5 text-xs"
                  >
                    <RefreshCw size={13} className={checkingUpdates ? 'animate-spin' : ''} />
                    {checkingUpdates ? 'Checking' : 'Check updates'}
                  </GhostButton>
                </div>
              )}

              {agentSkills.map((skill) => {
                const isRemote = Boolean(skill.source && skill.source.kind !== 'manual');
                const sourceLabel = skill.source
                  ? skill.source.repo || skill.source.url || skill.source.kind
                  : '';
                return (
                  <div
                    key={skill.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold">{skill.name}</h4>
                          {isRemote && (
                            <span className="shrink-0 h-5 px-1.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 inline-flex items-center max-w-full">
                              <span className="truncate">{sourceLabel}</span>
                            </span>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {skill.description}
                          </p>
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
                        {isRemote && (
                          <IconGhostButton
                            onClick={() => void handleUpdateSkill(skill)}
                            disabled={updatingSkillId === skill.id}
                            ariaLabel={`Update ${skill.name}`}
                            title="Re-install from source"
                            className="hover:text-primary"
                          >
                            <RefreshCw
                              size={15}
                              className={updatingSkillId === skill.id ? 'animate-spin' : ''}
                            />
                          </IconGhostButton>
                        )}
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
                );
              })}

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sys-prompt" className="block text-xs font-medium text-foreground">
                    Default System Prompt
                  </label>
                  <GhostButton
                    onClick={() => setDefaultSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                    disabled={defaultSystemPrompt === DEFAULT_SYSTEM_PROMPT}
                    ariaLabel="Revert to default system prompt"
                    title="Revert to default system prompt"
                    className="h-7 px-2.5 text-xs"
                  >
                    <RotateCcw size={13} />
                    Revert
                  </GhostButton>
                </div>
                <TextAreaInput
                  id="sys-prompt"
                  value={defaultSystemPrompt}
                  onChange={(v) => {
                    setDefaultSystemPrompt(v);
                  }}
                  rows={4}
                  placeholder="Base instructions for every conversation"
                />
              </div>
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
