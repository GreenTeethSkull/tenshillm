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
