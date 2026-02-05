import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { parseFormat } from './parser.js';
import { getSeparator } from './separators.js';
import { getEmoji } from './emojis.js';
import { COLORS, RESET } from './colors.js';
import type { ParsedComponent, ClaudeInput } from './types.js';
import { evaluateUsageComponent, evaluateAccountComponent } from './usage.js';
import { getNerdIcon } from './nerdfonts.js';

export interface RuntimeOptions {
  noEmoji: boolean;
  noColor: boolean;
}

// Helper functions (same as in generated scripts)
function formatTokens(n: number): string {
  if (n >= 1000000) return Math.round(n / 1000000) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return n.toString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  if (ms < 3600000) return Math.round(ms / 60000) + 'm';
  return (ms / 3600000).toFixed(1) + 'h';
}

function execCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function applyStyles(text: string, styles: string[], noColor: boolean): string {
  if (noColor || styles.length === 0 || !text) return text;

  const codes = styles.map(s => COLORS[s]).filter(Boolean);
  if (codes.length === 0) return text;

  return `\x1b[${codes.join(';')}m${text}\x1b[${RESET}m`;
}

// Component evaluators
function evaluateClaudeComponent(key: string, data: Partial<ClaudeInput>): string {
  switch (key) {
    case 'model':
      return data.model?.display_name || 'Claude';
    case 'model-id':
      return data.model?.id || '';
    case 'model-letter':
      return (data.model?.display_name || 'C')[0].toUpperCase();
    case 'version':
      return data.version || '';
    case 'session':
      return (data.session_id || '').slice(0, 8);
    case 'session-full':
      return data.session_id || '';
    case 'style':
      return data.output_style?.name || 'default';
    default:
      return '';
  }
}

function evaluateFsComponent(key: string, data: Partial<ClaudeInput>): string {
  switch (key) {
    case 'path':
      return data.workspace?.current_dir || data.cwd || '';
    case 'dir':
      return path.basename(data.workspace?.current_dir || data.cwd || '');
    case 'project':
      return path.basename(data.workspace?.project_dir || '');
    case 'project-path':
      return data.workspace?.project_dir || '';
    case 'home':
      return (data.workspace?.current_dir || data.cwd || '').replace(os.homedir(), '~');
    case 'cwd':
      return data.cwd || '';
    case 'relative': {
      const curr = data.workspace?.current_dir || '';
      const proj = data.workspace?.project_dir || '';
      if (proj && curr.startsWith(proj)) {
        return curr.slice(proj.length + 1) || '.';
      }
      return path.basename(curr);
    }
    default:
      return '';
  }
}

function evaluateGitComponent(key: string, noColor = false): string {
  switch (key) {
    case 'branch':
      return execCommand('git branch --show-current 2>/dev/null');
    case 'status':
      try {
        execSync('git diff --quiet 2>/dev/null');
        return '✓';
      } catch {
        return '*';
      }
    case 'status-emoji':
      try {
        execSync('git diff --quiet 2>/dev/null');
        return '✨';
      } catch {
        return '📝';
      }
    case 'status-word':
      try {
        execSync('git diff --quiet 2>/dev/null');
        return 'clean';
      } catch {
        return 'dirty';
      }
    case 'ahead': {
      const n = execCommand('git rev-list --count @{u}..HEAD 2>/dev/null');
      return n && n !== '0' ? '↑' + n : '';
    }
    case 'behind': {
      const n = execCommand('git rev-list --count HEAD..@{u} 2>/dev/null');
      return n && n !== '0' ? '↓' + n : '';
    }
    case 'ahead-behind': {
      const ahead = execCommand('git rev-list --count @{u}..HEAD 2>/dev/null');
      const behind = execCommand('git rev-list --count HEAD..@{u} 2>/dev/null');
      let result = '';
      if (ahead && ahead !== '0') result += '↑' + ahead;
      if (behind && behind !== '0') result += '↓' + behind;
      return result;
    }
    case 'stash': {
      const n = execCommand('git stash list 2>/dev/null | wc -l').trim();
      return n && n !== '0' ? '⚑' + n : '';
    }
    case 'staged': {
      const n = execCommand('git diff --cached --numstat 2>/dev/null | wc -l').trim();
      return n && n !== '0' ? '●' + n : '';
    }
    case 'modified': {
      const n = execCommand('git diff --numstat 2>/dev/null | wc -l').trim();
      return n && n !== '0' ? '+' + n : '';
    }
    case 'untracked': {
      const n = execCommand('git ls-files --others --exclude-standard 2>/dev/null | wc -l').trim();
      return n && n !== '0' ? '?' + n : '';
    }
    case 'dirty': {
      const staged = parseInt(execCommand('git diff --cached --numstat 2>/dev/null | wc -l')) || 0;
      const modified = parseInt(execCommand('git diff --numstat 2>/dev/null | wc -l')) || 0;
      const untracked = parseInt(execCommand('git ls-files --others --exclude-standard 2>/dev/null | wc -l')) || 0;
      if (staged === 0 && modified === 0 && untracked === 0) return '';
      const parts: string[] = [];
      if (noColor) {
        if (staged > 0) parts.push('+' + staged);
        if (untracked > 0) parts.push('-' + untracked);
        if (modified > 0) parts.push('~' + modified);
      } else {
        const r = `\x1b[${RESET}m`;
        if (staged > 0) parts.push(`\x1b[${COLORS.green}m+${staged}${r}`);
        if (untracked > 0) parts.push(`\x1b[${COLORS.red}m-${untracked}${r}`);
        if (modified > 0) parts.push(`\x1b[${COLORS.yellow}m~${modified}${r}`);
      }
      return parts.join(' ');
    }
    case 'commit':
      return execCommand('git rev-parse --short HEAD 2>/dev/null');
    case 'commit-long':
      return execCommand('git rev-parse HEAD 2>/dev/null');
    case 'tag':
      return execCommand('git describe --tags --abbrev=0 2>/dev/null');
    case 'remote':
      return execCommand('git remote 2>/dev/null').split('\n')[0] || '';
    case 'repo':
      return path.basename(execCommand('git rev-parse --show-toplevel 2>/dev/null'));
    case 'repo-branch': {
      const r = path.basename(execCommand('git rev-parse --show-toplevel 2>/dev/null'));
      const b = execCommand('git branch --show-current 2>/dev/null');
      return r && b ? `${r}:${b}` : r || b;
    }
    case 'user':
      return execCommand('git config user.name 2>/dev/null');
    case 'email':
      return execCommand('git config user.email 2>/dev/null');
    case 'remote-url':
      return execCommand('git remote get-url origin 2>/dev/null');
    default:
      return '';
  }
}

function evaluateContextComponent(key: string, data: Partial<ClaudeInput>, args?: string): string {
  const ctx = data.context_window;
  switch (key) {
    case 'percent':
      return Math.round(ctx?.used_percentage || 0) + '%';
    case 'remaining':
      return Math.round(ctx?.remaining_percentage || 0) + '%';
    case 'tokens': {
      const used = (ctx?.total_input_tokens || 0) + (ctx?.total_output_tokens || 0);
      const total = ctx?.context_window_size || 200000;
      return formatTokens(used) + '/' + formatTokens(total);
    }
    case 'in':
      return formatTokens(ctx?.total_input_tokens || 0);
    case 'out':
      return formatTokens(ctx?.total_output_tokens || 0);
    case 'size':
      return formatTokens(ctx?.context_window_size || 200000);
    case 'bar': {
      const pct = ctx?.used_percentage || 0;
      const width = args ? parseInt(args, 10) || 10 : 10;
      const filled = Math.round((pct / 100) * width);
      return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
    }
    case 'emoji': {
      const pct = ctx?.used_percentage || 0;
      if (pct < 50) return '🟢';
      if (pct < 75) return '🟡';
      if (pct < 90) return '🟠';
      return '🔴';
    }
    case 'used-tokens': {
      const used = (ctx?.total_input_tokens || 0) + (ctx?.total_output_tokens || 0);
      return formatTokens(used);
    }
    default:
      return '';
  }
}

function evaluateCostComponent(key: string, data: Partial<ClaudeInput>): string {
  const cost = data.cost;
  switch (key) {
    case 'total':
      return '$' + (cost?.total_cost_usd || 0).toFixed(2);
    case 'total-cents':
      return Math.round((cost?.total_cost_usd || 0) * 100) + '¢';
    case 'duration':
      return formatDuration(cost?.total_duration_ms || 0);
    case 'api':
    case 'api-duration':
      return formatDuration(cost?.total_api_duration_ms || 0);
    case 'lines': {
      const added = cost?.total_lines_added || 0;
      const removed = cost?.total_lines_removed || 0;
      const net = added - removed;
      return (net >= 0 ? '+' : '') + net;
    }
    case 'added':
    case 'lines-added':
      return '+' + (cost?.total_lines_added || 0);
    case 'removed':
    case 'lines-removed':
      return '-' + (cost?.total_lines_removed || 0);
    case 'lines-both': {
      const added = cost?.total_lines_added || 0;
      const removed = cost?.total_lines_removed || 0;
      return '+' + added + ' -' + removed;
    }
    default:
      return '';
  }
}

function evaluateEnvComponent(key: string): string {
  switch (key) {
    case 'node':
      return execCommand('node --version 2>/dev/null');
    case 'node-short':
      return execCommand('node --version 2>/dev/null').replace('v', '');
    case 'bun':
      return execCommand('bun --version 2>/dev/null');
    case 'npm':
      return execCommand('npm --version 2>/dev/null');
    case 'pnpm':
      return execCommand('pnpm --version 2>/dev/null');
    case 'yarn':
      return execCommand('yarn --version 2>/dev/null');
    case 'python':
      return execCommand('python3 --version 2>/dev/null || python --version 2>/dev/null').replace('Python ', '');
    case 'deno':
      return execCommand('deno --version 2>/dev/null').split('\n')[0].replace('deno ', '');
    case 'rust':
      return execCommand('rustc --version 2>/dev/null').split(' ')[1] || '';
    case 'go':
      return execCommand('go version 2>/dev/null').split(' ')[2]?.replace('go', '') || '';
    case 'ruby':
      return execCommand('ruby --version 2>/dev/null').split(' ')[1] || '';
    case 'java': {
      const output = execCommand('java -version 2>&1');
      const match = output.match(/"([^"]+)"/);
      return match?.[1] || '';
    }
    case 'user':
      return os.userInfo().username;
    case 'hostname':
      return os.hostname();
    case 'hostname-short':
      return os.hostname().split('.')[0];
    case 'shell':
      return path.basename(process.env.SHELL || '');
    case 'term':
      return process.env.TERM || '';
    case 'os':
      return process.platform;
    case 'arch':
      return process.arch;
    case 'os-release':
      return os.release();
    case 'cpus':
      return os.cpus().length.toString();
    case 'memory':
      return Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB';
    default:
      return '';
  }
}

function evaluateTimeComponent(key: string, data: Partial<ClaudeInput>): string {
  const now = new Date();
  switch (key) {
    case 'now':
      return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'seconds':
      return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    case '12h':
      return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    case 'date':
      return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'full':
      return now.toISOString().split('T')[0];
    case 'iso':
      return now.toISOString();
    case 'unix':
      return Math.floor(Date.now() / 1000).toString();
    case 'weekday':
      return now.toLocaleDateString('en-US', { weekday: 'short' });
    case 'weekday-long':
      return now.toLocaleDateString('en-US', { weekday: 'long' });
    case 'month':
      return now.toLocaleDateString('en-US', { month: 'short' });
    case 'month-long':
      return now.toLocaleDateString('en-US', { month: 'long' });
    case 'year':
      return now.getFullYear().toString();
    case 'day':
      return now.getDate().toString();
    case 'hour':
      return now.getHours().toString().padStart(2, '0');
    case 'minute':
      return now.getMinutes().toString().padStart(2, '0');
    case 'elapsed': {
      const ms = data.cost?.total_duration_ms || 0;
      if (ms < 60000) return Math.round(ms / 1000) + 's';
      if (ms < 3600000) return Math.round(ms / 60000) + 'm';
      return Math.round(ms / 3600000) + 'h';
    }
    default:
      return '';
  }
}

function evaluateCondition(condition: string): boolean {
  switch (condition) {
    case 'git':
      try {
        execSync('git rev-parse --git-dir 2>/dev/null');
        return true;
      } catch {
        return false;
      }
    case 'dirty':
      try {
        execSync('git diff --quiet 2>/dev/null');
        return false;
      } catch {
        return true;
      }
    case 'clean':
      try {
        execSync('git diff --quiet 2>/dev/null');
        return true;
      } catch {
        return false;
      }
    case 'subdir': {
      const root = execCommand('git rev-parse --show-toplevel 2>/dev/null');
      return root !== '' && process.cwd() !== root;
    }
    case 'node':
      return fs.existsSync('package.json');
    case 'python':
      return fs.existsSync('pyproject.toml') || fs.existsSync('setup.py') || fs.existsSync('requirements.txt');
    case 'rust':
      return fs.existsSync('Cargo.toml');
    case 'go':
      return fs.existsSync('go.mod');
    default:
      return true;
  }
}

function evaluateComponent(
  comp: ParsedComponent,
  data: Partial<ClaudeInput>,
  options: RuntimeOptions
): string {
  let result = '';

  switch (comp.type) {
    case 'claude':
      result = evaluateClaudeComponent(comp.key, data);
      break;
    case 'fs':
      result = evaluateFsComponent(comp.key, data);
      break;
    case 'git':
      result = evaluateGitComponent(comp.key, options.noColor);
      break;
    case 'ctx':
      result = evaluateContextComponent(comp.key, data, comp.args);
      break;
    case 'cost':
      result = evaluateCostComponent(comp.key, data);
      break;
    case 'env':
      result = evaluateEnvComponent(comp.key);
      break;
    case 'usage':
      result = evaluateUsageComponent(comp.key, comp.args);
      break;
    case 'account':
      result = evaluateAccountComponent(comp.key);
      break;
    case 'time':
      result = evaluateTimeComponent(comp.key, data);
      break;
    case 'sep':
      result = getSeparator(comp.key);
      break;
    case 'emoji':
      result = options.noEmoji ? '' : getEmoji(comp.key);
      break;
    case 'nerd':
      result = options.noEmoji ? '' : getNerdIcon(comp.key);
      break;
    case 'text':
      result = comp.key;
      break;
    case 'group': {
      if (comp.children) {
        const inner = evaluateComponents(comp.children, data, options);
        const brackets: Record<string, [string, string]> = {
          square: ['[', ']'],
          paren: ['(', ')'],
          curly: ['{', '}'],
          angle: ['<', '>'],
        };
        const [open, close] = brackets[comp.key] || ['[', ']'];
        result = open + inner + close;
      }
      break;
    }
    case 'conditional': {
      if (comp.children && evaluateCondition(comp.key)) {
        result = evaluateComponents(comp.children, data, options);
      }
      break;
    }
  }

  // Apply styles
  return applyStyles(result, comp.styles, options.noColor);
}

function evaluateComponents(
  components: ParsedComponent[],
  data: Partial<ClaudeInput>,
  options: RuntimeOptions
): string {
  const parts: string[] = [];

  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const prev = components[i - 1];
    const value = evaluateComponent(comp, data, options);

    // Add space between non-separator components
    if (i > 0 && comp.type !== 'sep' && comp.type !== 'conditional' && prev?.type !== 'sep' && value) {
      parts.push(' ');
    }

    if (value) {
      parts.push(value);
    }
  }

  return parts.join('');
}

export function evaluateFormat(
  format: string,
  data: Partial<ClaudeInput>,
  options: Partial<RuntimeOptions> = {}
): string {
  const opts: RuntimeOptions = {
    noEmoji: options.noEmoji ?? false,
    noColor: options.noColor ?? false,
  };

  const components = parseFormat(format);
  const result = evaluateComponents(components, data, opts);
  // Ensure trailing ANSI reset so styles don't leak between renders
  return opts.noColor ? result : result + `\x1b[0m`;
}
