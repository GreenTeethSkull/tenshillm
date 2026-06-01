export type ThemeName =
  | 'light'
  | 'tokyo-night'
  | 'dracula'
  | 'catppuccin'
  | 'gruvbox'
  | 'nord'
  | 'solarized'
  | 'one-dark'
  | 'everforest';

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  description: string;
  bgPreview: string;
  accentPreview: string;
}

export const THEMES: ThemeInfo[] = [
  { id: 'light', name: 'Light', description: 'Clean and bright', bgPreview: '#ffffff', accentPreview: '#2563eb' },
  { id: 'tokyo-night', name: 'Tokyo Night', description: 'Dark purple-blue vibes', bgPreview: '#1a1b26', accentPreview: '#7aa2f7' },
  { id: 'dracula', name: 'Dracula', description: 'Classic dark theme', bgPreview: '#282a36', accentPreview: '#bd93f9' },
  { id: 'catppuccin', name: 'Catppuccin Mocha', description: 'Soothing pastel dark', bgPreview: '#1e1e2e', accentPreview: '#cba6f7' },
  { id: 'gruvbox', name: 'Gruvbox Dark', description: 'Retro warm dark', bgPreview: '#282828', accentPreview: '#d79921' },
  { id: 'nord', name: 'Nord', description: 'Arctic cool tones', bgPreview: '#2e3440', accentPreview: '#88c0d0' },
  { id: 'solarized', name: 'Solarized Dark', description: 'Precision dark', bgPreview: '#002b36', accentPreview: '#268bd2' },
  { id: 'one-dark', name: 'One Dark', description: 'Atom-inspired dark', bgPreview: '#282c34', accentPreview: '#61afef' },
  { id: 'everforest', name: 'Everforest', description: 'Nature-inspired dark', bgPreview: '#2d353b', accentPreview: '#a7c080' },
];

export interface ApiProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: ModelConfig[];
  isActive: boolean;
  createdAt: number;
}

export interface ModelConfig {
  id: string;
  modelId: string;
  displayName: string;
  supportsVision: boolean;
  supportsTools: boolean;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface Conversation {
  id: string;
  title: string;
  providerId: string;
  modelId: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments: Attachment[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  timestamp: number;
  tokenUsage: TokenUsage | null;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  transport: 'streamable-http';
  headers: Record<string, string>;
  isEnabled: boolean;
  tools: McpTool[];
  connected: boolean;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  filePath: string;
  isEnabled: boolean;
  createdAt: number;
}

export interface SearchConfig {
  enabled: boolean;
  provider: 'tavily' | 'serpapi' | 'brave' | 'duckduckgo';
  apiKey: string;
  maxResults: number;
  region: string;
}

export interface AppSettings {
  theme: ThemeName;
  fontSize: number;
  providers: ApiProvider[];
  mcpServers: McpServer[];
  searchConfig: SearchConfig;
  defaultSystemPrompt: string;
}

export interface CleanupStats {
  totalConversations: number;
  archivedConversations: number;
  totalMessages: number;
  attachmentsSize: number;
  cacheSize: number;
}
