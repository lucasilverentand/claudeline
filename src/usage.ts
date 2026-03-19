import type { ClaudeInput } from './types.js';

// MARK: - Formatting helpers

function formatTimeUntil(resetUnix: number): string {
  const now = Date.now();
  let diff = Math.max(0, resetUnix * 1000 - now);

  if (diff === 0) return 'now';

  const days = Math.floor(diff / 86400000);
  diff %= 86400000;
  const hours = Math.floor(diff / 3600000);
  diff %= 3600000;
  const minutes = Math.floor(diff / 60000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAY_MS = 7 * 24 * 60 * 60 * 1000;

function calculatePace(
  usedPct: number,
  resetUnix: number,
  windowDurationMs: number
): { target: number; delta: number } {
  const resetMs = resetUnix * 1000;
  const remainingMs = Math.max(0, resetMs - Date.now());
  const elapsedFraction = 1 - remainingMs / windowDurationMs;
  const target = elapsedFraction * 100;
  const delta = usedPct - target;
  return { target, delta };
}

function paceColor(delta: number): string {
  if (delta > 10) return '\x1b[0;33m'; // yellow — overpacing
  if (delta < -10) return '\x1b[0;36m'; // cyan — underpacing
  return '\x1b[0;32m'; // green — on pace
}

function formatPaceIcon(delta: number, noColor: boolean): string {
  const icon = delta > 10 ? '\uf0e7' : delta < -10 ? '\uf017' : '\uf00c';
  if (noColor) return icon;
  return `${paceColor(delta)}${icon}\x1b[0m`;
}

function formatPaceDelta(delta: number, noColor: boolean): string {
  const rounded = Math.round(delta);
  let text: string;
  if (rounded > 0) text = '+' + rounded + '%';
  else if (rounded < 0) text = rounded + '%';
  else text = '±0%';
  if (noColor) return text;
  return `${paceColor(delta)}${text}\x1b[0m`;
}

function makeBar(pct: number, width: number, label?: string): string {
  const filled = Math.round((pct / 100) * width);
  const bar = '▰'.repeat(filled) + '▱'.repeat(width - filled);
  return label ? label + bar : bar;
}

// MARK: - Component evaluator

export function evaluateUsageComponent(
  key: string,
  data: Partial<ClaudeInput>,
  args?: string,
  noColor = false
): string {
  const limits = data.rate_limits;
  if (!limits) return '';

  const fiveHour = limits.five_hour;
  const sevenDay = limits.seven_day;

  switch (key) {
    case '5h':
      return Math.round(fiveHour.used_percentage) + '%';
    case 'week':
    case '7d':
      return Math.round(sevenDay.used_percentage) + '%';
    case '5h-reset':
      return formatTimeUntil(fiveHour.resets_at);
    case 'week-reset':
    case '7d-reset':
      return formatTimeUntil(sevenDay.resets_at);
    case '5h-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      return makeBar(fiveHour.used_percentage, width, 'H');
    }
    case 'week-bar':
    case '7d-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      return makeBar(sevenDay.used_percentage, width, 'W');
    }
    case '5h-icon': {
      const pct = fiveHour.used_percentage;
      const icon = '\uf111';
      if (pct < 50) return `\x1b[0;32m${icon}\x1b[0m`;
      if (pct < 75) return `\x1b[0;33m${icon}\x1b[0m`;
      if (pct < 90) return `\x1b[0;31m${icon}\x1b[0m`;
      return `\x1b[0;1;31m${icon}\x1b[0m`;
    }
    case 'week-icon':
    case '7d-icon': {
      const pct = sevenDay.used_percentage;
      const icon = '\uf111';
      if (pct < 50) return `\x1b[0;32m${icon}\x1b[0m`;
      if (pct < 75) return `\x1b[0;33m${icon}\x1b[0m`;
      if (pct < 90) return `\x1b[0;31m${icon}\x1b[0m`;
      return `\x1b[0;1;31m${icon}\x1b[0m`;
    }
    case '5h-target': {
      const { target } = calculatePace(fiveHour.used_percentage, fiveHour.resets_at, FIVE_HOUR_MS);
      return Math.round(target) + '%';
    }
    case 'week-target':
    case '7d-target': {
      const { target } = calculatePace(sevenDay.used_percentage, sevenDay.resets_at, SEVEN_DAY_MS);
      return Math.round(target) + '%';
    }
    case '5h-pace': {
      const { delta } = calculatePace(fiveHour.used_percentage, fiveHour.resets_at, FIVE_HOUR_MS);
      return formatPaceDelta(delta, noColor);
    }
    case 'week-pace':
    case '7d-pace': {
      const { delta } = calculatePace(sevenDay.used_percentage, sevenDay.resets_at, SEVEN_DAY_MS);
      return formatPaceDelta(delta, noColor);
    }
    case '5h-pace-icon': {
      const { delta } = calculatePace(fiveHour.used_percentage, fiveHour.resets_at, FIVE_HOUR_MS);
      return formatPaceIcon(delta, noColor);
    }
    case 'week-pace-icon':
    case '7d-pace-icon': {
      const { delta } = calculatePace(sevenDay.used_percentage, sevenDay.resets_at, SEVEN_DAY_MS);
      return formatPaceIcon(delta, noColor);
    }
    default:
      return '';
  }
}
