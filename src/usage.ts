import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

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
const CACHE_FILE = path.join(os.tmpdir(), 'claudeline-usage-cache.json');
const PROFILE_CACHE_FILE = path.join(os.tmpdir(), 'claudeline-profile-cache.json');

function readCache(): CachedUsage | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const cached: CachedUsage = JSON.parse(raw);
    if (Date.now() - cached.fetched_at < CACHE_TTL_MS) {
      return cached;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

function writeCache(data: UsageData): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ data, fetched_at: Date.now() }));
  } catch {
    // ignore write errors
  }
}

function getOAuthToken(): string | null {
  try {
    const raw = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
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

function fetchUsage(): UsageData | null {
  const token = getOAuthToken();
  if (!token) return null;

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
  const cached = readCache();
  if (cached) return cached.data;

  const data = fetchUsage();
  if (data) {
    writeCache(data);
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

function makeBar(pct: number, width: number, label?: string): string {
  const filled = Math.round((pct / 100) * width);
  const bar = '▰'.repeat(filled) + '▱'.repeat(width - filled);
  return label ? label + bar : bar;
}

function readProfileCache(): CachedProfile | null {
  try {
    const raw = fs.readFileSync(PROFILE_CACHE_FILE, 'utf8');
    const cached: CachedProfile = JSON.parse(raw);
    if (Date.now() - cached.fetched_at < PROFILE_CACHE_TTL_MS) {
      return cached;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

function writeProfileCache(data: ProfileData): void {
  try {
    fs.writeFileSync(PROFILE_CACHE_FILE, JSON.stringify({ data, fetched_at: Date.now() }));
  } catch {
    // ignore write errors
  }
}

function fetchProfile(): ProfileData | null {
  const token = getOAuthToken();
  if (!token) return null;

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
  const cached = readProfileCache();
  if (cached) return cached.data;

  const data = fetchProfile();
  if (data) {
    writeProfileCache(data);
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

export function evaluateUsageComponent(key: string, args?: string): string {
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
    case '5h-emoji': {
      const pct = data.five_hour.utilization;
      if (pct < 50) return '🟢';
      if (pct < 75) return '🟡';
      if (pct < 90) return '🟠';
      return '🔴';
    }
    case 'week-emoji':
    case '7d-emoji': {
      const pct = data.seven_day.utilization;
      if (pct < 50) return '🟢';
      if (pct < 75) return '🟡';
      if (pct < 90) return '🟠';
      return '🔴';
    }
    default:
      return '';
  }
}
