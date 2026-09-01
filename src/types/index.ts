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

export type ThemeName =
  | 'dracula'
  | 'alucard'
  | 'tokyo-night'
  | 'catppuccin'
  | 'nord'
  | 'gruvbox';

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  description: string;
  bgPreview: string;
  accentPreview: string;
  isDark: boolean;
}

// Dracula is the default. Themes curated for a clean, modern palette.
// Colors sourced from the official Dracula spec (https://draculatheme.com/spec)
// and each theme's canonical palette.
export const THEMES: ThemeInfo[] = [
  { id: 'dracula', name: 'Dracula', description: 'Official dark default', bgPreview: '#282a36', accentPreview: '#bd93f9', isDark: true },
  { id: 'alucard', name: 'Alucard', description: 'Official Dracula light', bgPreview: '#fffbeb', accentPreview: '#644ac9', isDark: false },
  { id: 'tokyo-night', name: 'Tokyo Night', description: 'Calm purple-blue dark', bgPreview: '#1a1b26', accentPreview: '#7aa2f7', isDark: true },
  { id: 'catppuccin', name: 'Catppuccin Mocha', description: 'Soothing pastel dark', bgPreview: '#1e1e2e', accentPreview: '#cba6f7', isDark: true },
  { id: 'nord', name: 'Nord', description: 'Arctic cool tones', bgPreview: '#2e3440', accentPreview: '#88c0d0', isDark: true },
  { id: 'gruvbox', name: 'Gruvbox Dark', description: 'Retro warm dark', bgPreview: '#282828', accentPreview: '#d79921', isDark: true },
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

export type CompletionStatus = 'streaming' | 'complete' | 'aborted' | 'error';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  reasoning?: string;
  completionStatus?: CompletionStatus;
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
  sessionId?: string;
  protocolVersion?: string;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type SkillSourceKind = 'github' | 'gitlab' | 'url' | 'manual';

export interface SkillSource {
  kind: SkillSourceKind;
  repo?: string;
  skillPath?: string;
  reference?: string;
  url?: string;
}

export interface SkillListing {
  name: string;
  description: string;
  skillPath: string;
}

export interface SkillsResolveResult {
  source: SkillSource;
  skills: SkillListing[];
}

export interface SkillContentResult {
  name: string;
  description: string;
  content: string;
  source: SkillSource;
}

export interface SkillDirectoryEntry {
  id: string;
  name: string;
  installs: number;
  source: string;
}

export interface SkillUpdateInfo {
  index: number;
  name: string;
  description: string;
  content: string;
  error?: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  filePath: string;
  isEnabled: boolean;
  createdAt: number;
  source?: SkillSource;
  updatedAt?: number;
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
