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
