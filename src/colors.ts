// ANSI color codes
export const COLORS: Record<string, string> = {
  // Foreground colors
  black: '30',
  red: '31',
  green: '32',
  yellow: '33',
  blue: '34',
  magenta: '35',
  cyan: '36',
  white: '37',
  gray: '90',
  grey: '90',

  // Bright foreground
  'bright-red': '91',
  'bright-green': '92',
  'bright-yellow': '93',
  'bright-blue': '94',
  'bright-magenta': '95',
  'bright-cyan': '96',
  'bright-white': '97',

  // Background colors
  'bg-black': '40',
  'bg-red': '41',
  'bg-green': '42',
  'bg-yellow': '43',
  'bg-blue': '44',
  'bg-magenta': '45',
  'bg-cyan': '46',
  'bg-white': '47',

  // Styles
  bold: '1',
  dim: '2',
  italic: '3',
  underline: '4',
  blink: '5',
  inverse: '7',
  hidden: '8',
  strikethrough: '9',
};

export const RESET = '0';

export function getAnsiCode(styles: string[]): { open: string; close: string } {
  if (styles.length === 0) {
    return { open: '', close: '' };
  }

  const codes = styles
    .map(s => COLORS[s])
    .filter(Boolean);

  if (codes.length === 0) {
    return { open: '', close: '' };
  }

  return {
    open: `\\x1b[${codes.join(';')}m`,
    close: `\\x1b[${RESET}m`,
  };
}

export function wrapWithColor(text: string, styles: string[]): string {
  const { open, close } = getAnsiCode(styles);
  if (!open) return text;
  return `${open}${text}${close}`;
}

// For preview mode - actual terminal colors
export function previewColor(text: string, styles: string[]): string {
  if (styles.length === 0) return text;

  const codes = styles
    .map(s => COLORS[s])
    .filter(Boolean);

  if (codes.length === 0) return text;

  return `\x1b[${codes.join(';')}m${text}\x1b[${RESET}m`;
}
