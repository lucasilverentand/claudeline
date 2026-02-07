import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { getClaudeConfigDir } from './installer.js';

interface UsageWindow {
  utilization: number;
  resets_at: string;
}

interface UsageData {
  five_hour: UsageWindow;
  seven_day: UsageWindow;
}

interface ProfileData {
  account: {
    full_name: string;
    display_name: string;
    email: string;
  };
  organization: {
    name: string;
    organization_type: string;
    rate_limit_tier: string;
  };
}

interface CachedUsage {
  data: UsageData;
  fetched_at: number;
}

interface CachedProfile {
  data: ProfileData;
  fetched_at: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
}

function getCacheFile(token: string, type: 'usage' | 'profile'): string {
  const dir = path.join(getClaudeConfigDir(), 'cache');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
  return path.join(dir, `claudeline-${type}-${tokenHash(token)}.json`);
}

function readCache(cacheFile: string): CachedUsage | null {
  try {
    const raw = fs.readFileSync(cacheFile, 'utf8');
    const cached: CachedUsage = JSON.parse(raw);
    if (Date.now() - cached.fetched_at < CACHE_TTL_MS) {
      return cached;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

function writeCache(cacheFile: string, data: UsageData): void {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify({ data, fetched_at: Date.now() }));
  } catch {
    // ignore write errors
  }
}

function getKeychainService(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    const suffix = crypto.createHash('sha256').update(configDir).digest('hex').slice(0, 8);
    return `Claude Code-credentials-${suffix}`;
  }
  return 'Claude Code-credentials';
}

function getOAuthToken(): string | null {
  try {
    const service = getKeychainService();
    const raw = execSync(
      `security find-generic-password -s "${service}" -w 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    // The keychain value is a JSON string containing the token
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    // Handle nested structure: { claudeAiOauth: { accessToken: "..." } }
    if (parsed.claudeAiOauth?.accessToken) return parsed.claudeAiOauth.accessToken;
    if (parsed.accessToken) return parsed.accessToken;
    if (parsed.access_token) return parsed.access_token;
    return null;
  } catch {
    return null;
  }
}

function fetchUsage(token: string): UsageData | null {
  try {
    const result = execSync(
      `curl -s --max-time 5 -H "Authorization: Bearer ${token}" -H "anthropic-beta: oauth-2025-04-20" "https://api.anthropic.com/api/oauth/usage"`,
      { encoding: 'utf8' }
    ).trim();
    const data = JSON.parse(result);
    if (data.five_hour && data.seven_day) {
      return data as UsageData;
    }
    return null;
  } catch {
    return null;
  }
}

function getUsageData(): UsageData | null {
  const token = getOAuthToken();
  if (!token) return null;

  const cacheFile = getCacheFile(token, 'usage');
  const cached = readCache(cacheFile);
  if (cached) return cached.data;

  const data = fetchUsage(token);
  if (data) {
    writeCache(cacheFile, data);
  }
  return data;
}

function formatTimeUntil(isoDate: string): string {
  const reset = new Date(isoDate).getTime();
  const now = Date.now();
  let diff = Math.max(0, reset - now);

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

function calculatePace(window: UsageWindow, windowDurationMs: number): { target: number; delta: number } {
  const resetMs = new Date(window.resets_at).getTime();
  const remainingMs = Math.max(0, resetMs - Date.now());
  const elapsedFraction = 1 - (remainingMs / windowDurationMs);
  const target = elapsedFraction * 100;
  const delta = window.utilization - target;
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

function readProfileCache(cacheFile: string): CachedProfile | null {
  try {
    const raw = fs.readFileSync(cacheFile, 'utf8');
    const cached: CachedProfile = JSON.parse(raw);
    if (Date.now() - cached.fetched_at < PROFILE_CACHE_TTL_MS) {
      return cached;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

function writeProfileCache(cacheFile: string, data: ProfileData): void {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify({ data, fetched_at: Date.now() }));
  } catch {
    // ignore write errors
  }
}

function fetchProfile(token: string): ProfileData | null {
  try {
    const result = execSync(
      `curl -s --max-time 5 -H "Authorization: Bearer ${token}" -H "anthropic-beta: oauth-2025-04-20" "https://api.anthropic.com/api/oauth/profile"`,
      { encoding: 'utf8' }
    ).trim();
    const data = JSON.parse(result);
    if (data.account?.email) {
      return data as ProfileData;
    }
    return null;
  } catch {
    return null;
  }
}

function getProfileData(): ProfileData | null {
  const token = getOAuthToken();
  if (!token) return null;

  const cacheFile = getCacheFile(token, 'profile');
  const cached = readProfileCache(cacheFile);
  if (cached) return cached.data;

  const data = fetchProfile(token);
  if (data) {
    writeProfileCache(cacheFile, data);
  }
  return data;
}

export function evaluateAccountComponent(key: string): string {
  const data = getProfileData();
  if (!data) return '';

  switch (key) {
    case 'email':
      return data.account.email;
    case 'name':
      return data.account.full_name;
    case 'display-name':
      return data.account.display_name;
    case 'org':
      return data.organization.name;
    case 'plan':
      return data.organization.organization_type;
    case 'tier':
      return data.organization.rate_limit_tier;
    default:
      return '';
  }
}

export function evaluateUsageComponent(key: string, args?: string, noColor = false): string {
  const data = getUsageData();
  if (!data) return '';

  switch (key) {
    case '5h':
      return Math.round(data.five_hour.utilization) + '%';
    case 'week':
    case '7d':
      return Math.round(data.seven_day.utilization) + '%';
    case '5h-reset':
      return formatTimeUntil(data.five_hour.resets_at);
    case 'week-reset':
    case '7d-reset':
      return formatTimeUntil(data.seven_day.resets_at);
    case '5h-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      return makeBar(data.five_hour.utilization, width, 'H');
    }
    case 'week-bar':
    case '7d-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      return makeBar(data.seven_day.utilization, width, 'W');
    }
    case '5h-icon': {
      const pct = data.five_hour.utilization;
      const icon = '\uf111';
      if (pct < 50) return `\x1b[0;32m${icon}\x1b[0m`;
      if (pct < 75) return `\x1b[0;33m${icon}\x1b[0m`;
      if (pct < 90) return `\x1b[0;31m${icon}\x1b[0m`;
      return `\x1b[0;1;31m${icon}\x1b[0m`;
    }
    case 'week-icon':
    case '7d-icon': {
      const pct = data.seven_day.utilization;
      const icon = '\uf111';
      if (pct < 50) return `\x1b[0;32m${icon}\x1b[0m`;
      if (pct < 75) return `\x1b[0;33m${icon}\x1b[0m`;
      if (pct < 90) return `\x1b[0;31m${icon}\x1b[0m`;
      return `\x1b[0;1;31m${icon}\x1b[0m`;
    }
    case '5h-target': {
      const { target } = calculatePace(data.five_hour, FIVE_HOUR_MS);
      return Math.round(target) + '%';
    }
    case 'week-target':
    case '7d-target': {
      const { target } = calculatePace(data.seven_day, SEVEN_DAY_MS);
      return Math.round(target) + '%';
    }
    case '5h-pace': {
      const { delta } = calculatePace(data.five_hour, FIVE_HOUR_MS);
      return formatPaceDelta(delta, noColor);
    }
    case 'week-pace':
    case '7d-pace': {
      const { delta } = calculatePace(data.seven_day, SEVEN_DAY_MS);
      return formatPaceDelta(delta, noColor);
    }
    case '5h-pace-icon': {
      const { delta } = calculatePace(data.five_hour, FIVE_HOUR_MS);
      return formatPaceIcon(delta, noColor);
    }
    case 'week-pace-icon':
    case '7d-pace-icon': {
      const { delta } = calculatePace(data.seven_day, SEVEN_DAY_MS);
      return formatPaceIcon(delta, noColor);
    }
    default:
      return '';
  }
}
