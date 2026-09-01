import { invoke } from '@tauri-apps/api/core';
import type {
  SkillContentResult,
  SkillDirectoryEntry,
  SkillSource,
  SkillListing,
  SkillsResolveResult,
  SkillUpdateInfo,
} from '@/types';

export async function resolveSkillSource(source: string): Promise<SkillsResolveResult> {
  return invoke<SkillsResolveResult>('skills_resolve_source', { source });
}

export async function fetchSkill(source: SkillSource): Promise<SkillContentResult> {
  return invoke<SkillContentResult>('skills_fetch_skill', { source });
}

export async function checkSkillUpdates(sources: SkillSource[]): Promise<SkillUpdateInfo[]> {
  return invoke<SkillUpdateInfo[]>('skills_check_updates', { sources });
}

export async function searchSkillDirectory(query: string, limit = 10): Promise<SkillDirectoryEntry[]> {
  return invoke<SkillDirectoryEntry[]>('skills_search_directory', { query, limit });
}

export function skillSourceForListing(base: SkillSource, listing: SkillListing): SkillSource {
  if (base.kind === 'url') return base;
  return { ...base, skillPath: listing.skillPath };
}

export function formatInstalls(installs: number): string {
  if (!Number.isFinite(installs) || installs <= 0) return '';
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(installs);
}
