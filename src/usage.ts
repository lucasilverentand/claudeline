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
  email: string;
}

// MARK: - Clusage API file integration

interface ClusageAPIWindow {
  utilization: number;
  resetsAt: string;
}

interface ClusageAPIMomentum {
  velocity: number;
  acceleration: number;
  intensity: string;
  etaToCeiling: number | null;
  resetsFirst: boolean;
}

interface ClusageAPIProjection {
  sevenDayVelocity: number;
  projectedAtReset: number;
  dailyBudget: number;
  dailyProjected: number;
  remainingDays: number;
  status: string;
  granularSevenDayUtilization: number | null;
}

interface ClusageAPIAccount {
  id: string;
  name: string;
  fiveHour: ClusageAPIWindow;
  sevenDay: ClusageAPIWindow;
  profile: {
    email: string;
  } | null;
  momentum: ClusageAPIMomentum | null;
  projection: ClusageAPIProjection | null;
}

interface ClusageAPIPayload {
  version: number;
  updatedAt: string;
  accounts: ClusageAPIAccount[];
}

const CLUSAGE_API_FILE = path.join(os.homedir(), '.claude', 'clusage-api.json');
const CLUSAGE_STALE_MS = 10 * 60 * 1000; // 10 minutes

let _clusageCache: ClusageAPIPayload | null = null;

function readClusageAPI(): ClusageAPIPayload | null {
  try {
    const raw = fs.readFileSync(CLUSAGE_API_FILE, 'utf8');
    const payload: ClusageAPIPayload = JSON.parse(raw);
    if (!payload.updatedAt || !payload.accounts?.length) return null;
    const age = Date.now() - new Date(payload.updatedAt).getTime();
    if (age > CLUSAGE_STALE_MS) return null;
    _clusageCache = payload;
    return payload;
  } catch {
    return null;
  }
}

function getClusageAccount(): ClusageAPIAccount | null {
  const payload = _clusageCache ?? readClusageAPI();
  if (!payload || payload.accounts.length === 0) return null;
  return payload.accounts[0];
}

// MARK: - Direct API fallback

interface CachedData<T> {
  data: T;
  fetched_at: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ANTHROPIC_BETA_HEADER = 'oauth-2025-04-20';

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
}

function getCacheFile(token: string, type: 'usage' | 'profile'): string {
  const dir = path.join(getClaudeConfigDir(), 'cache');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
  return path.join(dir, `claudeline-${type}-${tokenHash(token)}.json`);
}

function readCache<T>(cacheFile: string, ttlMs: number): T | null {
  try {
    const raw = fs.readFileSync(cacheFile, 'utf8');
    const cached: CachedData<T> = JSON.parse(raw);
    if (Date.now() - cached.fetched_at < ttlMs) {
      return cached.data;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

function writeCache<T>(cacheFile: string, data: T): void {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify({ data, fetched_at: Date.now() }));
  } catch {
    // ignore write errors
  }
}

function extractToken(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed.claudeAiOauth?.accessToken) return parsed.claudeAiOauth.accessToken;
    if (parsed.accessToken) return parsed.accessToken;
    if (parsed.access_token) return parsed.access_token;
  } catch {
    // not valid JSON
  }
  return null;
}

function getKeychainService(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    const suffix = crypto.createHash('sha256').update(configDir).digest('hex').slice(0, 8);
    return `Claude Code-credentials-${suffix}`;
  }
  return 'Claude Code-credentials';
}

function getOAuthTokenMacOS(): string | null {
  try {
    const service = getKeychainService();
    const raw = execSync(
      `security find-generic-password -s "${service}" -w 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    return extractToken(raw);
  } catch {
    return null;
  }
}

function getOAuthTokenLinux(): string | null {
  try {
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const credPath = path.join(configDir, '.credentials.json');
    const raw = fs.readFileSync(credPath, 'utf8').trim();
    return extractToken(raw);
  } catch {
    return null;
  }
}

function getOAuthToken(): string | null {
  switch (process.platform) {
    case 'darwin':
      return getOAuthTokenMacOS();
    case 'linux':
      return getOAuthTokenLinux();
    default:
      return null;
  }
}

function apiGet(token: string, urlPath: string): string | null {
  try {
    return execSync(
      `curl -s --max-time 5 -H "Authorization: Bearer $__CLAUDE_TOKEN" -H "anthropic-beta: ${ANTHROPIC_BETA_HEADER}" "https://api.anthropic.com${urlPath}"`,
      { encoding: 'utf8', env: { ...process.env, __CLAUDE_TOKEN: token } }
    ).trim();
  } catch {
    return null;
  }
}

function fetchUsageDirect(token: string): UsageData | null {
  try {
    const result = apiGet(token, '/api/oauth/usage');
    if (!result) return null;
    const data = JSON.parse(result);
    if (data.five_hour && data.seven_day) return data as UsageData;
    return null;
  } catch {
    return null;
  }
}

function fetchProfileDirect(token: string): ProfileData | null {
  try {
    const result = apiGet(token, '/api/oauth/profile');
    if (!result) return null;
    const data = JSON.parse(result);
    if (data.account?.email) return { email: data.account.email };
    return null;
  } catch {
    return null;
  }
}

function getUsageDataDirect(): UsageData | null {
  const token = getOAuthToken();
  if (!token) return null;

  const cacheFile = getCacheFile(token, 'usage');
  const cached = readCache<UsageData>(cacheFile, CACHE_TTL_MS);
  if (cached) return cached;

  const data = fetchUsageDirect(token);
  if (data) writeCache(cacheFile, data);
  return data;
}

function getProfileDataDirect(): ProfileData | null {
  const token = getOAuthToken();
  if (!token) return null;

  const cacheFile = getCacheFile(token, 'profile');
  const cached = readCache<ProfileData>(cacheFile, PROFILE_CACHE_TTL_MS);
  if (cached) return cached;

  const data = fetchProfileDirect(token);
  if (data) writeCache(cacheFile, data);
  return data;
}

// MARK: - Unified data access (clusage first, direct API fallback)

function getUsageData(): UsageData | null {
  const account = getClusageAccount();
  if (account) {
    return {
      five_hour: {
        utilization: account.fiveHour.utilization,
        resets_at: account.fiveHour.resetsAt,
      },
      seven_day: {
        utilization: account.sevenDay.utilization,
        resets_at: account.sevenDay.resetsAt,
      },
    };
  }
  return getUsageDataDirect();
}

function getProfileData(): ProfileData | null {
  const account = getClusageAccount();
  if (account?.profile) {
    return { email: account.profile.email };
  }
  return getProfileDataDirect();
}

// MARK: - Formatting helpers

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

// MARK: - Component evaluators

export function evaluateAccountComponent(key: string): string {
  const data = getProfileData();
  if (!data) return '';

  switch (key) {
    case 'email':
      return data.email;
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
    // Clusage-only momentum/projection data (no direct API fallback)
    case 'velocity': {
      const m = getClusageAccount()?.momentum;
      return m ? m.velocity.toFixed(1) + ' pp/hr' : '';
    }
    case 'intensity': {
      const m = getClusageAccount()?.momentum;
      return m?.intensity ?? '';
    }
    case 'eta': {
      const m = getClusageAccount()?.momentum;
      if (!m?.etaToCeiling) return '';
      const h = Math.floor(m.etaToCeiling / 3600);
      const min = Math.floor((m.etaToCeiling % 3600) / 60);
      return h > 0 ? `${h}h ${min}m` : `${min}m`;
    }
    case '7d-granular': {
      const p = getClusageAccount()?.projection;
      return p?.granularSevenDayUtilization != null
        ? p.granularSevenDayUtilization.toFixed(1) + '%'
        : '';
    }
    case '7d-projected': {
      const p = getClusageAccount()?.projection;
      return p ? Math.round(p.projectedAtReset) + '%' : '';
    }
    case 'budget': {
      const p = getClusageAccount()?.projection;
      return p ? p.dailyBudget.toFixed(1) + ' pp/day' : '';
    }
    case 'budget-status': {
      const p = getClusageAccount()?.projection;
      return p?.status ?? '';
    }
    default:
      return '';
  }
}
