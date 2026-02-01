// Cost/usage components
export const costComponents: Record<string, string> = {
  total: '"$" + (data.cost?.total_cost_usd || 0).toFixed(2)',
  'total-cents': 'Math.round((data.cost?.total_cost_usd || 0) * 100) + "¢"',
  duration: 'formatDuration(data.cost?.total_duration_ms || 0)',
  api: 'formatDuration(data.cost?.total_api_duration_ms || 0)',
  'api-duration': 'formatDuration(data.cost?.total_api_duration_ms || 0)',
  lines: `(() => {
    const added = data.cost?.total_lines_added || 0;
    const removed = data.cost?.total_lines_removed || 0;
    const net = added - removed;
    return (net >= 0 ? "+" : "") + net;
  })()`,
  added: '"+" + (data.cost?.total_lines_added || 0)',
  removed: '"-" + (data.cost?.total_lines_removed || 0)',
  'lines-added': '"+" + (data.cost?.total_lines_added || 0)',
  'lines-removed': '"-" + (data.cost?.total_lines_removed || 0)',
  'lines-both': `(() => {
    const added = data.cost?.total_lines_added || 0;
    const removed = data.cost?.total_lines_removed || 0;
    return "+" + added + " -" + removed;
  })()`,
};

export function getCostComponent(key: string): string | null {
  return costComponents[key] || null;
}
