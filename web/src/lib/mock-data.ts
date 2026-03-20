import type { ClaudeInput } from './types';

export const MOCK_DATA: ClaudeInput = {
  hook_event_name: 'Status',
  session_id: 'abc123def456789',
  transcript_path: '/tmp/transcript.json',
  cwd: '/Users/demo/projects/myapp',
  model: {
    id: 'claude-sonnet-4-6',
    display_name: 'Sonnet',
    reasoning_effort: 'high',
  },
  workspace: {
    current_dir: '/Users/demo/projects/myapp',
    project_dir: '/Users/demo/projects/myapp',
  },
  version: '1.0.80',
  output_style: {
    name: 'default',
  },
  cost: {
    total_cost_usd: 0.0234,
    total_duration_ms: 125000,
    total_api_duration_ms: 4500,
    total_lines_added: 156,
    total_lines_removed: 23,
  },
  context_window: {
    total_input_tokens: 15234,
    total_output_tokens: 4521,
    context_window_size: 200000,
    used_percentage: 42.5,
    remaining_percentage: 57.5,
    current_usage: {
      input_tokens: 8500,
      output_tokens: 1200,
      cache_creation_input_tokens: 5000,
      cache_read_input_tokens: 2000,
    },
  },
  rate_limits: {
    five_hour: {
      used_percentage: 35,
      resets_at: Math.floor(Date.now() / 1000) + 10800,
    },
    seven_day: {
      used_percentage: 12,
      resets_at: Math.floor(Date.now() / 1000) + 432000,
    },
  },
};

export const MOCK_PRESETS: Record<string, { label: string; data: Partial<ClaudeInput> }> = {
  default: {
    label: 'Default Session',
    data: MOCK_DATA,
  },
  opus: {
    label: 'Opus - Heavy Usage',
    data: {
      ...MOCK_DATA,
      model: { id: 'claude-opus-4-6', display_name: 'Opus', reasoning_effort: 'high' },
      cost: { ...MOCK_DATA.cost, total_cost_usd: 1.47, total_duration_ms: 3600000, total_lines_added: 892, total_lines_removed: 234 },
      context_window: { ...MOCK_DATA.context_window, used_percentage: 78, remaining_percentage: 22, total_input_tokens: 120000, total_output_tokens: 36000 },
    },
  },
  haiku: {
    label: 'Haiku - Light Usage',
    data: {
      ...MOCK_DATA,
      model: { id: 'claude-haiku-4-5-20251001', display_name: 'Haiku' },
      cost: { ...MOCK_DATA.cost, total_cost_usd: 0.003, total_duration_ms: 15000, total_lines_added: 12, total_lines_removed: 3 },
      context_window: { ...MOCK_DATA.context_window, used_percentage: 8, remaining_percentage: 92, total_input_tokens: 3200, total_output_tokens: 800 },
    },
  },
  critical: {
    label: 'Near Context Limit',
    data: {
      ...MOCK_DATA,
      model: { id: 'claude-opus-4-6', display_name: 'Opus' },
      context_window: { ...MOCK_DATA.context_window, used_percentage: 94, remaining_percentage: 6, total_input_tokens: 178000, total_output_tokens: 10000 },
    },
  },
};
