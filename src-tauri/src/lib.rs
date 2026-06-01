use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let mut req = client.post(&server_url).header("Content-Type", "application/json");

    for (key, value) in &headers {
        req = req.header(key, value);
    }

    // MCP initialize request
    let init_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "tenshillm",
                "version": "0.1.0"
            }
        }
    });

    let response = req
        .json(&init_body)
        .send()
        .await
        .map_err(|e| format!("MCP connection failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read MCP response: {}", e))?;

    if !status.is_success() {
        return Err(format!("MCP Error {}: {}", status, body));
    }

    // Parse the response and then list tools
    // Verify MCP server responds to initialize
    let _init_result: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Invalid MCP response: {}", e))?;

    // Now list tools
    let tools_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    });

    let mut req2 = client
        .post(&server_url)
        .header("Content-Type", "application/json");

    for (key, value) in &headers {
        req2 = req2.header(key, value);
    }

    let response2 = req2
        .json(&tools_body)
        .send()
        .await
        .map_err(|e| format!("MCP tools/list failed: {}", e))?;

    let body2 = response2
        .text()
        .await
        .map_err(|e| format!("Failed to read MCP tools response: {}", e))?;

    let tools_result: serde_json::Value =
        serde_json::from_str(&body2).map_err(|e| format!("Invalid MCP tools response: {}", e))?;

    Ok(tools_result)
}

#[tauri::command]
async fn mcp_call_tool(
    server_url: String,
    headers: HashMap<String, String>,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let call_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    });

    let mut req = client
        .post(&server_url)
        .header("Content-Type", "application/json");

    for (key, value) in &headers {
        req = req.header(key, value);
    }

    let response = req
        .json(&call_body)
        .send()
        .await
        .map_err(|e| format!("MCP tool call failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read MCP response: {}", e))?;

    if !status.is_success() {
        return Err(format!("MCP Error {}: {}", status, body));
    }

    let result: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Invalid MCP response: {}", e))?;

    Ok(result)
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

            serde_json::from_str(&text)
                .map_err(|e| format!("Invalid Tavily response: {}", e))?
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

            serde_json::from_str(&text)
                .map_err(|e| format!("Invalid Brave response: {}", e))?
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
