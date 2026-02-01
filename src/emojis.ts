export const EMOJIS: Record<string, string> = {
  // Files & Folders
  folder: '📁',
  file: '📄',
  home: '🏠',

  // Git
  branch: '🌿',
  git: '',
  commit: '📝',
  merge: '🔀',
  tag: '🏷️',
  stash: '📦',

  // Status
  check: '✓',
  x: '✗',
  warn: '⚠',
  error: '❌',
  success: '✅',
  info: 'ℹ',

  // Decorative
  star: '★',
  fire: '🔥',
  rocket: '🚀',
  sparkle: '✨',
  lightning: '⚡',
  heart: '❤',
  diamond: '◆',
  circle: '●',
  square: '■',
  triangle: '▲',

  // Tech
  node: '⬢',
  python: '🐍',
  rust: '🦀',
  go: '🐹',
  ruby: '💎',
  java: '☕',
  docker: '🐳',

  // Context indicators
  green: '🟢',
  yellow: '🟡',
  orange: '🟠',
  red: '🔴',

  // Arrows
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  'up-down': '↕',

  // Time
  clock: '🕐',
  calendar: '📅',

  // Money
  money: '💰',
  dollar: '💵',
};

export function getEmoji(name: string): string {
  return EMOJIS[name] || '';
}
