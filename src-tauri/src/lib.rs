use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use uuid::Uuid;

const MCP_PROTOCOL_VERSION: &str = "2025-06-18";
const MCP_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: Option<bool>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub tools: Option<serde_json::Value>,
}

#[derive(Debug)]
struct McpSession {
    session_id: Option<String>,
    protocol_version: String,
}

#[derive(Debug)]
struct McpHttpResponse {
    status: StatusCode,
    content_type: String,
    session_id: Option<String>,
    body: String,
}

#[derive(Debug, Serialize)]
struct McpListToolsResponse {
    tools: Vec<serde_json::Value>,
    #[serde(rename = "sessionId", skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
    #[serde(rename = "protocolVersion")]
    protocol_version: String,
}

#[derive(Debug, Serialize)]
struct McpCallToolResponse {
    result: serde_json::Value,
    #[serde(rename = "sessionId", skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
    #[serde(rename = "protocolVersion")]
    protocol_version: String,
}

fn mcp_client() -> Result<Client, String> {
    Client::builder()
        .timeout(MCP_REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("Failed to create MCP client: {error}"))
}

fn next_mcp_request_id() -> String {
    Uuid::new_v4().to_string()
}

async fn post_mcp_message(
    client: &Client,
    server_url: &str,
    headers: &HashMap<String, String>,
    message: &serde_json::Value,
    session_id: Option<&str>,
    protocol_version: Option<&str>,
) -> Result<McpHttpResponse, String> {
    let mut request = client.post(server_url);

    for (key, value) in headers {
        request = request.header(key, value);
    }

    request = request
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");

    if let Some(session_id) = session_id {
        request = request.header("Mcp-Session-Id", session_id);
    }

    if let Some(protocol_version) = protocol_version {
        request = request.header("MCP-Protocol-Version", protocol_version);
    }

    let response = request
        .json(message)
        .send()
        .await
        .map_err(|error| format!("MCP request failed: {error}"))?;

    let status = response.status();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_owned();
    let response_session_id = response
        .headers()
        .get("Mcp-Session-Id")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read MCP response: {error}"))?;

    Ok(McpHttpResponse {
        status,
        content_type,
        session_id: response_session_id,
        body,
    })
}

fn push_sse_event(
    data_lines: &mut Vec<String>,
    messages: &mut Vec<serde_json::Value>,
) -> Result<(), String> {
    if data_lines.is_empty() {
        return Ok(());
    }

    let data = data_lines.join("\n");
    data_lines.clear();

    if data.trim() == "[DONE]" {
        return Ok(());
    }

    let message =
        serde_json::from_str(&data).map_err(|error| format!("Invalid MCP SSE message: {error}"))?;
    messages.push(message);
    Ok(())
}

fn parse_mcp_messages(body: &str, content_type: &str) -> Result<Vec<serde_json::Value>, String> {
    if body.trim().is_empty() {
        return Ok(Vec::new());
    }

    if content_type
        .to_ascii_lowercase()
        .contains("text/event-stream")
    {
        let mut data_lines = Vec::new();
        let mut messages = Vec::new();

        for line in body.lines() {
            let line = line.trim_end_matches('\r');
            if line.is_empty() {
                push_sse_event(&mut data_lines, &mut messages)?;
            } else if let Some(data) = line.strip_prefix("data:") {
                data_lines.push(data.strip_prefix(' ').unwrap_or(data).to_owned());
            }
        }

        push_sse_event(&mut data_lines, &mut messages)?;
        return Ok(messages);
    }

    serde_json::from_str(body)
        .map(|message| vec![message])
        .map_err(|error| format!("Invalid MCP JSON response: {error}"))
}

fn ensure_mcp_success(response: &McpHttpResponse, operation: &str) -> Result<(), String> {
    if response.status.is_success() {
        return Ok(());
    }

    let body = if response.body.trim().is_empty() {
        "no response body"
    } else {
        response.body.as_str()
    };

    Err(format!(
        "MCP {operation} failed ({}): {body}",
        response.status
    ))
}

fn find_mcp_response(
    messages: &[serde_json::Value],
    request_id: &str,
) -> Result<serde_json::Value, String> {
    let response = messages
        .iter()
        .find(|message| message.get("id").and_then(serde_json::Value::as_str) == Some(request_id))
        .or_else(|| (messages.len() == 1).then(|| &messages[0]))
        .ok_or_else(|| format!("MCP response for request {request_id} was not received"))?;

    if let Some(error) = response.get("error") {
        return Err(format!("MCP JSON-RPC error: {error}"));
    }

    Ok(response.clone())
}

fn mcp_result(response: serde_json::Value) -> Result<serde_json::Value, String> {
    response
        .get("result")
        .cloned()
        .ok_or_else(|| "MCP response did not contain a result".to_owned())
}

async fn initialize_mcp_session(
    client: &Client,
    server_url: &str,
    headers: &HashMap<String, String>,
) -> Result<McpSession, String> {
    let request_id = next_mcp_request_id();
    let initialize = serde_json::json!({
        "jsonrpc": "2.0",
        "id": request_id.clone(),
        "method": "initialize",
        "params": {
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {
                "name": "tenshillm",
                "version": "0.1.0"
            }
        }
    });

    let response = post_mcp_message(client, server_url, headers, &initialize, None, None).await?;
    ensure_mcp_success(&response, "initialize")?;
    let messages = parse_mcp_messages(&response.body, &response.content_type)?;
    let initialize_response = find_mcp_response(&messages, &request_id)?;
    let initialize_result = mcp_result(initialize_response)?;
    let protocol_version = initialize_result
        .get("protocolVersion")
        .and_then(serde_json::Value::as_str)
        .unwrap_or(MCP_PROTOCOL_VERSION)
        .to_owned();
    let session_id = response.session_id;

    let initialized = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    let initialized_response = post_mcp_message(
        client,
        server_url,
        headers,
        &initialized,
        session_id.as_deref(),
        Some(&protocol_version),
    )
    .await?;
    ensure_mcp_success(&initialized_response, "initialized")?;

    if !initialized_response.body.trim().is_empty() {
        let messages = parse_mcp_messages(
            &initialized_response.body,
            &initialized_response.content_type,
        )?;
        if messages
            .iter()
            .any(|message| message.get("error").is_some())
        {
            return Err("MCP server rejected the initialized notification".to_owned());
        }
    }

    Ok(McpSession {
        session_id,
        protocol_version,
    })
}

#[tauri::command]
async fn send_chat_request(
    base_url: String,
    api_key: String,
    request: ChatRequest,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", base_url);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API Error {}: {}", status, body));
    }

    Ok(body)
}

#[tauri::command]
async fn test_provider_connection(base_url: String, api_key: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/models", base_url);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    Ok(response.status().is_success())
}

#[tauri::command]
async fn mcp_list_tools(
    server_url: String,
    headers: HashMap<String, String>,
) -> Result<McpListToolsResponse, String> {
    let client = mcp_client()?;
    let session = initialize_mcp_session(&client, &server_url, &headers).await?;
    let mut cursor: Option<String> = None;
    let mut tools = Vec::new();

    loop {
        let request_id = next_mcp_request_id();
        let mut params = serde_json::Map::new();
        if let Some(cursor) = &cursor {
            params.insert(
                "cursor".to_owned(),
                serde_json::Value::String(cursor.clone()),
            );
        }

        let tools_list = serde_json::json!({
            "jsonrpc": "2.0",
            "id": request_id.clone(),
            "method": "tools/list",
            "params": params
        });
        let response = post_mcp_message(
            &client,
            &server_url,
            &headers,
            &tools_list,
            session.session_id.as_deref(),
            Some(&session.protocol_version),
        )
        .await?;
        ensure_mcp_success(&response, "tools/list")?;

        let messages = parse_mcp_messages(&response.body, &response.content_type)?;
        let response = find_mcp_response(&messages, &request_id)?;
        let result = mcp_result(response)?;

        if let Some(page_tools) = result.get("tools").and_then(serde_json::Value::as_array) {
            tools.extend(page_tools.iter().cloned());
        }

        cursor = result
            .get("nextCursor")
            .and_then(serde_json::Value::as_str)
            .map(str::to_owned);
        if cursor.is_none() {
            break;
        }
    }

    Ok(McpListToolsResponse {
        tools,
        session_id: session.session_id,
        protocol_version: session.protocol_version,
    })
}

#[tauri::command]
async fn mcp_call_tool(
    server_url: String,
    headers: HashMap<String, String>,
    tool_name: String,
    arguments: serde_json::Value,
    session_id: Option<String>,
    protocol_version: Option<String>,
) -> Result<McpCallToolResponse, String> {
    let client = mcp_client()?;
    let mut session = match session_id {
        Some(session_id) => McpSession {
            session_id: Some(session_id),
            protocol_version: protocol_version.unwrap_or_else(|| MCP_PROTOCOL_VERSION.to_owned()),
        },
        None => initialize_mcp_session(&client, &server_url, &headers).await?,
    };

    let request_id = next_mcp_request_id();
    let call_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": request_id.clone(),
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    });

    let mut response = post_mcp_message(
        &client,
        &server_url,
        &headers,
        &call_body,
        session.session_id.as_deref(),
        Some(&session.protocol_version),
    )
    .await?;

    // Stateful servers can expire a session. Reinitialize once and retry the call.
    if response.status == StatusCode::NOT_FOUND && session.session_id.is_some() {
        session = initialize_mcp_session(&client, &server_url, &headers).await?;
        response = post_mcp_message(
            &client,
            &server_url,
            &headers,
            &call_body,
            session.session_id.as_deref(),
            Some(&session.protocol_version),
        )
        .await?;
    }

    ensure_mcp_success(&response, "tools/call")?;
    let messages = parse_mcp_messages(&response.body, &response.content_type)?;
    let response = find_mcp_response(&messages, &request_id)?;

    Ok(McpCallToolResponse {
        result: mcp_result(response)?,
        session_id: session.session_id,
        protocol_version: session.protocol_version,
    })
}

#[tauri::command]
async fn web_search(
    provider: String,
    api_key: String,
    query: String,
    max_results: u32,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let result = match provider.as_str() {
        "tavily" => {
            let body = serde_json::json!({
                "api_key": api_key,
                "query": query,
                "max_results": max_results,
                "include_answer": true
            });

            let response = client
                .post("https://api.tavily.com/search")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Tavily request failed: {}", e))?;

            let text = response
                .text()
                .await
                .map_err(|e| format!("Failed to read Tavily response: {}", e))?;

            serde_json::from_str(&text).map_err(|e| format!("Invalid Tavily response: {}", e))?
        }
        "brave" => {
            let response = client
                .get(format!(
                    "https://api.search.brave.com/res/v1/web/search?q={}&count={}",
                    urlencoding::encode(&query),
                    max_results
                ))
                .header("X-Subscription-Token", &api_key)
                .header("Accept", "application/json")
                .send()
                .await
                .map_err(|e| format!("Brave request failed: {}", e))?;

            let text = response
                .text()
                .await
                .map_err(|e| format!("Failed to read Brave response: {}", e))?;

            serde_json::from_str(&text).map_err(|e| format!("Invalid Brave response: {}", e))?
        }
        _ => {
            return Err(format!("Unsupported search provider: {}", provider));
        }
    };

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            send_chat_request,
            test_provider_connection,
            mcp_list_tools,
            mcp_call_tool,
            web_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
