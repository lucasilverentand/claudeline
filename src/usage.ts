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

function formatPaceIcon(delta: number, noColor: boolean): string {
  const icon = delta > 10 ? '\uf0e7' : delta < -10 ? '\uf017' : '\uf00c';
  if (noColor) return icon;
  const { fg, bold } = barColorFromDelta(delta);
  if (fg === null) return icon;
  return `\x1b[0;${bold ? '1;' : ''}${fg}m${icon}\x1b[0m`;
}

function formatPaceDelta(delta: number, noColor: boolean): string {
  const rounded = Math.round(delta);
  let text: string;
  if (rounded > 0) text = '+' + rounded + '%';
  else if (rounded < 0) text = rounded + '%';
  else text = '±0%';
  if (noColor) return text;
  const { fg, bold } = barColorFromDelta(delta);
  if (fg === null) return text;
  return `\x1b[0;${bold ? '1;' : ''}${fg}m${text}\x1b[0m`;
}

function barColorFromDelta(delta: number): { fg: number | null; bold: boolean } {
  // delta > 0 means ahead of pace (using too fast)
  if (delta > 15) return { fg: 31, bold: true };   // bold red — will hit limit early
  if (delta > 5) return { fg: 31, bold: false };    // red — overpacing
  return { fg: null, bold: false };                  // default foreground — fine
}

function makeBar(pct: number, width: number, noColor: boolean, delta = 0, label?: string): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const filledStr = '█'.repeat(filled);
  const emptyStr = '░'.repeat(empty);

  if (noColor) return (label || '') + filledStr + emptyStr;
  const { fg, bold } = barColorFromDelta(delta);
  if (fg === null) {
    const bar = `${filledStr}\x1b[2m${emptyStr}\x1b[0m`;
    return label ? label + bar : bar;
  }
  const boldStr = bold ? '1;' : '';
  const fillColor = `\x1b[0;${boldStr}${fg}m`;
  const dimColor = `\x1b[0;2;${fg}m`;
  const bar = `${fillColor}${filledStr}\x1b[0m${dimColor}${emptyStr}\x1b[0m`;
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
      const { delta } = calculatePace(fiveHour.used_percentage, fiveHour.resets_at, FIVE_HOUR_MS);
      return makeBar(fiveHour.used_percentage, width, noColor, delta);
    }
    case 'week-bar':
    case '7d-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      const { delta } = calculatePace(sevenDay.used_percentage, sevenDay.resets_at, SEVEN_DAY_MS);
      return makeBar(sevenDay.used_percentage, width, noColor, delta);
    }
    case '5h-icon': {
      const { delta } = calculatePace(fiveHour.used_percentage, fiveHour.resets_at, FIVE_HOUR_MS);
      const { fg, bold } = barColorFromDelta(delta);
      const icon = '\uf111';
      if (noColor || fg === null) return icon;
      return `\x1b[0;${bold ? '1;' : ''}${fg}m${icon}\x1b[0m`;
    }
    case 'week-icon':
    case '7d-icon': {
      const { delta } = calculatePace(sevenDay.used_percentage, sevenDay.resets_at, SEVEN_DAY_MS);
      const { fg, bold } = barColorFromDelta(delta);
      const icon = '\uf111';
      if (noColor || fg === null) return icon;
      return `\x1b[0;${bold ? '1;' : ''}${fg}m${icon}\x1b[0m`;
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
