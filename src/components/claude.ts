// Claude-specific components
export const claudeComponents: Record<string, string> = {
  model: 'data.model?.display_name || "Claude"',
  'model-id': 'data.model?.id || ""',
  'model-letter': '((data.model?.display_name || "C")[0].toUpperCase())',
  version: 'data.version || ""',
  session: '(data.session_id || "").slice(0, 8)',
  'session-full': 'data.session_id || ""',
  style: 'data.output_style?.name || "default"',
};

export function getClaudeComponent(key: string): string | null {
  return claudeComponents[key] || null;
}
