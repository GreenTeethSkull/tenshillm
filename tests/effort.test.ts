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

import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_EFFORT_PARAM,
  applyEffortParam,
  isEffort,
  isEffortConfigured,
  isValidEffortParam,
  normalizeDefaultEffort,
  normalizeEffortParam,
  normalizeEfforts,
  resolveEffortConfig,
} from '../src/lib/effort';
import type { ModelConfig } from '../src/types';

function model(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return {
    id: 'model-1',
    modelId: 'demo-model',
    displayName: 'Demo',
    supportsVision: false,
    supportsTools: false,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    efforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    effortParam: 'reasoning_effort',
    ...overrides,
  };
}

describe('effort levels', () => {
  test('accepts only the known effort levels', () => {
    expect(isEffort('low')).toBe(true);
    expect(isEffort('max')).toBe(true);
    expect(isEffort('extreme')).toBe(false);
    expect(isEffort('')).toBe(false);
    expect(isEffort(null)).toBe(false);
    expect(isEffort(3)).toBe(false);
  });

  test('normalizes effort lists by dropping unknown values and duplicates', () => {
    expect(normalizeEfforts(['high', 'low', 'low', 'nope', 'max'])).toEqual(['low', 'high', 'max']);
    expect(normalizeEfforts(undefined)).toEqual([]);
    expect(normalizeEfforts('high')).toEqual([]);
    expect(normalizeEfforts([1, null, {}])).toEqual([]);
  });

  test('keeps a default effort only when the model enables it', () => {
    expect(normalizeDefaultEffort('high', ['low', 'high'])).toBe('high');
    expect(normalizeDefaultEffort('xhigh', ['low', 'high'])).toBeNull();
    expect(normalizeDefaultEffort('nope', ['low'])).toBeNull();
    expect(normalizeDefaultEffort(undefined, [])).toBeNull();
  });
});

describe('effort parameter names', () => {
  test('accepts plain identifiers only', () => {
    expect(isValidEffortParam('reasoning_effort')).toBe(true);
    expect(isValidEffortParam('effort-level')).toBe(true);
    expect(isValidEffortParam('')).toBe(false);
    expect(isValidEffortParam('9effort')).toBe(false);
    expect(isValidEffortParam('reasoning effort')).toBe(false);
    expect(isValidEffortParam('reasoning.effort')).toBe(false);
    expect(isValidEffortParam('__proto__')).toBe(false);
    expect(isValidEffortParam('constructor')).toBe(false);
    expect(isValidEffortParam(undefined)).toBe(false);
  });

  test('falls back to the default parameter name for invalid input', () => {
    expect(normalizeEffortParam(undefined)).toBe(DEFAULT_EFFORT_PARAM);
    expect(normalizeEffortParam('bad name')).toBe(DEFAULT_EFFORT_PARAM);
    expect(normalizeEffortParam('constructor')).toBe(DEFAULT_EFFORT_PARAM);
    expect(normalizeEffortParam('effort')).toBe('effort');
    // An explicit empty string disables the effort parameter entirely.
    expect(normalizeEffortParam('')).toBe('');
  });
});

describe('effort resolution', () => {
  test('is configured only with enabled levels and a valid parameter', () => {
    expect(isEffortConfigured(model())).toBe(true);
    expect(isEffortConfigured(model({ efforts: [] }))).toBe(false);
    expect(isEffortConfigured(model({ effortParam: '' }))).toBe(false);
    expect(isEffortConfigured(model({ effortParam: 'bad name' }))).toBe(false);
  });

  test('prefers the conversation selection when the model still enables it', () => {
    expect(resolveEffortConfig(model(), 'high')).toEqual({
      param: 'reasoning_effort',
      value: 'high',
    });
  });

  test('falls back to the model default for missing or stale selections', () => {
    expect(resolveEffortConfig(model(), null)).toEqual({
      param: 'reasoning_effort',
      value: 'medium',
    });
    expect(resolveEffortConfig(model(), 'xhigh')).toEqual({
      param: 'reasoning_effort',
      value: 'medium',
    });
  });

  test('omits the parameter when nothing valid is selected', () => {
    expect(resolveEffortConfig(model({ defaultEffort: null }), null)).toBeNull();
    expect(resolveEffortConfig(model({ defaultEffort: 'max' }), 'max')).toBeNull();
    expect(resolveEffortConfig(model({ efforts: [] }), 'high')).toBeNull();
    expect(resolveEffortConfig(model({ effortParam: '' }), 'high')).toBeNull();
    expect(resolveEffortConfig(model(), undefined)).toEqual({
      param: 'reasoning_effort',
      value: 'medium',
    });
  });
});

describe('effort payload application', () => {
  test('sets the level under the configured body key', () => {
    const payload = { model: 'demo-model', stream: true };
    expect(applyEffortParam(payload, { param: 'effort', value: 'xhigh' })).toEqual({
      model: 'demo-model',
      stream: true,
      effort: 'xhigh',
    });
  });

  test('leaves the payload untouched without a valid config', () => {
    const payload = { model: 'demo-model' };
    expect(applyEffortParam(payload, null)).toBe(payload);
    expect(applyEffortParam(payload, { param: '__proto__', value: 'high' })).toBe(payload);
    expect(applyEffortParam(payload, { param: 'bad name', value: 'high' })).toBe(payload);
    expect(applyEffortParam(payload, { param: 'effort', value: 'nope' as never })).toBe(payload);
  });
});
