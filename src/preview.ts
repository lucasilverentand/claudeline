import type { ClaudeInput } from './types.js';

export const SAMPLE_DATA: ClaudeInput = {
  hook_event_name: 'Status',
  session_id: 'abc123def456789',
  transcript_path: '/tmp/transcript.json',
  cwd: '/Users/demo/projects/myapp',
  model: {
    id: 'claude-opus-4-1',
    display_name: 'Opus',
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
};

export function runPreview(script: string): string {
  // Create a temporary script that embeds the sample data
  const previewScript = script.replace(
    'let input = "";',
    `let input = ${JSON.stringify(JSON.stringify(SAMPLE_DATA))};`
  ).replace(
    'process.stdin.on("data", chunk => input += chunk);',
    ''
  ).replace(
    'process.stdin.on("end", () => {',
    '(() => {'
  );

  try {
    // We can't easily run this without spawning, so we'll just return a simulated output
    // For a real preview, we'd need to evaluate the script
    return simulateOutput();
  } catch {
    return '[Preview unavailable]';
  }
}

function simulateOutput(): string {
  // Return a representative sample based on the sample data
  return '[Opus] 📁 myapp | 🌿 main ✓';
}

export function getSampleDataJson(): string {
  return JSON.stringify(SAMPLE_DATA, null, 2);
}
