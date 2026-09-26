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

import type { Effort, ModelConfig } from '../types';
import { EFFORT_LEVELS } from '../types';

export const DEFAULT_EFFORT_PARAM = 'reasoning_effort';

// The effort parameter becomes a dynamic JSON body key, so it must be a plain
// identifier. This also blocks prototype-polluting keys like `__proto__`.
export const EFFORT_PARAM_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

const RESERVED_BODY_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isEffort(value: unknown): value is Effort {
  return typeof value === 'string' && (EFFORT_LEVELS as string[]).includes(value);
}

// Keeps only known levels, drops duplicates and restores canonical order.
export function normalizeEfforts(value: unknown): Effort[] {
  if (!Array.isArray(value)) return [];
  const selected = new Set(value.filter(isEffort));
  return EFFORT_LEVELS.filter((level) => selected.has(level));
}

export function normalizeDefaultEffort(value: unknown, efforts: Effort[]): Effort | null {
  return isEffort(value) && efforts.includes(value) ? value : null;
}

export function isValidEffortParam(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    EFFORT_PARAM_PATTERN.test(value) &&
    !RESERVED_BODY_KEYS.has(value)
  );
}

// Empty string means "no parameter configured" (effort disabled); anything
// else must be a valid identifier and falls back to the default otherwise.
export function normalizeEffortParam(value: unknown): string {
  if (typeof value === 'string' && value.trim() === '') return '';
  return isValidEffortParam(value) ? value : DEFAULT_EFFORT_PARAM;
}

export interface EffortParamConfig {
  param: string;
  value: Effort;
}

export type EffortCapableModel = Pick<ModelConfig, 'efforts' | 'defaultEffort' | 'effortParam'>;

// Effort is only usable when the model enables at least one level and has a
// valid body parameter to carry it.
export function isEffortConfigured(model: EffortCapableModel): boolean {
  return model.efforts.length > 0 && isValidEffortParam(model.effortParam);
}

// Resolves the effort actually sent for a request:
// - the conversation's explicit selection when the model still enables it,
// - otherwise the model's default effort,
// - otherwise nothing (the parameter is omitted).
export function resolveEffortConfig(
  model: EffortCapableModel,
  requested: Effort | null | undefined
): EffortParamConfig | null {
  if (!isEffortConfigured(model)) return null;

  const candidate =
    isEffort(requested) && model.efforts.includes(requested) ? requested : model.defaultEffort;
  if (!candidate || !model.efforts.includes(candidate)) return null;

  return { param: model.effortParam, value: candidate };
}

// Attaches the effort level under the model's configured body key. The key is
// re-validated here because the payload leaves this module as raw JSON.
export function applyEffortParam<T extends object>(
  payload: T,
  config: EffortParamConfig | null
): T {
  if (!config || !isValidEffortParam(config.param) || !isEffort(config.value)) return payload;
  return { ...payload, [config.param]: config.value };
}
