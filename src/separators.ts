export const SEPARATORS: Record<string, string> = {
  pipe: ' | ',
  arrow: ' → ',
  'arrow-left': ' ← ',
  'arrow-right': ' → ',
  chevron: ' › ',
  'chevron-left': ' ‹ ',
  dot: ' • ',
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
  newline: '\n',
  br: '\n',

  // Powerline-style
  powerline: '',
  'powerline-left': '',
  'powerline-thin': '',
  'powerline-thin-left': '',
};

export function getSeparator(name: string): string {
  return SEPARATORS[name] ?? ' | ';
}
