import type { ParsedComponent } from './types.js';
import { COLORS } from './colors.js';

const STYLE_PREFIXES = new Set(Object.keys(COLORS));

export function parseFormat(format: string): ParsedComponent[] {
  // Normalize separators - both comma and space work
  const normalized = format.trim();
  const components: ParsedComponent[] = [];

  let i = 0;
  while (i < normalized.length) {
    // Skip whitespace
    while (i < normalized.length && /\s/.test(normalized[i])) i++;
    if (i >= normalized.length) break;

    // Handle brackets for grouping
    if (normalized[i] === '[' || normalized[i] === '(' || normalized[i] === '{' || normalized[i] === '<') {
      const openBracket = normalized[i];
      const closeBracket = openBracket === '[' ? ']' : openBracket === '(' ? ')' : openBracket === '{' ? '}' : '>';
      const bracketType = openBracket === '[' ? 'square' : openBracket === '(' ? 'paren' : openBracket === '{' ? 'curly' : 'angle';

      let depth = 1;
      let j = i + 1;
      while (j < normalized.length && depth > 0) {
        if (normalized[j] === openBracket) depth++;
        else if (normalized[j] === closeBracket) depth--;
        j++;
      }

      const inner = normalized.slice(i + 1, j - 1);
      components.push({
        type: 'group',
        key: bracketType,
        styles: [],
        children: parseFormat(inner),
      });
      i = j;
      continue;
    }

    // Handle conditionals: if:git(...)
    if (normalized.slice(i, i + 3) === 'if:') {
      const condStart = i + 3;
      let condEnd = condStart;
      while (condEnd < normalized.length && normalized[condEnd] !== '(') condEnd++;
      const condition = normalized.slice(condStart, condEnd);

      if (normalized[condEnd] === '(') {
        let depth = 1;
        let j = condEnd + 1;
        while (j < normalized.length && depth > 0) {
          if (normalized[j] === '(') depth++;
          else if (normalized[j] === ')') depth--;
          j++;
        }
        const inner = normalized.slice(condEnd + 1, j - 1);
        components.push({
          type: 'conditional',
          key: condition,
          condition,
          styles: [],
          children: parseFormat(inner),
        });
        i = j;
      } else {
        i = condEnd;
      }
      continue;
    }

    // Parse a single component (possibly with style prefixes)
    let tokenEnd = i;
    while (tokenEnd < normalized.length && !/[\s,\[\](){}<>]/.test(normalized[tokenEnd])) {
      tokenEnd++;
    }

    const token = normalized.slice(i, tokenEnd);
    if (token) {
      // Skip comma separators
      if (token === ',') {
        i = tokenEnd;
        continue;
      }

      const component = parseComponent(token);
      if (component) {
        components.push(component);
      }
    }

    i = tokenEnd;

    // Skip comma after token
    while (i < normalized.length && (normalized[i] === ',' || /\s/.test(normalized[i]))) i++;
  }

  return components;
}

function parseComponent(token: string): ParsedComponent | null {
  if (!token || token === ',') return null;

  const styles: string[] = [];
  let remaining = token;

  // Extract style prefixes (e.g., bold:green:git:branch)
  while (true) {
    const colonIdx = remaining.indexOf(':');
    if (colonIdx === -1) break;

    const prefix = remaining.slice(0, colonIdx);
    if (STYLE_PREFIXES.has(prefix)) {
      styles.push(prefix);
      remaining = remaining.slice(colonIdx + 1);
    } else {
      break;
    }
  }

  // Now remaining should be type:key or type:key:args
  const parts = remaining.split(':');

  if (parts.length === 0 || !parts[0]) {
    return null;
  }

  // Handle special cases
  if (parts[0] === 'text') {
    // text:Hello or text:"Hello World"
    const text = parts.slice(1).join(':').replace(/^["']|["']$/g, '');
    return { type: 'text', key: text, styles };
  }

  if (parts[0] === 'emoji') {
    return { type: 'emoji', key: parts[1] || '', styles };
  }

  if (parts[0] === 'nerd') {
    return { type: 'nerd', key: parts[1] || '', styles };
  }

  if (parts[0] === 'sep') {
    return { type: 'sep', key: parts[1] || 'pipe', styles };
  }

  // Standard component: type:key or type:key:args
  return {
    type: parts[0],
    key: parts[1] || '',
    args: parts[2],
    styles,
  };
}

export function listComponents(): void {
  const categories = [
    {
      name: 'Claude/Session',
      prefix: 'claude',
      items: ['model', 'model-id', 'version', 'session', 'session-full', 'style'],
    },
    {
      name: 'Context Window',
      prefix: 'ctx',
      items: ['percent', 'remaining', 'tokens', 'in', 'out', 'size', 'bar', 'bar:N', 'emoji', 'used-tokens'],
    },
    {
      name: 'Cost/Usage',
      prefix: 'cost',
      items: ['total', 'total-cents', 'duration', 'api', 'lines', 'added', 'removed', 'lines-both'],
    },
    {
      name: 'File System',
      prefix: 'fs',
      items: ['path', 'dir', 'project', 'project-path', 'home', 'cwd', 'relative'],
    },
    {
      name: 'Git',
      prefix: 'git',
      items: [
        'branch', 'status', 'status-emoji', 'status-word', 'ahead', 'behind', 'ahead-behind',
        'stash', 'staged', 'modified', 'untracked', 'commit', 'commit-long', 'tag',
        'remote', 'repo', 'repo-branch', 'user', 'email', 'remote-url',
      ],
    },
    {
      name: 'Environment',
      prefix: 'env',
      items: [
        'node', 'node-short', 'bun', 'npm', 'pnpm', 'yarn', 'python', 'deno', 'rust', 'go', 'ruby', 'java',
        'user', 'hostname', 'hostname-short', 'shell', 'term', 'os', 'arch', 'os-release', 'cpus', 'memory',
      ],
    },
    {
      name: 'Time',
      prefix: 'time',
      items: [
        'now', 'seconds', '12h', 'date', 'full', 'iso', 'unix', 'weekday', 'weekday-long',
        'month', 'month-long', 'year', 'day', 'hour', 'minute', 'elapsed',
      ],
    },
    {
      name: 'Account',
      prefix: 'account',
      items: ['email', 'name', 'display-name', 'org', 'plan', 'tier'],
    },
    {
      name: 'Usage/Limits',
      prefix: 'usage',
      items: [
        '5h', 'week', '7d', '5h-reset', 'week-reset', '7d-reset',
        '5h-bar', '5h-bar:N', 'week-bar', 'week-bar:N',
        '5h-emoji', 'week-emoji',
        '5h-target', 'week-target', '7d-target',
        '5h-pace', 'week-pace', '7d-pace',
        '5h-pace-emoji', 'week-pace-emoji', '7d-pace-emoji',
      ],
    },
    {
      name: 'Separators',
      prefix: 'sep',
      items: [
        'pipe', 'arrow', 'arrow-left', 'chevron', 'chevron-left', 'dot', 'dash', 'slash',
        'space', 'none', 'colon', 'double-colon', 'tilde', 'double-pipe', 'bullet',
        'diamond', 'star', 'powerline', 'powerline-left',
      ],
    },
    {
      name: 'Emojis',
      prefix: 'emoji',
      items: [
        'folder', 'file', 'home', 'branch', 'git', 'commit', 'merge', 'tag', 'stash',
        'check', 'x', 'warn', 'error', 'success', 'info', 'star', 'fire', 'rocket',
        'sparkle', 'lightning', 'heart', 'diamond', 'circle', 'square', 'triangle',
        'node', 'python', 'rust', 'go', 'ruby', 'java', 'docker',
        'green', 'yellow', 'orange', 'red', 'up', 'down', 'clock', 'calendar', 'money',
      ],
    },
    {
      name: 'Nerd Font Icons',
      prefix: 'nerd',
      items: [
        'folder', 'folder-open', 'file', 'file-code',
        'branch', 'repo', 'commit', 'merge', 'tag', 'stash', 'pr', 'diff',
        'check', 'x', 'warn', 'error', 'info',
        'star', 'fire', 'rocket', 'sparkle', 'lightning', 'heart',
        'node', 'python', 'rust', 'go', 'ruby', 'java', 'docker',
        'terminal', 'code', 'database', 'cloud', 'server', 'package', 'gear',
        'lock', 'key', 'shield', 'clock', 'calendar',
        'apple', 'linux', 'windows',
        'search', 'eye', 'bug', 'wrench', 'cpu', 'memory', 'home', 'user',
      ],
    },
    {
      name: 'Text',
      prefix: 'text',
      items: ['<custom text>'],
    },
    {
      name: 'Colors/Styles',
      prefix: '',
      items: [
        'red:', 'green:', 'blue:', 'yellow:', 'magenta:', 'cyan:', 'white:', 'gray:',
        'bold:', 'dim:', 'italic:', 'underline:',
        'bg-red:', 'bg-green:', 'bg-blue:', 'bg-yellow:',
      ],
    },
    {
      name: 'Conditionals',
      prefix: 'if',
      items: ['git(...)', 'dirty(...)', 'node(...)', 'python(...)'],
    },
    {
      name: 'Grouping',
      prefix: '',
      items: ['[...]', '(...)', '{...}', '<...>'],
    },
  ];

  console.log('\n\x1b[1mAvailable Components:\x1b[0m\n');

  for (const cat of categories) {
    console.log(`\x1b[36m${cat.name}\x1b[0m`);
    const prefix = cat.prefix ? `${cat.prefix}:` : '';
    console.log(`  ${cat.items.map(i => `${prefix}${i}`).join(', ')}`);
    console.log();
  }
}
