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

export function getNerdIcon(name: string): string {
  return NERD_ICONS[name] || '';
}
