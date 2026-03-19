import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { getClaudeConfigDir } from './installer.js';

const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// MARK: - OAuth token extraction

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

function getOAuthToken(): string | null {
  try {
    if (process.platform === 'darwin') {
      const service = getKeychainService();
      const raw = execSync(
        `security find-generic-password -s "${service}" -w 2>/dev/null`,
        { encoding: 'utf8' }
      ).trim();
      return extractToken(raw);
    }
    if (process.platform === 'linux') {
      const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
      const raw = fs.readFileSync(path.join(configDir, '.credentials.json'), 'utf8').trim();
      return extractToken(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

// MARK: - Profile cache

interface CachedProfile {
  email: string;
  fetched_at: number;
}

function getCacheFile(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
  const dir = path.join(getClaudeConfigDir(), 'cache');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
  return path.join(dir, `claudeline-profile-${hash}.json`);
}

function readCachedProfile(cacheFile: string): string | null {
  try {
    const cached: CachedProfile = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (Date.now() - cached.fetched_at < PROFILE_CACHE_TTL_MS) {
      return cached.email;
    }
  } catch {
    // no cache or invalid
  }
  return null;
}

// MARK: - Profile fetch

function fetchEmail(token: string): string | null {
  try {
    const result = execSync(
      `curl -s --max-time 5 -H "Content-Type: application/json" -H "User-Agent: claude-code/2.1.80" -H "Authorization: Bearer $__CLAUDE_TOKEN" -H "anthropic-beta: oauth-2025-04-20" "https://api.anthropic.com/api/oauth/profile"`,
      { encoding: 'utf8', env: { ...process.env, __CLAUDE_TOKEN: token } }
    ).trim();
    const data = JSON.parse(result);
    return data.account?.email ?? null;
  } catch {
    return null;
  }
}

// MARK: - Component evaluator

export function evaluateAccountComponent(key: string): string {
  if (key !== 'email') return '';

  const token = getOAuthToken();
  if (!token) return '';

  const cacheFile = getCacheFile(token);
  const cached = readCachedProfile(cacheFile);
  if (cached) return cached;

  const email = fetchEmail(token);
  if (email) {
    try {
      fs.writeFileSync(cacheFile, JSON.stringify({ email, fetched_at: Date.now() }));
    } catch { /* ignore */ }
  }
  return email ?? '';
}
