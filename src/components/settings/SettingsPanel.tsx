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
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
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
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-2xl h-[100dvh] sm:h-[88vh] sm:max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col tenshi-modal-in">
        <DialogHeader
          className="px-6 py-5 border-b border-border space-y-0"
          style={{ paddingTop: 'max(20px, var(--safe-top))' }}
        >
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Settings
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure providers, themes, MCP servers, search and agent skills.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabId)}
          className="flex-1 flex flex-col min-h-0 gap-0"
        >
          <div className="px-6 pt-4 pb-3 border-b border-border">
            <TabsList className="w-full justify-start overflow-x-auto">
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                  <t.icon className="size-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-6 py-6">
              {/* ===== Providers ===== */}
              <TabsContent value="providers" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">API Providers</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add OpenAI-compatible endpoints and their models
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowProviderForm(true)}>
                    <Plus />
                    Add Provider
                  </Button>
                </div>

                {showProviderForm && (
                  <Card className="border-border">
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="prov-name">Provider name</Label>
                        <Input
                          id="prov-name"
                          value={providerName}
                          onChange={(e) => setProviderName(e.target.value)}
                          placeholder="e.g. OpenRouter"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prov-url">Base URL</Label>
                        <Input
                          id="prov-url"
                          value={providerUrl}
                          onChange={(e) => setProviderUrl(e.target.value)}
                          placeholder="https://openrouter.ai/api/v1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prov-key">API Key</Label>
                        <div className="relative">
                          <Input
                            id="prov-key"
                            type={showKey ? 'text' : 'password'}
                            value={providerKey}
                            onChange={(e) => setProviderKey(e.target.value)}
                            placeholder="sk-..."
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showKey ? 'Hide key' : 'Show key'}
                          >
                            {showKey ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={handleAddProvider}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowProviderForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {providers.length === 0 && !showProviderForm && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No providers configured. Add one to get started.
                  </p>
                )}

                {providers.map((p) => (
                  <Card key={p.id} className="border-border">
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">{p.name}</h4>
                            <Button
                              size="xs"
                              variant={activeProviderId === p.id ? 'default' : 'outline'}
                              onClick={() => {
                                setActiveProvider(p.id);
                                if (p.models.length > 0) setActiveModel(p.models[0].id);
                                saveSettings();
                              }}
                            >
                              {activeProviderId === p.id ? 'Active' : 'Set Active'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {p.baseUrl}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            removeProvider(p.id);
                            saveSettings();
                          }}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {p.models.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-muted/60 border border-border"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Cpu size={14} className="shrink-0 text-muted-foreground" />
                              <span className="text-sm truncate">{m.displayName}</span>
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {m.modelId}
                              </span>
                              {activeProviderId === p.id && activeModelId === m.id && (
                                <Badge variant="default" className="shrink-0">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {m.supportsVision && (
                                <Badge variant="secondary" className="hidden sm:inline-flex">
                                  Vision
                                </Badge>
                              )}
                              {m.supportsTools && (
                                <Badge
                                  variant="secondary"
                                  className="hidden sm:inline-flex bg-success/15 text-success border-success/20"
                                >
                                  Tools
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setActiveModel(m.id);
                                  setActiveProvider(p.id);
                                  saveSettings();
                                }}
                                aria-label={`Set ${m.displayName} active`}
                                title="Set as active model"
                              >
                                <Cpu />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  removeModelFromProvider(p.id, m.id);
                                  saveSettings();
                                }}
                                aria-label={`Delete ${m.displayName}`}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {showModelForm === p.id ? (
                          <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="mod-id">Model ID</Label>
                              <Input
                                id="mod-id"
                                value={modelId}
                                onChange={(e) => setModelId(e.target.value)}
                                placeholder="gpt-4o"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="mod-name">Display name</Label>
                              <Input
                                id="mod-name"
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                placeholder="GPT-4o"
                              />
                            </div>
                            <div className="flex gap-5">
                              <Label className="flex items-center gap-2 text-sm cursor-pointer font-normal">
                                <Checkbox
                                  checked={modelVision}
                                  onCheckedChange={(v) => setModelVision(v === true)}
                                />
                                Vision
                              </Label>
                              <Label className="flex items-center gap-2 text-sm cursor-pointer font-normal">
                                <Checkbox
                                  checked={modelTools}
                                  onCheckedChange={(v) => setModelTools(v === true)}
                                />
                                Tools
                              </Label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="mod-ctx">Context window</Label>
                                <Input
                                  id="mod-ctx"
                                  type="number"
                                  value={modelContext}
                                  onChange={(e) => setModelContext(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="mod-out">Max output tokens</Label>
                                <Input
                                  id="mod-out"
                                  type="number"
                                  value={modelMaxOutput}
                                  onChange={(e) => setModelMaxOutput(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => handleAddModel(p.id)}>
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowModelForm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowModelForm(p.id)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                          >
                            <Plus size={14} /> Add Model
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* ===== Themes ===== */}
              <TabsContent value="themes" className="mt-0 space-y-4">
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
                          : 'border-border hover:border-primary/40 bg-card hover:bg-muted'
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
                            <Badge variant="secondary" className="text-[10px]">
                              default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* ===== MCP ===== */}
              <TabsContent value="mcp" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">MCP Servers (Remote)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Streamable HTTP transport — mobile compatible
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowMcpForm(true)}>
                    <Plus />
                    Add
                  </Button>
                </div>

                {showMcpForm && (
                  <Card className="border-border">
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="mcp-name">Server name</Label>
                        <Input
                          id="mcp-name"
                          value={mcpName}
                          onChange={(e) => setMcpName(e.target.value)}
                          placeholder="My MCP Server"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mcp-url">Server URL</Label>
                        <Input
                          id="mcp-url"
                          value={mcpUrl}
                          onChange={(e) => setMcpUrl(e.target.value)}
                          placeholder="https://mcp.example.com/mcp"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mcp-headers">Headers JSON (optional)</Label>
                        <Textarea
                          id="mcp-headers"
                          value={mcpHeaders}
                          onChange={(e) => setMcpHeaders(e.target.value)}
                          placeholder='{"Authorization": "Bearer token"}'
                          rows={2}
                          className="font-mono"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={handleAddMcp}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowMcpForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mcpServers.length === 0 && !showMcpForm && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No MCP servers configured.
                  </p>
                )}

                {mcpServers.map((srv) => (
                  <Card key={srv.id} className="border-border">
                    <CardContent className="space-y-2">
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
                          <Switch
                            checked={srv.isEnabled}
                            onCheckedChange={(v) => {
                              updateMcpServer(srv.id, { isEnabled: v });
                              saveSettings();
                            }}
                            aria-label={`Toggle ${srv.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              removeMcpServer(srv.id);
                              saveSettings();
                            }}
                            aria-label={`Delete ${srv.name}`}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{srv.url}</p>
                      {srv.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {srv.tools.map((tool) => (
                            <Badge key={tool.name} variant="secondary">
                              {tool.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* ===== Search ===== */}
              <TabsContent value="search" className="mt-0 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold">Web Search</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inject a web_search tool into the model
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                  <Label htmlFor="search-enabled" className="text-sm font-normal">
                    Enable web search
                  </Label>
                  <Switch
                    id="search-enabled"
                    checked={searchConfig.enabled}
                    onCheckedChange={(v) => {
                      setSearchConfig({ ...searchConfig, enabled: v });
                      saveSettings();
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="search-prov">Provider</Label>
                  <Select
                    value={searchConfig.provider}
                    onValueChange={(v) => {
                      setSearchConfig({
                        ...searchConfig,
                        provider: v as SearchConfig['provider'],
                      });
                      saveSettings();
                    }}
                  >
                    <SelectTrigger id="search-prov" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tavily">Tavily (Recommended)</SelectItem>
                      <SelectItem value="serpapi">SerpAPI</SelectItem>
                      <SelectItem value="brave">Brave Search</SelectItem>
                      <SelectItem value="duckduckgo">DuckDuckGo (No key)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {searchConfig.provider !== 'duckduckgo' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="search-key">API Key</Label>
                    <Input
                      id="search-key"
                      type="password"
                      value={searchConfig.apiKey}
                      onChange={(e) => {
                        setSearchConfig({ ...searchConfig, apiKey: e.target.value });
                        saveSettings();
                      }}
                      placeholder="Enter your API key"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max results</Label>
                    <Badge variant="secondary">{searchConfig.maxResults}</Badge>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[searchConfig.maxResults]}
                    onValueChange={(v) => {
                      setSearchConfig({ ...searchConfig, maxResults: v[0] });
                      saveSettings();
                    }}
                  />
                </div>
              </TabsContent>

              {/* ===== Skills ===== */}
              <TabsContent value="skills" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Agent Skills</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Markdown content injected into the system prompt
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowSkillForm(true)}>
                    <Plus />
                    Add
                  </Button>
                </div>

                {showSkillForm && (
                  <Card className="border-border">
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="skill-name">Skill name</Label>
                        <Input
                          id="skill-name"
                          value={skillName}
                          onChange={(e) => setSkillName(e.target.value)}
                          placeholder="My skill"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="skill-desc">Description</Label>
                        <Input
                          id="skill-desc"
                          value={skillDesc}
                          onChange={(e) => setSkillDesc(e.target.value)}
                          placeholder="Short description"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="skill-content">Content (Markdown)</Label>
                        <Textarea
                          id="skill-content"
                          value={skillContent}
                          onChange={(e) => setSkillContent(e.target.value)}
                          rows={6}
                          className="font-mono"
                          placeholder="Skill content — injected into the system prompt"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={handleAddSkill}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowSkillForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {agentSkills.length === 0 && !showSkillForm && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No agent skills configured.
                  </p>
                )}

                {agentSkills.map((skill) => (
                  <Card key={skill.id} className="border-border">
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold">{skill.name}</h4>
                          {skill.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={skill.isEnabled}
                            onCheckedChange={(v) => {
                              updateAgentSkill(skill.id, { isEnabled: v });
                              saveSettings();
                            }}
                            aria-label={`Toggle ${skill.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              removeAgentSkill(skill.id);
                              saveSettings();
                            }}
                            aria-label={`Delete ${skill.name}`}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-24 overflow-auto leading-relaxed font-mono border border-border">
                        {skill.content.slice(0, 200)}
                        {skill.content.length > 200 ? '...' : ''}
                      </pre>
                    </CardContent>
                  </Card>
                ))}

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="sys-prompt">Default System Prompt</Label>
                  <Textarea
                    id="sys-prompt"
                    value={defaultSystemPrompt}
                    onChange={(e) => {
                      setDefaultSystemPrompt(e.target.value);
                      saveSettings();
                    }}
                    rows={4}
                    className="leading-relaxed"
                    placeholder="Base instructions for every conversation"
                  />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter
          className="px-6 py-4 border-t border-border justify-end"
          style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
        >
          <Button onClick={handleClose}>
            <Save />
            Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}