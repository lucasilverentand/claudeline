export const SEPARATORS: Record<string, string> = {
  pipe: ' | ',
  arrow: ' → ',
  'arrow-left': ' ← ',
  'arrow-right': ' → ',
  chevron: ' › ',
  'chevron-left': ' ‹ ',
  dot: ' • ',
  middot: ' · ',
  dash: ' - ',
  slash: ' / ',
  backslash: ' \\ ',
  space: ' ',
  none: '',
  colon: ': ',
  'double-colon': ' :: ',
  tilde: ' ~ ',
  'double-pipe': ' ‖ ',
  bullet: ' ◦ ',
  diamond: ' ◇ ',
  star: ' ★ ',

  // Line break
  newline: '\x1b[0m\n\x1b[0m',
  br: '\x1b[0m\n\x1b[0m',

  // Powerline-style
  powerline: '',
  'powerline-left': '',
  'powerline-thin': '',
  'powerline-thin-left': '',
};

export function getSeparator(name: string): string {
  return SEPARATORS[name] ?? ' | ';
}
