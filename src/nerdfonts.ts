export const NERD_ICONS: Record<string, string> = {
  // Files & Folders
  'folder': '\uf07b',
  'folder-open': '\uf07c',
  'file': '\uf15b',
  'file-code': '\uf1c9',

  // Git
  'branch': '\ue725',
  'repo': '\uf401',
  'commit': '\uf417',
  'merge': '\uf419',
  'tag': '\uf412',
  'stash': '\uf01c',
  'pr': '\uf407',
  'diff': '\uf440',
  'compare': '\uf47d',

  // Status
  'check': '\uf00c',
  'x': '\uf00d',
  'warn': '\uf071',
  'error': '\uf057',
  'info': '\uf05a',
  'question': '\uf059',
  'bell': '\uf0f3',
  'pin': '\uf08d',

  // Decorative
  'star': '\uf005',
  'fire': '\uf490',
  'rocket': '\uf135',
  'sparkle': '\uf005',
  'lightning': '\uf0e7',
  'heart': '\uf004',
  'diamond': '\uf219',
  'circle': '\uf111',
  'square': '\uf0c8',
  'triangle': '\uf0d8',

  // Tech
  'node': '\ue718',
  'python': '\ue73c',
  'rust': '\ue7a8',
  'go': '\ue626',
  'ruby': '\ue739',
  'java': '\ue738',
  'docker': '\ue7b0',
  'terminal': '\uf120',
  'code': '\uf121',
  'database': '\uf1c0',
  'cloud': '\uf0c2',
  'server': '\uf233',
  'package': '\uf487',
  'gear': '\uf013',
  'lock': '\uf023',
  'unlock': '\uf09c',
  'key': '\uf084',
  'shield': '\uf132',

  // Context indicators (colored circles)
  'circle-green': '\uf111',
  'circle-yellow': '\uf111',
  'circle-orange': '\uf111',
  'circle-red': '\uf111',

  // Arrows
  'up': '\uf062',
  'down': '\uf063',
  'left': '\uf060',
  'right': '\uf061',
  'arrow-right': '\uf061',
  'arrow-left': '\uf060',

  // Time
  'clock': '\uf017',
  'calendar': '\uf073',
  'history': '\uf1da',

  // Money
  'money': '\uf0d6',
  'dollar': '\uf155',

  // OS
  'apple': '\uf179',
  'linux': '\uf17c',
  'windows': '\uf17a',

  // Misc
  'search': '\uf002',
  'eye': '\uf06e',
  'bug': '\uf188',
  'wrench': '\uf0ad',
  'plug': '\uf1e6',
  'wifi': '\uf1eb',
  'bluetooth': '\uf293',
  'cpu': '\uf2db',
  'memory': '\uf538',
  'home': '\uf015',
  'user': '\uf007',
};

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let nfGlyphs: Record<string, string> | null = null;

function loadNfGlyphs(): Record<string, string> {
  if (nfGlyphs) return nfGlyphs;
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const jsonPath = join(__dirname, 'data', 'nf-glyphs.json');
    nfGlyphs = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return nfGlyphs!;
  } catch {
    nfGlyphs = {};
    return nfGlyphs;
  }
}

export function getNerdIcon(name: string): string {
  // Check curated icons first
  if (NERD_ICONS[name]) return NERD_ICONS[name];

  // Support nf-* class names (e.g., nf-fa-brain, nf-md-brain)
  if (name.startsWith('nf-')) {
    const glyphs = loadNfGlyphs();
    const key = name.slice(3); // strip "nf-" prefix
    const code = glyphs[key];
    if (code) return String.fromCodePoint(parseInt(code, 16));
  }

  return '';
}

export function detectNerdFont(): boolean {
  // Explicit opt-in/out via env var
  const explicit = process.env.CLAUDELINE_NERD_FONT ?? process.env.NERD_FONT;
  if (explicit !== undefined) {
    return explicit === '1' || explicit.toLowerCase() === 'true';
  }

  // Known nerd-font-friendly terminals
  const termProgram = (process.env.TERM_PROGRAM || '').toLowerCase();
  const nerdFriendly = ['kitty', 'wezterm', 'alacritty', 'iterm.app', 'hyper', 'ghostty'];
  if (nerdFriendly.some(t => termProgram.includes(t))) {
    return true;
  }

  // Default to true — power-user CLI tool, most users will have nerd fonts
  return true;
}
