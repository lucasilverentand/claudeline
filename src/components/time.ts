// Time components
export const timeComponents: Record<string, string> = {
  now: 'new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })',
  seconds: 'new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })',
  '12h': 'new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })',
  date: 'new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })',
  full: 'new Date().toISOString().split("T")[0]',
  iso: 'new Date().toISOString()',
  unix: 'Math.floor(Date.now() / 1000).toString()',
  weekday: 'new Date().toLocaleDateString("en-US", { weekday: "short" })',
  'weekday-long': 'new Date().toLocaleDateString("en-US", { weekday: "long" })',
  month: 'new Date().toLocaleDateString("en-US", { month: "short" })',
  'month-long': 'new Date().toLocaleDateString("en-US", { month: "long" })',
  year: 'new Date().getFullYear().toString()',
  day: 'new Date().getDate().toString()',
  hour: 'new Date().getHours().toString().padStart(2, "0")',
  minute: 'new Date().getMinutes().toString().padStart(2, "0")',
  elapsed: `(() => {
    const ms = data.cost?.total_duration_ms || 0;
    if (ms < 60000) return Math.round(ms / 1000) + "s";
    if (ms < 3600000) return Math.round(ms / 60000) + "m";
    return Math.round(ms / 3600000) + "h";
  })()`,
};

export function getTimeComponent(key: string): string | null {
  return timeComponents[key] || null;
}
