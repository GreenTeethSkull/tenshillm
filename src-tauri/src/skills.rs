//! Remote agent-skill installation: GitHub/GitLab repositories and direct
//! SKILL.md URLs, plus the skills.sh directory search (experimental API).
//!
//! Skills follow the open agent skills format: a `SKILL.md` file with an
//! optional YAML frontmatter (`name`, `description`) and a Markdown body.
//! Sources are accepted as GitHub shorthand (`owner/repo`), GitHub/GitLab
//! repository URLs (optionally with `/tree/<ref>/<path>` or a direct
//! `/blob/<ref>/<path>/SKILL.md`), or any direct `SKILL.md` URL.

use futures::future::join_all;
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};

use crate::HTTP_REQUEST_TIMEOUT;

pub const SKILL_FILE_NAME: &str = "SKILL.md";
pub const SKILLS_MAX_CONTENT_BYTES: usize = 256 * 1024;

const SKILLS_DIRECTORY_API: &str = "https://skills.sh/api/search";
const USER_AGENT: &str = "tenshillm";
const MAX_GITLAB_TREE_PAGES: u32 = 10;
const GITHUB_API_BASE: &str = "https://api.github.com";
const GITHUB_RAW_BASE: &str = "https://raw.githubusercontent.com";
const GITLAB_API_BASE: &str = "https://gitlab.com/api/v4";
const GITLAB_RAW_BASE: &str = "https://gitlab.com";

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSource {
    /// "github" | "gitlab" | "url" (installed skills may also be "manual")
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub skill_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillListing {
    pub name: String,
    pub description: String,
    pub skill_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillsResolveResponse {
    pub source: SkillSource,
    pub skills: Vec<SkillListing>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillContent {
    pub name: String,
    pub description: String,
    pub content: String,
    pub source: SkillSource,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUpdateInfo {
    pub index: usize,
    pub name: String,
    pub description: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDirectoryEntry {
    pub id: String,
    pub name: String,
    pub installs: u64,
    pub source: String,
}

/* =========================================================================
Source parsing
========================================================================= */

pub fn parse_skill_source(raw: &str) -> Result<SkillSource, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Skill source cannot be empty".to_owned());
    }

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return parse_skill_source_url(trimmed);
    }

    let segments: Vec<&str> = trimmed.split('/').collect();
    let is_shorthand = segments.len() == 2
        && segments
            .iter()
            .all(|segment| !segment.is_empty() && !segment.chars().any(char::is_whitespace));
    if is_shorthand {
        return Ok(SkillSource {
            kind: "github".to_owned(),
            repo: Some(trimmed.to_owned()),
            ..SkillSource::default()
        });
    }

    Err(format!(
        "Unsupported skill source: {trimmed}. Use owner/repo, a GitHub/GitLab URL, or a direct SKILL.md URL"
    ))
}

fn parse_skill_source_url(url: &str) -> Result<SkillSource, String> {
    let trimmed = url.trim_end_matches('/');
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err(format!(
            "Skill source URL must start with http(s)://: {url}"
        ));
    }

    let Some((_, rest)) = trimmed.split_once("://") else {
        return Err(format!("Skill source URL is malformed: {url}"));
    };
    let Some((host, path)) = rest.split_once('/') else {
        return Err(format!("Skill source URL is missing a path: {url}"));
    };

    if host.eq_ignore_ascii_case("github.com") {
        return github_source_from_url_parts(path)
            .ok_or_else(|| format!("Unsupported GitHub skill URL: {url}"));
    }
    if host.eq_ignore_ascii_case("gitlab.com") {
        return gitlab_source_from_url_parts(path)
            .ok_or_else(|| format!("Unsupported GitLab skill URL: {url}"));
    }
    if trimmed.ends_with(SKILL_FILE_NAME) {
        return Ok(SkillSource {
            kind: "url".to_owned(),
            url: Some(trimmed.to_owned()),
            ..SkillSource::default()
        });
    }

    Err(format!(
        "Skill source URL must point to a GitHub/GitLab repository or a SKILL.md file: {url}"
    ))
}

fn github_source_from_url_parts(path: &str) -> Option<SkillSource> {
    let mut segments = path.split('/');
    let owner = segments.next()?;
    let repo = segments.next()?;
    if owner.is_empty() || repo.is_empty() {
        return None;
    }
    let mut source = SkillSource {
        kind: "github".to_owned(),
        repo: Some(format!("{owner}/{repo}")),
        ..SkillSource::default()
    };

    match segments.next() {
        None => Some(source),
        Some(kind @ ("tree" | "blob")) => {
            let reference = segments.next().filter(|segment| !segment.is_empty())?;
            let skill_path = segments.collect::<Vec<_>>().join("/");
            if kind == "blob" && !skill_path.ends_with(SKILL_FILE_NAME) {
                return None;
            }
            source.reference = Some(reference.to_owned());
            source.skill_path = (!skill_path.is_empty()).then_some(skill_path);
            Some(source)
        }
        Some(_) => None,
    }
}

fn gitlab_source_from_url_parts(path: &str) -> Option<SkillSource> {
    let (project, rest) = match path.split_once("/-/") {
        Some((project, rest)) => (project.trim_matches('/'), Some(rest)),
        None => (path, None),
    };
    if project.is_empty() {
        return None;
    }
    let mut source = SkillSource {
        kind: "gitlab".to_owned(),
        repo: Some(project.to_owned()),
        ..SkillSource::default()
    };

    let Some(rest) = rest else {
        return Some(source);
    };
    let mut segments = rest.split('/');
    match segments.next() {
        Some(kind @ ("tree" | "blob")) => {
            let reference = segments.next().filter(|segment| !segment.is_empty())?;
            let skill_path = segments.collect::<Vec<_>>().join("/");
            if kind == "blob" && !skill_path.ends_with(SKILL_FILE_NAME) {
                return None;
            }
            source.reference = Some(reference.to_owned());
            source.skill_path = (!skill_path.is_empty()).then_some(skill_path);
            Some(source)
        }
        _ => None,
    }
}

pub fn validate_repo_slug(repo: &str) -> Result<(), String> {
    let segments: Vec<&str> = repo.split('/').collect();
    let valid = segments.len() >= 2
        && segments.iter().all(|segment| {
            !segment.is_empty()
                && segment
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
        });
    if valid {
        Ok(())
    } else {
        Err(format!("Invalid repository slug: {repo}"))
    }
}

pub fn github_raw_url(repo: &str, branch: &str, path: &str) -> String {
    format!(
        "{GITHUB_RAW_BASE}/{repo}/{}/{path}",
        urlencoding::encode(branch)
    )
}

pub fn gitlab_raw_url(repo: &str, branch: &str, path: &str) -> String {
    format!(
        "{GITLAB_RAW_BASE}/{repo}/-/raw/{}/{path}",
        urlencoding::encode(branch)
    )
}

/* =========================================================================
SKILL.md parsing
========================================================================= */

/// Splits a SKILL.md document into (name, description, body). The frontmatter
/// parser only understands flat `key: value` entries with optional quotes —
/// sufficient for the open agent skills format without a YAML dependency.
pub fn split_skill_markdown(raw: &str) -> (Option<String>, Option<String>, String) {
    let normalized = raw.trim_start_matches('\u{feff}').replace("\r\n", "\n");
    let mut lines = normalized.lines();

    if lines.next() != Some("---") {
        return (None, None, normalized);
    }

    let mut name = None;
    let mut description = None;
    let mut closed = false;
    for line in lines.by_ref() {
        if line.trim_end() == "---" {
            closed = true;
            break;
        }
        if let Some((key, value)) = split_frontmatter_entry(line) {
            match key.as_str() {
                "name" => name = Some(value),
                "description" => description = Some(value),
                _ => {}
            }
        }
    }

    if !closed {
        // Unterminated frontmatter: treat the whole document as content.
        return (None, None, normalized);
    }

    let body = lines.collect::<Vec<_>>().join("\n");
    (name, description, body.trim().to_owned())
}

fn split_frontmatter_entry(line: &str) -> Option<(String, String)> {
    let (key, raw_value) = line.split_once(':')?;
    let key = key.trim().to_ascii_lowercase();
    if key.is_empty()
        || !key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-'))
    {
        return None;
    }
    let mut value = raw_value.trim();
    if value.len() >= 2
        && ((value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\'')))
    {
        value = value[1..value.len() - 1].trim();
    }
    // Folded (`>`) and literal (`|`) block scalars are not supported.
    if value.starts_with('>') || value.starts_with('|') {
        return None;
    }
    Some((key, value.to_owned()))
}

pub fn infer_skill_name(skill_path: &str, repo: Option<&str>) -> String {
    skill_path
        .split('/')
        .rfind(|segment| !segment.is_empty() && *segment != SKILL_FILE_NAME)
        .filter(|segment| !segment.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            repo.and_then(|repo| repo.split('/').next_back())
                .map(str::to_owned)
        })
        .unwrap_or_else(|| "skill".to_owned())
}

fn is_skill_file_path(path: &str) -> bool {
    path.split('/').next_back() == Some(SKILL_FILE_NAME)
}

fn fallback_skill_name(source: &SkillSource) -> String {
    if let Some(path) = &source.skill_path {
        return infer_skill_name(path, source.repo.as_deref());
    }
    if let Some(url) = &source.url {
        let derived = url
            .trim_end_matches('/')
            .strip_suffix(SKILL_FILE_NAME)
            .and_then(|path| path.rsplit('/').next())
            .filter(|segment| !segment.is_empty());
        if let Some(derived) = derived {
            return derived.to_owned();
        }
    }
    "skill".to_owned()
}

fn skill_content_from_raw(raw: &str, source: &SkillSource) -> SkillContent {
    let (name, description, content) = split_skill_markdown(raw);
    SkillContent {
        name: name.unwrap_or_else(|| fallback_skill_name(source)),
        description: description.unwrap_or_default(),
        content,
        source: source.clone(),
    }
}

/* =========================================================================
HTTP helpers
========================================================================= */

fn skills_client() -> Result<Client, String> {
    Client::builder()
        .timeout(HTTP_REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("Failed to create skills client: {error}"))
}

fn truncate_hint(body: &str) -> String {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return "no response body".to_owned();
    }
    let mut hint: String = trimmed.chars().take(200).collect();
    if trimmed.chars().count() > 200 {
        hint.push('…');
    }
    hint
}

async fn fetch_text(client: &Client, url: &str, context: &str) -> Result<String, String> {
    let response = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|error| format!("{context} request failed: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read {context} response: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "{context} failed ({status}): {}",
            truncate_hint(&body)
        ));
    }
    if body.len() > SKILLS_MAX_CONTENT_BYTES {
        return Err(format!(
            "{context} exceeded the {SKILLS_MAX_CONTENT_BYTES} byte limit"
        ));
    }
    Ok(body)
}

async fn fetch_json(
    client: &Client,
    url: &str,
    context: &str,
) -> Result<serde_json::Value, String> {
    let response = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|error| format!("{context} request failed: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read {context} response: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "{context} failed ({status}): {}",
            truncate_hint(&body)
        ));
    }
    serde_json::from_str(&body).map_err(|error| format!("Invalid {context} response: {error}"))
}

async fn github_default_branch(client: &Client, repo: &str) -> Result<String, String> {
    let info = fetch_json(
        client,
        &format!("{GITHUB_API_BASE}/repos/{repo}"),
        "GitHub repository",
    )
    .await?;
    info.get("default_branch")
        .and_then(serde_json::Value::as_str)
        .map(str::to_owned)
        .filter(|branch| !branch.is_empty())
        .ok_or_else(|| format!("GitHub repository {repo} did not report a default branch"))
}

async fn gitlab_default_branch(client: &Client, repo: &str) -> Result<String, String> {
    let project = urlencoding::encode(repo);
    let info = fetch_json(
        client,
        &format!("{GITLAB_API_BASE}/projects/{project}"),
        "GitLab project",
    )
    .await?;
    info.get("default_branch")
        .and_then(serde_json::Value::as_str)
        .map(str::to_owned)
        .filter(|branch| !branch.is_empty())
        .ok_or_else(|| format!("GitLab project {repo} did not report a default branch"))
}

async fn resolve_branch(client: &Client, source: &SkillSource) -> Result<String, String> {
    let repo = source
        .repo
        .clone()
        .ok_or_else(|| "Skill source is missing a repository".to_owned())?;
    validate_repo_slug(&repo)?;
    if let Some(reference) = &source.reference {
        if !reference.is_empty() {
            return Ok(reference.clone());
        }
    }
    match source.kind.as_str() {
        "github" => github_default_branch(client, &repo).await,
        "gitlab" => gitlab_default_branch(client, &repo).await,
        other => Err(format!("Unsupported skill source kind: {other}")),
    }
}

/* =========================================================================
Discovery
========================================================================= */

async fn list_github_skill_paths(
    client: &Client,
    repo: &str,
    branch: &str,
    prefix: Option<&str>,
) -> Result<Vec<String>, String> {
    let tree = fetch_json(
        client,
        &format!(
            "{GITHUB_API_BASE}/repos/{repo}/git/trees/{}?recursive=1",
            urlencoding::encode(branch)
        ),
        "GitHub tree",
    )
    .await?;
    if tree
        .get("truncated")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false)
    {
        return Err(
            "GitHub repository tree is too large to list; install from a direct SKILL.md URL instead"
                .to_owned(),
        );
    }

    let mut paths = Vec::new();
    if let Some(entries) = tree.get("tree").and_then(serde_json::Value::as_array) {
        for entry in entries {
            if entry.get("type").and_then(serde_json::Value::as_str) != Some("blob") {
                continue;
            }
            let Some(path) = entry.get("path").and_then(serde_json::Value::as_str) else {
                continue;
            };
            if !is_skill_file_path(path) {
                continue;
            }
            if let Some(prefix) = prefix {
                if path != prefix && !path.starts_with(&format!("{prefix}/")) {
                    continue;
                }
            }
            paths.push(path.to_owned());
        }
    }
    Ok(paths)
}

async fn list_gitlab_skill_paths(
    client: &Client,
    repo: &str,
    branch: &str,
    prefix: Option<&str>,
) -> Result<Vec<String>, String> {
    let project = urlencoding::encode(repo);
    let branch_param = urlencoding::encode(branch);
    let mut page = 1u32;
    let mut paths = Vec::new();

    loop {
        let mut url = format!(
            "{GITLAB_API_BASE}/projects/{project}/repository/tree?recursive=true&per_page=100&page={page}&ref={branch_param}"
        );
        if let Some(prefix) = prefix {
            url.push_str(&format!("&path={}", urlencoding::encode(prefix)));
        }
        let response = client
            .get(&url)
            .header("User-Agent", USER_AGENT)
            .send()
            .await
            .map_err(|error| format!("GitLab tree request failed: {error}"))?;
        let status = response.status();
        let next_page = response
            .headers()
            .get("X-Next-Page")
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.trim().parse::<u32>().ok());
        let body = response
            .text()
            .await
            .map_err(|error| format!("Failed to read GitLab tree response: {error}"))?;

        if !status.is_success() {
            return Err(format!(
                "GitLab tree failed ({status}): {}",
                truncate_hint(&body)
            ));
        }
        let payload: serde_json::Value = serde_json::from_str(&body)
            .map_err(|error| format!("Invalid GitLab tree response: {error}"))?;
        if let Some(items) = payload.as_array() {
            for entry in items {
                if entry.get("type").and_then(serde_json::Value::as_str) != Some("blob") {
                    continue;
                }
                let Some(path) = entry.get("path").and_then(serde_json::Value::as_str) else {
                    continue;
                };
                if is_skill_file_path(path) {
                    paths.push(path.to_owned());
                }
            }
        }

        match next_page {
            Some(next) if next > page && page < MAX_GITLAB_TREE_PAGES => page = next,
            _ => break,
        }
    }
    Ok(paths)
}

async fn fetch_skill_listing(
    client: &Client,
    source: &SkillSource,
    skill_path: &str,
) -> Result<SkillListing, String> {
    let repo = source
        .repo
        .as_deref()
        .ok_or_else(|| "Skill source is missing a repository".to_owned())?;
    let branch = resolve_branch(client, source).await?;
    let url = match source.kind.as_str() {
        "github" => github_raw_url(repo, &branch, skill_path),
        "gitlab" => gitlab_raw_url(repo, &branch, skill_path),
        other => return Err(format!("Unsupported skill source kind: {other}")),
    };
    let raw = fetch_text(client, &url, "Skill download").await?;
    let (name, description, _) = split_skill_markdown(&raw);
    Ok(SkillListing {
        name: name.unwrap_or_else(|| infer_skill_name(skill_path, Some(repo))),
        description: description.unwrap_or_default(),
        skill_path: skill_path.to_owned(),
    })
}

async fn fetch_repo_skills(
    client: &Client,
    source: &SkillSource,
) -> Result<Vec<SkillListing>, String> {
    let repo = source
        .repo
        .clone()
        .ok_or_else(|| "Skill source is missing a repository".to_owned())?;
    let prefix = source
        .skill_path
        .clone()
        .map(|path| path.trim_matches('/').to_owned())
        .filter(|path| !path.is_empty());

    if let Some(path) = &prefix {
        if path.ends_with(SKILL_FILE_NAME) {
            return Ok(vec![fetch_skill_listing(client, source, path).await?]);
        }
    }

    let branch = resolve_branch(client, source).await?;
    let paths = match source.kind.as_str() {
        "github" => list_github_skill_paths(client, &repo, &branch, prefix.as_deref()).await?,
        "gitlab" => list_gitlab_skill_paths(client, &repo, &branch, prefix.as_deref()).await?,
        other => return Err(format!("Unsupported skill source kind: {other}")),
    };
    if paths.is_empty() {
        return Err("No SKILL.md files found at that source".to_owned());
    }

    let mut skills = Vec::new();
    for path in paths {
        let url = match source.kind.as_str() {
            "github" => github_raw_url(&repo, &branch, &path),
            _ => gitlab_raw_url(&repo, &branch, &path),
        };
        let raw = fetch_text(client, &url, "Skill download").await?;
        let (name, description, _) = split_skill_markdown(&raw);
        skills.push(SkillListing {
            name: name.unwrap_or_else(|| infer_skill_name(&path, Some(&repo))),
            description: description.unwrap_or_default(),
            skill_path: path,
        });
    }
    Ok(skills)
}

async fn discover_url_skill(
    client: &Client,
    source: &SkillSource,
) -> Result<Vec<SkillListing>, String> {
    let url = source
        .url
        .clone()
        .ok_or_else(|| "URL source is missing a URL".to_owned())?;
    let raw = fetch_text(client, &url, "Skill download").await?;
    let (name, description, _) = split_skill_markdown(&raw);
    let fallback = url
        .trim_end_matches('/')
        .strip_suffix(SKILL_FILE_NAME)
        .and_then(|path| path.rsplit('/').next())
        .filter(|segment| !segment.is_empty())
        .unwrap_or("skill");
    Ok(vec![SkillListing {
        name: name.unwrap_or_else(|| fallback.to_owned()),
        description: description.unwrap_or_default(),
        skill_path: url,
    }])
}

/* =========================================================================
Shared fetch + Tauri commands
========================================================================= */

async fn skills_fetch_source(
    client: &Client,
    source: &SkillSource,
) -> Result<SkillContent, String> {
    match source.kind.as_str() {
        "url" => {
            let url = source
                .url
                .clone()
                .ok_or_else(|| "URL source is missing a URL".to_owned())?;
            let raw = fetch_text(client, &url, "Skill download").await?;
            Ok(skill_content_from_raw(&raw, source))
        }
        "github" | "gitlab" => {
            let repo = source
                .repo
                .clone()
                .ok_or_else(|| "Skill source is missing a repository".to_owned())?;
            validate_repo_slug(&repo)?;
            let skill_path = source
                .skill_path
                .clone()
                .filter(|path| path.ends_with(SKILL_FILE_NAME))
                .ok_or_else(|| "Skill source is missing a SKILL.md path".to_owned())?;
            let branch = resolve_branch(client, source).await?;
            let url = match source.kind.as_str() {
                "github" => github_raw_url(&repo, &branch, &skill_path),
                _ => gitlab_raw_url(&repo, &branch, &skill_path),
            };
            let raw = fetch_text(client, &url, "Skill download").await?;
            Ok(skill_content_from_raw(&raw, source))
        }
        other => Err(format!("Unsupported skill source kind: {other}")),
    }
}

#[tauri::command]
pub async fn skills_resolve_source(source: String) -> Result<SkillsResolveResponse, String> {
    let parsed = parse_skill_source(&source)?;
    let client = skills_client()?;
    let skills = match parsed.kind.as_str() {
        "url" => discover_url_skill(&client, &parsed).await?,
        "github" | "gitlab" => fetch_repo_skills(&client, &parsed).await?,
        other => return Err(format!("Unsupported skill source kind: {other}")),
    };
    Ok(SkillsResolveResponse {
        source: parsed,
        skills,
    })
}

#[tauri::command]
pub async fn skills_fetch_skill(source: SkillSource) -> Result<SkillContent, String> {
    let client = skills_client()?;
    skills_fetch_source(&client, &source).await
}

#[tauri::command]
pub async fn skills_check_updates(
    sources: Vec<SkillSource>,
) -> Result<Vec<SkillUpdateInfo>, String> {
    let client = skills_client()?;
    let checks = sources.into_iter().enumerate().map(|(index, source)| {
        let client = client.clone();
        async move {
            match skills_fetch_source(&client, &source).await {
                Ok(content) => SkillUpdateInfo {
                    index,
                    name: content.name,
                    description: content.description,
                    content: content.content,
                    error: None,
                },
                Err(error) => SkillUpdateInfo {
                    index,
                    name: String::new(),
                    description: String::new(),
                    content: String::new(),
                    error: Some(error),
                },
            }
        }
    });
    Ok(join_all(checks).await)
}

/// Searches the skills.sh directory. The `/api/search` endpoint is the same
/// undocumented-but-unauthenticated endpoint the `skills` CLI uses; results
/// degrade gracefully (empty list) if the response shape ever changes.
#[tauri::command]
pub async fn skills_search_directory(
    query: String,
    limit: Option<u32>,
) -> Result<Vec<SkillDirectoryEntry>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err("Search query cannot be empty".to_owned());
    }
    let limit = limit.unwrap_or(10).clamp(1, 20).to_string();
    let client = skills_client()?;
    let response = client
        .get(SKILLS_DIRECTORY_API)
        .query(&[("q", trimmed), ("limit", limit.as_str())])
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|error| format!("skills.sh request failed: {error}"))?;
    let status: StatusCode = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read skills.sh response: {error}"))?;
    if !status.is_success() {
        return Err(format!(
            "skills.sh search failed ({status}): {}",
            truncate_hint(&body)
        ));
    }
    let payload: serde_json::Value = serde_json::from_str(&body)
        .map_err(|error| format!("Invalid skills.sh response: {error}"))?;

    let mut entries = Vec::new();
    let Some(skills) = payload.get("skills").and_then(serde_json::Value::as_array) else {
        return Ok(entries);
    };
    for skill in skills {
        let name = skill
            .get("name")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_owned();
        let source = skill
            .get("source")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_owned();
        if name.is_empty() || source.is_empty() {
            continue;
        }
        entries.push(SkillDirectoryEntry {
            id: skill
                .get("id")
                .and_then(serde_json::Value::as_str)
                .unwrap_or(&name)
                .to_owned(),
            name,
            installs: skill
                .get("installs")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0),
            source,
        });
    }
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_github_shorthand() {
        let parsed =
            parse_skill_source("vercel-labs/agent-skills").expect("shorthand should parse");
        assert_eq!(parsed.kind, "github");
        assert_eq!(parsed.repo.as_deref(), Some("vercel-labs/agent-skills"));
        assert!(parsed.skill_path.is_none());
        assert!(parsed.reference.is_none());
    }

    #[test]
    fn parses_github_repository_url() {
        let parsed = parse_skill_source("https://github.com/anthropics/skills/")
            .expect("repo URL should parse");
        assert_eq!(parsed.kind, "github");
        assert_eq!(parsed.repo.as_deref(), Some("anthropics/skills"));
        assert!(parsed.skill_path.is_none());
        assert!(parsed.reference.is_none());
    }

    #[test]
    fn parses_github_tree_url_with_reference_and_path() {
        let parsed =
            parse_skill_source("https://github.com/anthropics/skills/tree/main/skills/pdf")
                .expect("tree URL should parse");
        assert_eq!(parsed.reference.as_deref(), Some("main"));
        assert_eq!(parsed.skill_path.as_deref(), Some("skills/pdf"));
    }

    #[test]
    fn parses_github_blob_skill_url() {
        let parsed = parse_skill_source(
            "https://github.com/anthropics/skills/blob/main/skills/pdf/SKILL.md",
        )
        .expect("blob URL should parse");
        assert_eq!(parsed.reference.as_deref(), Some("main"));
        assert_eq!(parsed.skill_path.as_deref(), Some("skills/pdf/SKILL.md"));
    }

    #[test]
    fn rejects_github_blob_of_non_skill_files() {
        assert!(
            parse_skill_source("https://github.com/anthropics/skills/blob/main/README.md").is_err()
        );
    }

    #[test]
    fn parses_gitlab_tree_url() {
        let parsed =
            parse_skill_source("https://gitlab.com/gitlab-org/gitlab/-/tree/main/skills/one")
                .expect("GitLab URL should parse");
        assert_eq!(parsed.kind, "gitlab");
        assert_eq!(parsed.repo.as_deref(), Some("gitlab-org/gitlab"));
        assert_eq!(parsed.reference.as_deref(), Some("main"));
        assert_eq!(parsed.skill_path.as_deref(), Some("skills/one"));
    }

    #[test]
    fn parses_gitlab_project_url() {
        let parsed = parse_skill_source("https://gitlab.com/group/sub/repo")
            .expect("GitLab URL should parse");
        assert_eq!(parsed.kind, "gitlab");
        assert_eq!(parsed.repo.as_deref(), Some("group/sub/repo"));
    }

    #[test]
    fn parses_direct_skill_md_url() {
        let parsed = parse_skill_source("https://example.com/download/my-skill/SKILL.md")
            .expect("direct URL should parse");
        assert_eq!(parsed.kind, "url");
        assert_eq!(
            parsed.url.as_deref(),
            Some("https://example.com/download/my-skill/SKILL.md")
        );
    }

    #[test]
    fn rejects_unsupported_sources() {
        assert!(parse_skill_source("").is_err());
        assert!(parse_skill_source("just-a-name").is_err());
        assert!(parse_skill_source("https://example.com/no-skill-file").is_err());
    }

    #[test]
    fn validates_repo_slugs() {
        assert!(validate_repo_slug("vercel-labs/agent-skills").is_ok());
        assert!(validate_repo_slug("group/sub/repo").is_ok());
        assert!(validate_repo_slug("owner").is_err());
        assert!(validate_repo_slug("owner/repo?query=1").is_err());
        assert!(validate_repo_slug("owner/re po").is_err());
    }

    #[test]
    fn builds_raw_urls() {
        assert_eq!(
            github_raw_url("o/r", "main", "skills/x/SKILL.md"),
            "https://raw.githubusercontent.com/o/r/main/skills/x/SKILL.md"
        );
        assert_eq!(
            gitlab_raw_url("g/r", "main", "skills/x/SKILL.md"),
            "https://gitlab.com/g/r/-/raw/main/skills/x/SKILL.md"
        );
    }

    #[test]
    fn splits_frontmatter_and_body() {
        let (name, description, content) = split_skill_markdown(
            "---\nname: tdd\ndescription: Build features test-first\n---\n\n# Body\n",
        );
        assert_eq!(name.as_deref(), Some("tdd"));
        assert_eq!(description.as_deref(), Some("Build features test-first"));
        assert!(content.starts_with("# Body"));
    }

    #[test]
    fn handles_quoted_and_crlf_frontmatter() {
        let raw = "---\r\nname: \"quoted name\"\r\ndescription: 'single'\r\n---\r\nBody line\r\n";
        let (name, description, content) = split_skill_markdown(raw);
        assert_eq!(name.as_deref(), Some("quoted name"));
        assert_eq!(description.as_deref(), Some("single"));
        assert_eq!(content, "Body line");
    }

    #[test]
    fn treats_documents_without_frontmatter_as_body() {
        let (name, description, content) = split_skill_markdown("# Just a skill\n");
        assert!(name.is_none());
        assert!(description.is_none());
        assert!(content.starts_with("# Just a skill"));
    }

    #[test]
    fn falls_back_when_frontmatter_is_unterminated() {
        let raw = "---\nname: broken\nno closing delimiter\n";
        let (name, _, content) = split_skill_markdown(raw);
        assert!(name.is_none());
        assert!(content.contains("name: broken"));
    }

    #[test]
    fn infers_skill_names_from_paths() {
        assert_eq!(
            infer_skill_name("skills/web-design-guidelines/SKILL.md", None),
            "web-design-guidelines"
        );
        assert_eq!(infer_skill_name("SKILL.md", Some("owner/repo")), "repo");
        assert_eq!(infer_skill_name("SKILL.md", None), "skill");
    }
}
