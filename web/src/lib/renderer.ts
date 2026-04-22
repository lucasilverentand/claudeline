/**
 * Browser-compatible claudeline renderer.
 * Outputs HTML spans with CSS classes instead of ANSI escape codes.
 */

import type { ParsedComponent, ClaudeInput } from './types';

// --- CSS color mapping (ANSI → CSS class names) ---

const STYLE_PREFIXES = new Set([
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey',
  'bright-red', 'bright-green', 'bright-yellow', 'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white',
  'bg-black', 'bg-red', 'bg-green', 'bg-yellow', 'bg-blue', 'bg-magenta', 'bg-cyan', 'bg-white',
  'bold', 'dim', 'italic', 'underline', 'blink', 'inverse', 'hidden', 'strikethrough',
]);

// --- Nerd font icons (subset for browser, using Unicode) ---

const NERD_ICONS: Record<string, string> = {
  'folder': '\uf07b', 'folder-open': '\uf07c', 'file': '\uf15b', 'file-code': '\uf1c9',
  'branch': '\ue725', 'repo': '\uf401', 'commit': '\uf417', 'merge': '\uf419',
  'tag': '\uf412', 'stash': '\uf01c', 'pr': '\uf407', 'diff': '\uf440', 'compare': '\uf47d',
  'check': '\uf00c', 'x': '\uf00d', 'warn': '\uf071', 'error': '\uf057',
  'info': '\uf05a', 'question': '\uf059', 'bell': '\uf0f3', 'pin': '\uf08d',
  'star': '\uf005', 'fire': '\uf490', 'rocket': '\uf135', 'sparkle': '\uf005',
  'lightning': '\uf0e7', 'heart': '\uf004', 'diamond': '\uf219', 'circle': '\uf111',
  'square': '\uf0c8', 'triangle': '\uf0d8',
  'node': '\ue718', 'python': '\ue73c', 'rust': '\ue7a8', 'go': '\ue626',
  'ruby': '\ue739', 'java': '\ue738', 'docker': '\ue7b0', 'terminal': '\uf120',
  'code': '\uf121', 'database': '\uf1c0', 'cloud': '\uf0c2', 'server': '\uf233',
  'package': '\uf487', 'gear': '\uf013', 'lock': '\uf023', 'unlock': '\uf09c',
  'key': '\uf084', 'shield': '\uf132',
  'circle-green': '\uf111', 'circle-yellow': '\uf111', 'circle-orange': '\uf111', 'circle-red': '\uf111',
  'up': '\uf062', 'down': '\uf063', 'left': '\uf060', 'right': '\uf061',
  'arrow-right': '\uf061', 'arrow-left': '\uf060',
  'clock': '\uf017', 'calendar': '\uf073', 'history': '\uf1da',
  'money': '\uf0d6', 'dollar': '\uf155',
  'apple': '\uf179', 'linux': '\uf17c', 'windows': '\uf17a',
  'search': '\uf002', 'eye': '\uf06e', 'bug': '\uf188', 'wrench': '\uf0ad',
  'plug': '\uf1e6', 'wifi': '\uf1eb', 'bluetooth': '\uf293', 'cpu': '\uf2db',
  'memory': '\uf538', 'home': '\uf015', 'user': '\uf007',
};

// Common nf-* glyph codes (subset of the full nf-glyphs.json)
const NF_GLYPHS: Record<string, string> = {
  'cod-folder': 'ea83', 'cod-home': 'eb06', 'dev-git_branch': 'e725',
  'dev-nodejs_small': 'e718', 'fa-dollar_sign': 'f155', 'fa-clock': 'f017',
  'fa-gauge': 'f624', 'fa-stopwatch': 'f2f2', 'md-source_branch': 'f062c',
  'fa-brain': 'f5dc',
};

function getNerdIcon(name: string): string {
  if (NERD_ICONS[name]) return NERD_ICONS[name];
  if (name.startsWith('nf-')) {
    const key = name.slice(3);
    const code = NF_GLYPHS[key];
    if (code) return String.fromCodePoint(parseInt(code, 16));
  }
  return '';
}

// --- Separators ---

const SEPARATORS: Record<string, string> = {
  pipe: ' | ', arrow: ' → ', 'arrow-left': ' ← ', 'arrow-right': ' → ',
  chevron: ' › ', 'chevron-left': ' ‹ ', dot: ' • ', middot: ' · ',
  dash: ' - ', slash: ' / ', backslash: ' \\ ', space: ' ', none: '',
  colon: ': ', 'double-colon': ' :: ', tilde: ' ~ ', 'double-pipe': ' ‖ ',
  bullet: ' ◦ ', diamond: ' ◇ ', star: ' ★ ',
  newline: '\n', br: '\n',
  powerline: '\ue0b0', 'powerline-left': '\ue0b2',
  'powerline-thin': '\ue0b1', 'powerline-thin-left': '\ue0b3',
};

function getSeparator(name: string): string {
  return SEPARATORS[name] ?? ' | ';
}

// --- Parser (browser-compatible port) ---

export function parseFormat(format: string): ParsedComponent[] {
  const normalized = format.trim();
  const components: ParsedComponent[] = [];
  let i = 0;

  while (i < normalized.length) {
    while (i < normalized.length && /\s/.test(normalized[i])) i++;
    if (i >= normalized.length) break;

    // Brackets
    if ('[({<'.includes(normalized[i])) {
      const open = normalized[i];
      const close = open === '[' ? ']' : open === '(' ? ')' : open === '{' ? '}' : '>';
      const bracketType = open === '[' ? 'square' : open === '(' ? 'paren' : open === '{' ? 'curly' : 'angle';
      let depth = 1, j = i + 1;
      while (j < normalized.length && depth > 0) {
        if (normalized[j] === open) depth++;
        else if (normalized[j] === close) depth--;
        j++;
      }
      const inner = normalized.slice(i + 1, j - 1);
      components.push({ type: 'group', key: bracketType, styles: [], children: parseFormat(inner) });
      i = j;
      continue;
    }

    // Conditionals
    if (normalized.slice(i, i + 3) === 'if:') {
      let condEnd = i + 3;
      while (condEnd < normalized.length && normalized[condEnd] !== '(') condEnd++;
      const condition = normalized.slice(i + 3, condEnd);
      if (normalized[condEnd] === '(') {
        let depth = 1, j = condEnd + 1;
        while (j < normalized.length && depth > 0) {
          if (normalized[j] === '(') depth++;
          else if (normalized[j] === ')') depth--;
          j++;
        }
        const inner = normalized.slice(condEnd + 1, j - 1);
        components.push({ type: 'conditional', key: condition, condition, styles: [], children: parseFormat(inner) });
        i = j;
      } else {
        i = condEnd;
      }
      continue;
    }

    // Token
    let tokenEnd = i;
    while (tokenEnd < normalized.length && !/[\s,\[\](){}<>]/.test(normalized[tokenEnd])) tokenEnd++;
    const token = normalized.slice(i, tokenEnd);
    if (token && token !== ',') {
      const component = parseComponent(token);
      if (component) components.push(component);
    }
    i = tokenEnd;
    while (i < normalized.length && (normalized[i] === ',' || /\s/.test(normalized[i]))) i++;
  }

  return components;
}

function parseComponent(token: string): ParsedComponent | null {
  if (!token || token === ',') return null;
  const styles: string[] = [];
  let remaining = token;

  while (true) {
    const colonIdx = remaining.indexOf(':');
    if (colonIdx === -1) break;
    const prefix = remaining.slice(0, colonIdx);
    if (STYLE_PREFIXES.has(prefix)) {
      styles.push(prefix);
      remaining = remaining.slice(colonIdx + 1);
    } else break;
  }

  const parts = remaining.split(':');
  if (parts.length === 0 || !parts[0]) return null;

  if (parts[0] === 'text') return { type: 'text', key: parts.slice(1).join(':').replace(/^["']|["']$/g, ''), styles };
  if (parts[0] === 'emoji' || parts[0] === 'nerd') return { type: 'nerd', key: parts[1] || '', styles };
  if (parts[0] === 'sep') return { type: 'sep', key: parts[1] || 'pipe', styles };

  return { type: parts[0], key: parts[1] || '', args: parts[2], styles };
}

// --- Helpers ---

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

// --- Rendered segment type ---

export interface RenderedSegment {
  text: string;
  styles: string[];       // CSS class names
  inlineColor?: string;   // For dynamically-colored components (ctx:icon, effort-icon)
}

// --- Component evaluators (mock/browser) ---

function evalClaude(key: string, data: Partial<ClaudeInput>): RenderedSegment[] {
  switch (key) {
    case 'model': return [{ text: data.model?.display_name || 'Claude', styles: [] }];
    case 'model-id': return [{ text: data.model?.id || '', styles: [] }];
    case 'model-letter': return [{ text: (data.model?.display_name || 'C')[0].toUpperCase(), styles: [] }];
    case 'version': return [{ text: data.version || '', styles: [] }];
    case 'session': return [{ text: (data.session_id || '').slice(0, 8), styles: [] }];
    case 'session-full': return [{ text: data.session_id || '', styles: [] }];
    case 'effort': {
      const effort = data.model?.reasoning_effort || '';
      if (!effort) return [];
      const colorMap: Record<string, string> = { low: 'green', medium: 'yellow', high: 'red' };
      return [{ text: effort, styles: [], inlineColor: colorMap[effort] }];
    }
    case 'effort-icon': {
      const effort = data.model?.reasoning_effort || '';
      if (!effort) return [];
      const colorMap: Record<string, string> = { low: 'green', medium: 'yellow', high: 'red' };
      return [{ text: '\u{f09d1}', styles: [], inlineColor: colorMap[effort] }];
    }
    case 'style': return [{ text: data.output_style?.name || 'default', styles: [] }];
    default: return [];
  }
}

function evalFs(key: string, data: Partial<ClaudeInput>): RenderedSegment[] {
  switch (key) {
    case 'path': return [{ text: data.workspace?.current_dir || data.cwd || '', styles: [] }];
    case 'dir': {
      const p = data.workspace?.current_dir || data.cwd || '';
      return [{ text: p.split('/').pop() || p, styles: [] }];
    }
    case 'project': {
      const p = data.workspace?.project_dir || '';
      return [{ text: p.split('/').pop() || p, styles: [] }];
    }
    case 'project-path': return [{ text: data.workspace?.project_dir || '', styles: [] }];
    case 'home': {
      const p = data.workspace?.current_dir || data.cwd || '';
      return [{ text: p.replace('/Users/demo', '~').replace('/home/demo', '~'), styles: [] }];
    }
    case 'cwd': return [{ text: data.cwd || '', styles: [] }];
    case 'relative': {
      const curr = data.workspace?.current_dir || '';
      const proj = data.workspace?.project_dir || '';
      if (proj && curr.startsWith(proj)) {
        const rel = curr.slice(proj.length + 1) || '.';
        return [{ text: rel, styles: [] }];
      }
      return [{ text: curr.split('/').pop() || curr, styles: [] }];
    }
    default: return [];
  }
}

function evalGit(key: string): RenderedSegment[] {
  // Mock git data for preview
  switch (key) {
    case 'branch': return [{ text: 'main', styles: [] }];
    case 'status': return [{ text: '✓', styles: [] }];
    case 'status-icon': return [{ text: getNerdIcon('sparkle'), styles: [] }];
    case 'status-word': return [{ text: 'clean', styles: [] }];
    case 'ahead': return [{ text: '↑2', styles: [] }];
    case 'behind': return [{ text: '', styles: [] }];
    case 'ahead-behind': return [{ text: '↑2', styles: [] }];
    case 'stash': return [{ text: '', styles: [] }];
    case 'staged': return [{ text: '●3', styles: [] }];
    case 'modified': return [{ text: '+2', styles: [] }];
    case 'untracked': return [{ text: '?1', styles: [] }];
    case 'dirty': {
      return [
        { text: '+3', styles: [], inlineColor: 'green' },
        { text: ' ', styles: [] },
        { text: '-1', styles: [], inlineColor: 'red' },
        { text: ' ', styles: [] },
        { text: '~2', styles: [], inlineColor: 'yellow' },
      ];
    }
    case 'commit': return [{ text: 'a1b2c3d', styles: [] }];
    case 'commit-long': return [{ text: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', styles: [] }];
    case 'tag': return [{ text: 'v1.8.0', styles: [] }];
    case 'remote': return [{ text: 'origin', styles: [] }];
    case 'repo': return [{ text: 'myapp', styles: [] }];
    case 'repo-branch': return [{ text: 'myapp:main', styles: [] }];
    case 'user': return [{ text: 'Demo User', styles: [] }];
    case 'email': return [{ text: 'demo@example.com', styles: [] }];
    case 'remote-url': return [{ text: 'https://github.com/demo/myapp.git', styles: [] }];
    default: return [];
  }
}

function evalCtx(key: string, data: Partial<ClaudeInput>, args?: string): RenderedSegment[] {
  const ctx = data.context_window;
  switch (key) {
    case 'percent': return [{ text: Math.round(ctx?.used_percentage || 0) + '%', styles: [] }];
    case 'remaining': return [{ text: Math.round(ctx?.remaining_percentage || 0) + '%', styles: [] }];
    case 'tokens': {
      const used = (ctx?.total_input_tokens || 0) + (ctx?.total_output_tokens || 0);
      const total = ctx?.context_window_size || 200000;
      return [{ text: formatTokens(used) + '/' + formatTokens(total), styles: [] }];
    }
    case 'in': return [{ text: formatTokens(ctx?.total_input_tokens || 0), styles: [] }];
    case 'out': return [{ text: formatTokens(ctx?.total_output_tokens || 0), styles: [] }];
    case 'size': return [{ text: formatTokens(ctx?.context_window_size || 200000), styles: [] }];
    case 'bar': {
      const pct = ctx?.used_percentage || 0;
      const width = args ? parseInt(args, 10) || 10 : 10;
      const filled = Math.round((pct / 100) * width);
      return [{ text: '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']', styles: [] }];
    }
    case 'icon': {
      const pct = ctx?.used_percentage || 0;
      const icon = getNerdIcon('circle');
      const color = pct < 50 ? 'green' : pct < 75 ? 'yellow' : 'red';
      return [{ text: icon, styles: pct >= 90 ? ['bold'] : [], inlineColor: color }];
    }
    case 'used-tokens': {
      const used = (ctx?.total_input_tokens || 0) + (ctx?.total_output_tokens || 0);
      return [{ text: formatTokens(used), styles: [] }];
    }
    default: return [];
  }
}

function evalCost(key: string, data: Partial<ClaudeInput>): RenderedSegment[] {
  const cost = data.cost;
  switch (key) {
    case 'total': return [{ text: '$' + (cost?.total_cost_usd || 0).toFixed(2), styles: [] }];
    case 'total-cents': return [{ text: Math.round((cost?.total_cost_usd || 0) * 100) + '¢', styles: [] }];
    case 'duration': return [{ text: formatDuration(cost?.total_duration_ms || 0), styles: [] }];
    case 'api': case 'api-duration': return [{ text: formatDuration(cost?.total_api_duration_ms || 0), styles: [] }];
    case 'lines': {
      const net = (cost?.total_lines_added || 0) - (cost?.total_lines_removed || 0);
      return [{ text: (net >= 0 ? '+' : '') + net, styles: [] }];
    }
    case 'added': case 'lines-added': return [{ text: '+' + (cost?.total_lines_added || 0), styles: [] }];
    case 'removed': case 'lines-removed': return [{ text: '-' + (cost?.total_lines_removed || 0), styles: [] }];
    case 'lines-both': return [{ text: '+' + (cost?.total_lines_added || 0) + ' -' + (cost?.total_lines_removed || 0), styles: [] }];
    default: return [];
  }
}

function evalEnv(key: string): RenderedSegment[] {
  // Mock environment values
  const mocks: Record<string, string> = {
    'node': 'v22.15.0', 'node-short': '22.15.0', 'bun': '1.2.5', 'npm': '10.9.4',
    'pnpm': '9.15.0', 'yarn': '4.6.0', 'python': '3.13.1', 'deno': '2.1.4',
    'rust': '1.84.0', 'go': '1.23.5', 'ruby': '3.4.1', 'java': '21.0.1',
    'user': 'demo', 'hostname': 'macbook-pro.local', 'hostname-short': 'macbook-pro',
    'shell': 'zsh', 'term': 'xterm-256color', 'os': 'darwin', 'arch': 'arm64',
    'os-release': '24.2.0', 'cpus': '10', 'memory': '32GB',
  };
  return [{ text: mocks[key] || '', styles: [] }];
}

function evalTime(key: string, data: Partial<ClaudeInput>): RenderedSegment[] {
  const now = new Date();
  const mocks: Record<string, string> = {
    'now': now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    'seconds': now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    '12h': now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    'date': now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'full': now.toISOString().split('T')[0],
    'iso': now.toISOString(),
    'unix': Math.floor(Date.now() / 1000).toString(),
    'weekday': now.toLocaleDateString('en-US', { weekday: 'short' }),
    'weekday-long': now.toLocaleDateString('en-US', { weekday: 'long' }),
    'month': now.toLocaleDateString('en-US', { month: 'short' }),
    'month-long': now.toLocaleDateString('en-US', { month: 'long' }),
    'year': now.getFullYear().toString(),
    'day': now.getDate().toString(),
    'hour': now.getHours().toString().padStart(2, '0'),
    'minute': now.getMinutes().toString().padStart(2, '0'),
    'elapsed': formatDuration(data.cost?.total_duration_ms || 0),
  };
  return [{ text: mocks[key] || '', styles: [] }];
}

function evalUsage(key: string, data: Partial<ClaudeInput>, args?: string): RenderedSegment[] {
  const rl = data.rate_limits;
  const fiveHourPct = rl?.five_hour?.used_percentage ?? 35;
  const weekPct = rl?.seven_day?.used_percentage ?? 12;

  const formatReset = (resetAt: number): string => {
    const diff = resetAt - Math.floor(Date.now() / 1000);
    if (diff <= 0) return 'now';
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (hours >= 24) return Math.floor(hours / 24) + 'd ' + (hours % 24) + 'h';
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    return minutes + 'm';
  };

  const makeBar = (pct: number, width: number): string => {
    const filled = Math.round((pct / 100) * width);
    return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
  };

  const makeIcon = (pct: number): RenderedSegment => {
    const icon = getNerdIcon('circle');
    const color = pct < 50 ? 'green' : pct < 75 ? 'yellow' : 'red';
    return { text: icon, styles: [], inlineColor: color };
  };

  switch (key) {
    case '5h': return [{ text: Math.round(fiveHourPct) + '%', styles: [] }];
    case 'week': case '7d': return [{ text: Math.round(weekPct) + '%', styles: [] }];
    case '5h-reset': return [{ text: formatReset(rl?.five_hour?.resets_at ?? 0), styles: [] }];
    case 'week-reset': case '7d-reset': return [{ text: formatReset(rl?.seven_day?.resets_at ?? 0), styles: [] }];
    case '5h-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      return [{ text: makeBar(fiveHourPct, width), styles: [] }];
    }
    case 'week-bar': case '7d-bar': {
      const width = args ? parseInt(args, 10) || 10 : 10;
      return [{ text: makeBar(weekPct, width), styles: [] }];
    }
    case '5h-icon': return [makeIcon(fiveHourPct)];
    case 'week-icon': case '7d-icon': return [makeIcon(weekPct)];
    case '5h-target': case 'week-target': case '7d-target': return [{ text: '20%', styles: [] }];
    case '5h-pace': return [{ text: '+5%', styles: [], inlineColor: 'yellow' }];
    case 'week-pace': case '7d-pace': return [{ text: '-2%', styles: [], inlineColor: 'cyan' }];
    case '5h-pace-icon': return [{ text: '▲', styles: [], inlineColor: 'yellow' }];
    case 'week-pace-icon': case '7d-pace-icon': return [{ text: '▼', styles: [], inlineColor: 'cyan' }];
    default: return [];
  }
}

function evalAccount(key: string): RenderedSegment[] {
  if (key === 'email') return [{ text: 'demo@anthropic.com', styles: [] }];
  return [];
}

// --- Condition evaluation (all true for preview, except dirty=true too) ---

function evalCondition(condition: string): boolean {
  switch (condition) {
    case 'git': return true;
    case 'dirty': return true;
    case 'clean': return false;
    case 'subdir': return false;
    case 'node': return true;
    case 'python': return false;
    case 'rust': return false;
    case 'go': return false;
    case 'effort': return true;
    default: return true;
  }
}

// --- Main evaluation ---

interface EvalEntry {
  type: string;
  segments: RenderedSegment[];
}

function evaluateComponent(comp: ParsedComponent, data: Partial<ClaudeInput>): EvalEntry {
  let segments: RenderedSegment[] = [];

  switch (comp.type) {
    case 'claude': segments = evalClaude(comp.key, data); break;
    case 'fs': segments = evalFs(comp.key, data); break;
    case 'git': segments = evalGit(comp.key); break;
    case 'ctx': segments = evalCtx(comp.key, data, comp.args); break;
    case 'cost': segments = evalCost(comp.key, data); break;
    case 'env': segments = evalEnv(comp.key); break;
    case 'time': segments = evalTime(comp.key, data); break;
    case 'usage': segments = evalUsage(comp.key, data, comp.args); break;
    case 'account': segments = evalAccount(comp.key); break;
    case 'sep':
      segments = [{ text: getSeparator(comp.key), styles: [] }];
      break;
    case 'nerd':
    case 'emoji':
      segments = [{ text: getNerdIcon(comp.key), styles: [] }];
      break;
    case 'text':
      segments = [{ text: comp.key, styles: [] }];
      break;
    case 'group': {
      if (comp.children) {
        const inner = evaluateComponents(comp.children, data);
        const brackets: Record<string, [string, string]> = {
          square: ['[', ']'], paren: ['(', ')'], curly: ['{', '}'], angle: ['<', '>'],
        };
        const [open, close] = brackets[comp.key] || ['[', ']'];
        segments = [{ text: open, styles: [] }, ...inner, { text: close, styles: [] }];
      }
      break;
    }
    case 'conditional': {
      if (comp.children && evalCondition(comp.key)) {
        segments = evaluateComponents(comp.children, data);
      }
      break;
    }
  }

  // Apply component-level styles
  if (comp.styles.length > 0) {
    segments = segments.map(seg => ({
      ...seg,
      styles: [...comp.styles, ...seg.styles],
    }));
  }

  return { type: comp.type, segments };
}

function evaluateComponents(components: ParsedComponent[], data: Partial<ClaudeInput>): RenderedSegment[] {
  const evaluated = components.map(comp => evaluateComponent(comp, data));

  // Filter orphaned separators
  const filtered: EvalEntry[] = [];
  for (let i = 0; i < evaluated.length; i++) {
    const entry = evaluated[i];
    if (entry.type === 'sep') {
      let hasBefore = false;
      for (let j = i - 1; j >= 0; j--) {
        if (evaluated[j].type === 'sep') continue;
        if (evaluated[j].segments.some(s => s.text)) { hasBefore = true; }
        break;
      }
      let hasAfter = false;
      for (let j = i + 1; j < evaluated.length; j++) {
        if (evaluated[j].type === 'sep') continue;
        if (evaluated[j].segments.some(s => s.text)) { hasAfter = true; }
        break;
      }
      if (!hasBefore || !hasAfter) continue;
    }
    filtered.push(entry);
  }

  // Build output with spacing
  const result: RenderedSegment[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    const prev = filtered[i - 1];
    const hasContent = entry.segments.some(s => s.text);

    if (i > 0 && entry.type !== 'sep' && entry.type !== 'conditional' && prev?.type !== 'sep' && hasContent) {
      result.push({ text: ' ', styles: [] });
    }
    if (hasContent) {
      result.push(...entry.segments);
    }
  }

  return result;
}

// --- Public API ---

export function renderFormat(format: string, data: Partial<ClaudeInput>): RenderedSegment[] {
  const components = parseFormat(format);
  return evaluateComponents(components, data);
}

// Convert segments to HTML
export function segmentsToHtml(segments: RenderedSegment[]): string {
  return segments.map(seg => {
    if (!seg.text) return '';
    if (seg.text === '\n') return '<br>';
    const escaped = seg.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const classes = seg.styles.map(s => `cl-${s}`).join(' ');
    const inlineStyle = seg.inlineColor ? ` style="color: var(--cl-${seg.inlineColor})"` : '';

    if (classes || inlineStyle) {
      return `<span class="${classes}"${inlineStyle}>${escaped}</span>`;
    }
    return escaped;
  }).join('');
}

export function renderToHtml(format: string, data: Partial<ClaudeInput>): string {
  return segmentsToHtml(renderFormat(format, data));
}
