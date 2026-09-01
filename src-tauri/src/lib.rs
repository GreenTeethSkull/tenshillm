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

use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use uuid::Uuid;

mod skills;

const MCP_PROTOCOL_VERSION: &str = "2025-06-18";
pub(crate) const HTTP_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

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
        .timeout(HTTP_REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("Failed to create MCP client: {error}"))
}

fn next_mcp_request_id() -> String {
    Uuid::new_v4().to_string()
}

fn chat_completions_url(base_url: &str) -> String {
    let normalized_url = base_url.trim_end_matches('/');
    if normalized_url.ends_with("/chat/completions") {
        normalized_url.to_owned()
    } else {
        format!("{normalized_url}/chat/completions")
    }
}

fn provider_api_base_url(base_url: &str) -> String {
    let normalized_url = base_url.trim_end_matches('/');
    normalized_url
        .strip_suffix("/chat/completions")
        .unwrap_or(normalized_url)
        .to_owned()
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

async fn read_json_response(
    response: reqwest::Response,
    provider: &str,
) -> Result<serde_json::Value, String> {
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read {provider} response: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "{provider} search failed ({status}): {}",
            if body.trim().is_empty() {
                "no response body"
            } else {
                body.as_str()
            }
        ));
    }

    serde_json::from_str(&body).map_err(|error| format!("Invalid {provider} response: {error}"))
}

fn decode_html_entities(value: &str) -> String {
    value
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#x27;", "'")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&nbsp;", " ")
}

fn strip_html_tags(value: &str) -> String {
    let mut text = String::with_capacity(value.len());
    let mut in_tag = false;

    for character in value.chars() {
        match character {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => text.push(character),
            _ => {}
        }
    }

    decode_html_entities(&text)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn decode_duckduckgo_result_url(href: &str) -> String {
    let decoded_href = decode_html_entities(href);
    decoded_href
        .split_once("uddg=")
        .and_then(|(_, encoded_url)| encoded_url.split('&').next())
        .and_then(|encoded_url| urlencoding::decode(encoded_url).ok())
        .map(|url| url.into_owned())
        .unwrap_or(decoded_href)
}

fn extract_anchor_value(block: &str, marker: &str) -> Option<(String, String)> {
    let anchor_start = block.find(marker)?;
    let value_start = anchor_start + marker.len();
    let value_end = value_start + block[value_start..].find('"')?;
    let tag_end = block[value_end..].find('>')? + value_end + 1;
    let content_end = tag_end + block[tag_end..].find("</a>")?;

    Some((
        block[value_start..value_end].to_owned(),
        block[tag_end..content_end].to_owned(),
    ))
}

fn parse_duckduckgo_html(body: &str, max_results: u32) -> Result<Vec<serde_json::Value>, String> {
    if body.contains("anomaly-modal") || body.contains("Unfortunately, bots use DuckDuckGo too") {
        return Err("DuckDuckGo search was blocked by an anti-bot challenge".to_owned());
    }

    let title_marker = r#"<a rel="nofollow" class="result__a" href=""#;
    let snippet_marker = r#"<a class="result__snippet" href=""#;
    let mut results = Vec::new();
    let mut cursor = 0;
    let limit = max_results.max(1);

    while results.len() < limit as usize {
        let Some(relative_start) = body[cursor..].find(title_marker) else {
            break;
        };
        let title_start = cursor + relative_start;
        let next_title_start = body[title_start + title_marker.len()..]
            .find(title_marker)
            .map(|offset| title_start + title_marker.len() + offset)
            .unwrap_or(body.len());
        let block = &body[title_start..next_title_start];
        let Some((href, title)) = extract_anchor_value(block, title_marker) else {
            cursor = title_start + title_marker.len();
            continue;
        };
        let snippet = extract_anchor_value(block, snippet_marker)
            .map(|(_, value)| strip_html_tags(&value))
            .unwrap_or_default();

        results.push(serde_json::json!({
            "title": strip_html_tags(&title),
            "url": decode_duckduckgo_result_url(&href),
            "snippet": snippet,
        }));
        cursor = next_title_start;
    }

    if results.is_empty() {
        return Err("DuckDuckGo returned no web results".to_owned());
    }

    Ok(results)
}

async fn duckduckgo_search(
    client: &Client,
    query: &str,
    max_results: u32,
) -> Result<serde_json::Value, String> {
    let response = client
        .get("https://html.duckduckgo.com/html/")
        .query(&[("q", query)])
        .header("User-Agent", "Mozilla/5.0 (TenshiLLM)")
        .send()
        .await
        .map_err(|error| format!("DuckDuckGo request failed: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read DuckDuckGo response: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "DuckDuckGo search failed ({status}): {}",
            if body.trim().is_empty() {
                "no response body"
            } else {
                body.as_str()
            }
        ));
    }

    Ok(serde_json::json!({
        "provider": "duckduckgo",
        "query": query,
        "results": parse_duckduckgo_html(&body, max_results)?,
    }))
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
    let url = chat_completions_url(&base_url);

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
    let url = format!("{}/models", provider_api_base_url(&base_url));

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
    let client = Client::builder()
        .timeout(HTTP_REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("Failed to create search client: {error}"))?;
    let max_results_param = max_results.to_string();

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
            read_json_response(response, "Tavily").await?
        }
        "serpapi" => {
            let response = client
                .get("https://serpapi.com/search.json")
                .query(&[
                    ("engine", "google"),
                    ("q", query.as_str()),
                    ("api_key", api_key.as_str()),
                    ("num", max_results_param.as_str()),
                ])
                .send()
                .await
                .map_err(|e| format!("SerpAPI request failed: {}", e))?;
            read_json_response(response, "SerpAPI").await?
        }
        "brave" => {
            let response = client
                .get("https://api.search.brave.com/res/v1/web/search")
                .query(&[("q", query.as_str()), ("count", max_results_param.as_str())])
                .header("X-Subscription-Token", &api_key)
                .header("Accept", "application/json")
                .send()
                .await
                .map_err(|e| format!("Brave request failed: {}", e))?;
            read_json_response(response, "Brave").await?
        }
        "duckduckgo" => duckduckgo_search(&client, &query, max_results).await?,
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
            skills::skills_resolve_source,
            skills::skills_fetch_skill,
            skills::skills_check_updates,
            skills::skills_search_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_json_rpc_response() {
        let messages = parse_mcp_messages(
            r#"{"jsonrpc":"2.0","id":"request-1","result":{"tools":[]}}"#,
            "application/json",
        )
        .expect("JSON response should parse");

        let response = find_mcp_response(&messages, "request-1").expect("response should match");
        assert_eq!(response["result"]["tools"], serde_json::json!([]));
    }

    #[test]
    fn parses_multiple_sse_messages() {
        let body = concat!(
            "event: message\n",
            "data: {\"jsonrpc\":\"2.0\",\"id\":\"one\",\"result\":{}}\n",
            "\n",
            "event: message\n",
            "data: {\"jsonrpc\":\"2.0\",\"id\":\"two\",\"result\":{}}\n",
            "\n",
        );
        let messages =
            parse_mcp_messages(body, "text/event-stream").expect("SSE response should parse");

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[1]["id"], "two");
    }

    #[test]
    fn selects_the_matching_json_rpc_id() {
        let messages = vec![
            serde_json::json!({"jsonrpc":"2.0","method":"notifications/progress"}),
            serde_json::json!({"jsonrpc":"2.0","id":"target","result":{"ok":true}}),
        ];

        let response = find_mcp_response(&messages, "target").expect("response should match");
        assert_eq!(response["result"]["ok"], true);
    }

    #[test]
    fn reports_json_rpc_errors() {
        let messages = vec![serde_json::json!({
            "jsonrpc": "2.0",
            "id": "request-1",
            "error": {"code": -32602, "message": "Invalid arguments"}
        })];

        let error = find_mcp_response(&messages, "request-1").expect_err("error should propagate");
        assert!(error.contains("Invalid arguments"));
    }

    #[test]
    fn accepts_completion_endpoint_in_provider_url() {
        assert_eq!(
            chat_completions_url("https://example.com/v1"),
            "https://example.com/v1/chat/completions"
        );
        assert_eq!(
            chat_completions_url("https://example.com/v1/chat/completions/"),
            "https://example.com/v1/chat/completions"
        );
    }

    #[test]
    fn parses_duckduckgo_html_results() {
        let body = concat!(
            r#"<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs&amp;rut=one">Example &amp; docs</a>"#,
            r#"<a class="result__snippet" href="x">A useful &amp; snippet.</a>"#,
            r#"<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org&amp;rut=two">Example org</a>"#,
            r#"<a class="result__snippet" href="x">Second result.</a>"#,
        );

        let results = parse_duckduckgo_html(body, 2).expect("results should parse");

        assert_eq!(results[0]["title"], "Example & docs");
        assert_eq!(results[0]["url"], "https://example.com/docs");
        assert_eq!(results[0]["snippet"], "A useful & snippet.");
        assert_eq!(results[1]["url"], "https://example.org");
    }

    #[test]
    fn reports_duckduckgo_anti_bot_challenges() {
        let error = parse_duckduckgo_html("Unfortunately, bots use DuckDuckGo too", 5)
            .expect_err("anti-bot response should fail clearly");

        assert!(error.contains("anti-bot challenge"));
    }
}
