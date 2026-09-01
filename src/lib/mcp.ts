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

import { invoke } from '@tauri-apps/api/core';
import type { McpServer, McpTool } from '@/types';

export interface McpListToolsResult {
  tools: McpTool[];
  sessionId?: string;
  protocolVersion: string;
}

export interface McpCallToolResult {
  result: unknown;
  sessionId?: string;
  protocolVersion: string;
}

function normalizeTool(tool: McpTool): McpTool {
  return {
    name: tool.name,
    title: tool.title || tool.name,
    description: tool.description || `MCP tool: ${tool.name}`,
    inputSchema: tool.inputSchema || { type: 'object', properties: {} },
  };
}

export async function listMcpTools(server: McpServer): Promise<McpListToolsResult> {
  const result = await invoke<{
    tools: McpTool[];
    sessionId?: string;
    protocolVersion: string;
  }>('mcp_list_tools', {
    serverUrl: server.url,
    headers: server.headers,
  });

  return {
    ...result,
    tools: result.tools.map(normalizeTool),
  };
}

export async function callMcpTool(
  server: McpServer,
  toolName: string,
  argumentsValue: unknown
): Promise<McpCallToolResult> {
  return invoke<McpCallToolResult>('mcp_call_tool', {
    serverUrl: server.url,
    headers: server.headers,
    toolName,
    arguments: argumentsValue,
    sessionId: server.sessionId,
    protocolVersion: server.protocolVersion,
  });
}
