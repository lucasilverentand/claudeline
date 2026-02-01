// Context window components
export const contextComponents: Record<string, string> = {
  percent: 'Math.round(data.context_window?.used_percentage || 0) + "%"',
  remaining: 'Math.round(data.context_window?.remaining_percentage || 0) + "%"',
  tokens: `(() => {
    const used = (data.context_window?.total_input_tokens || 0) + (data.context_window?.total_output_tokens || 0);
    const total = data.context_window?.context_window_size || 200000;
    return formatTokens(used) + "/" + formatTokens(total);
  })()`,
  in: 'formatTokens(data.context_window?.total_input_tokens || 0)',
  out: 'formatTokens(data.context_window?.total_output_tokens || 0)',
  size: 'formatTokens(data.context_window?.context_window_size || 200000)',
  bar: `(() => {
    const pct = data.context_window?.used_percentage || 0;
    const width = 10;
    const filled = Math.round(pct / 100 * width);
    return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
  })()`,
  emoji: `(() => {
    const pct = data.context_window?.used_percentage || 0;
    if (pct < 50) return "🟢";
    if (pct < 75) return "🟡";
    if (pct < 90) return "🟠";
    return "🔴";
  })()`,
  'used-tokens': `(() => {
    const used = (data.context_window?.total_input_tokens || 0) + (data.context_window?.total_output_tokens || 0);
    return formatTokens(used);
  })()`,
};

// Dynamic bar width: ctx:bar:5 for width of 5
export function getContextComponent(key: string, args?: string): string | null {
  if (key === 'bar' && args) {
    const width = parseInt(args, 10) || 10;
    return `(() => {
      const pct = data.context_window?.used_percentage || 0;
      const width = ${width};
      const filled = Math.round(pct / 100 * width);
      return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
    })()`;
  }
  return contextComponents[key] || null;
}
