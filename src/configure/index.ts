import { evaluateFormat } from '../runtime.js';
import { SAMPLE_DATA } from '../preview.js';
import { THEMES } from '../themes.js';
import { install, type InstallOptions } from '../installer.js';
import { CATEGORIES, STYLES, type Category } from './catalog.js';
import { COLORS } from '../colors.js';

// ─── Types ────────────────────────────────────────────────────

type Mode =
  | { type: 'list' }
  | { type: 'categories' }
  | { type: 'components'; categoryIndex: number }
  | { type: 'styles' }
  | { type: 'themes' }
  | { type: 'raw'; buffer: string; cursorPos: number }
  | { type: 'confirm-install' };

interface State {
  segments: string[];
  cursor: number;
  subcursor: number;
  mode: Mode;
  previewCache: string;
  message: string;
  messageTimeout: ReturnType<typeof setTimeout> | null;
  scrollOffset: number;
}

// ─── ANSI helpers ─────────────────────────────────────────────

const ESC = '\x1b';
const CSI = `${ESC}[`;
const HIDE_CURSOR = `${CSI}?25l`;
const SHOW_CURSOR = `${CSI}?25h`;
const ENTER_ALT = `${CSI}?1049h`;
const LEAVE_ALT = `${CSI}?1049l`;
const CURSOR_HOME = `${CSI}H`;
const CLEAR_BELOW = `${CSI}J`;

function c(text: string, ...styles: string[]): string {
  const codes = styles.map((s) => COLORS[s]).filter(Boolean);
  if (codes.length === 0) return text;
  return `\x1b[0;${codes.join(';')}m${text}\x1b[0m`;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str: string): number {
  // Strip ANSI, then account for wide characters roughly
  return stripAnsi(str).length;
}

// ─── State management ─────────────────────────────────────────

function tokenize(format: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of format) {
    if ('([{<'.includes(ch)) depth++;
    if (')]}>'.includes(ch)) depth--;
    if (ch === ' ' && depth === 0) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function buildFormat(segments: string[]): string {
  return segments.join(' ');
}

function updatePreview(state: State): void {
  const format = buildFormat(state.segments);
  if (!format) {
    state.previewCache = c('(empty)', 'dim');
    return;
  }
  try {
    state.previewCache = evaluateFormat(format, SAMPLE_DATA, { noColor: false });
  } catch {
    state.previewCache = c('(error evaluating format)', 'red');
  }
}

function showMessage(state: State, msg: string): void {
  if (state.messageTimeout) clearTimeout(state.messageTimeout);
  state.message = msg;
  state.messageTimeout = setTimeout(() => {
    state.message = '';
    render(state);
  }, 2500);
}

function clampCursor(state: State): void {
  const max = Math.max(0, state.segments.length - 1);
  if (state.cursor > max) state.cursor = max;
  if (state.cursor < 0) state.cursor = 0;
}

// ─── Rendering ────────────────────────────────────────────────

function getTermWidth(): number {
  return process.stdout.columns || 80;
}

function getTermHeight(): number {
  return process.stdout.rows || 24;
}

function renderBox(lines: string[], width: number): string[] {
  const inner = width - 4;
  const out: string[] = [];
  out.push(c('  ┌─ ', 'dim') + c('preview', 'dim', 'bold') + c(' ' + '─'.repeat(Math.max(0, inner - 9)) + '┐', 'dim'));
  for (const line of lines) {
    const vis = visibleLength(line);
    const pad = Math.max(0, inner - vis);
    out.push(c('  │ ', 'dim') + line + ' '.repeat(pad) + c(' │', 'dim'));
  }
  out.push(c('  └' + '─'.repeat(inner + 2) + '┘', 'dim'));
  return out;
}

function renderListMode(state: State): string[] {
  const lines: string[] = [];
  const maxVisible = getTermHeight() - 12; // Reserve space for preview + help

  if (state.segments.length === 0) {
    lines.push(c('  (no segments — press ', 'dim') + c('a', 'cyan') + c(' to add)', 'dim'));
  } else {
    // Scrolling
    const total = state.segments.length;
    let start = state.scrollOffset;
    const visible = Math.min(total, maxVisible);
    if (state.cursor < start) start = state.cursor;
    if (state.cursor >= start + visible) start = state.cursor - visible + 1;
    state.scrollOffset = start;

    for (let i = start; i < Math.min(total, start + visible); i++) {
      const seg = state.segments[i];
      const selected = i === state.cursor;
      const pointer = selected ? c(' ▸ ', 'cyan') : '   ';
      const label = selected ? c(seg, 'bold') : seg;
      const desc = getSegmentDescription(seg);
      const descStr = desc ? c('  ' + desc, 'dim') : '';
      lines.push(pointer + label + descStr);
    }

    if (total > visible) {
      const pct = Math.round(((start + visible) / total) * 100);
      lines.push(c(`   ↕ ${start + 1}–${Math.min(total, start + visible)} of ${total} (${pct}%)`, 'dim'));
    }
  }

  return lines;
}

function renderCategoryList(state: State): string[] {
  const lines: string[] = [];
  lines.push('  ' + c('Add segment — pick a category:', 'bold'));
  lines.push('');

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const selected = i === state.subcursor;
    const pointer = selected ? c(' ▸ ', 'cyan') : '   ';
    const name = selected ? c(cat.name, 'bold', 'cyan') : cat.name;
    const count = c(` (${cat.items.length})`, 'dim');
    lines.push(pointer + name + count);
  }

  return lines;
}

function renderComponentList(state: State, categoryIndex: number): string[] {
  const cat = CATEGORIES[categoryIndex];
  const lines: string[] = [];
  lines.push('  ' + c(cat.name, 'bold', 'cyan') + c(' — pick a component:', 'bold'));
  lines.push('');

  const maxVisible = getTermHeight() - 12;
  const total = cat.items.length;
  let start = 0;
  const visible = Math.min(total, maxVisible);
  if (state.subcursor >= start + visible) start = state.subcursor - visible + 1;
  if (state.subcursor < start) start = state.subcursor;

  for (let i = start; i < Math.min(total, start + visible); i++) {
    const item = cat.items[i];
    const selected = i === state.subcursor;
    const pointer = selected ? c(' ▸ ', 'cyan') : '   ';
    const key = selected ? c(item.key, 'bold') : item.key;
    const pad = ' '.repeat(Math.max(1, 24 - item.key.length));
    lines.push(pointer + key + pad + c(item.description, 'dim'));
  }

  if (total > visible) {
    lines.push(c(`   ↕ scroll for more (${total} total)`, 'dim'));
  }

  return lines;
}

function renderStyleList(state: State): string[] {
  const seg = state.segments[state.cursor];
  const lines: string[] = [];
  lines.push('  ' + c('Style for ', 'bold') + c(seg, 'bold', 'cyan') + c(':', 'bold'));
  lines.push('');

  const maxVisible = getTermHeight() - 12;
  const total = STYLES.length;
  let start = 0;
  const visible = Math.min(total, maxVisible);
  if (state.subcursor >= start + visible) start = state.subcursor - visible + 1;
  if (state.subcursor < start) start = state.subcursor;

  for (let i = start; i < Math.min(total, start + visible); i++) {
    const style = STYLES[i];
    const selected = i === state.subcursor;
    const pointer = selected ? c(' ▸ ', 'cyan') : '   ';
    // Show a color preview swatch
    let preview = '';
    if (style.key !== '(none)') {
      const codes = style.key.split(':').map((s) => COLORS[s]).filter(Boolean);
      if (codes.length > 0) {
        preview = `\x1b[0;${codes.join(';')}m ██ \x1b[0m `;
      }
    }
    const label = selected ? c(style.key, 'bold') : style.key;
    lines.push(pointer + preview + label);
  }

  return lines;
}

function renderThemeList(state: State): string[] {
  const names = Object.keys(THEMES);
  const lines: string[] = [];
  lines.push('  ' + c('Pick a theme as starting point:', 'bold'));
  lines.push('');

  const maxVisible = getTermHeight() - 12;
  const total = names.length;
  let start = 0;
  const visible = Math.min(total, maxVisible);
  if (state.subcursor >= start + visible) start = state.subcursor - visible + 1;
  if (state.subcursor < start) start = state.subcursor;

  for (let i = start; i < Math.min(total, start + visible); i++) {
    const name = names[i];
    const selected = i === state.subcursor;
    const pointer = selected ? c(' ▸ ', 'cyan') : '   ';
    const label = selected ? c(name, 'bold', 'cyan') : name;
    lines.push(pointer + label);
  }

  return lines;
}

function renderRawInput(state: State): string[] {
  if (state.mode.type !== 'raw') return [];
  const lines: string[] = [];
  lines.push('  ' + c('Type a raw format segment (then Enter):', 'bold'));
  lines.push('');
  // Show buffer with cursor
  const buf = state.mode.buffer;
  const pos = state.mode.cursorPos;
  const before = buf.slice(0, pos);
  const cursor = pos < buf.length ? buf[pos] : ' ';
  const after = buf.slice(pos + 1);
  lines.push('  ' + c('> ', 'cyan') + before + c(cursor, 'inverse') + after);
  lines.push('');
  lines.push(c('  Examples: git:branch, bold:green:fs:dir, [ctx:bar ctx:percent]', 'dim'));
  return lines;
}

function renderConfirmInstall(state: State): string[] {
  const lines: string[] = [];
  lines.push('  ' + c('Install this status line?', 'bold'));
  lines.push('');
  const options = [
    { label: 'Install globally (~/.claude)', idx: 0 },
    { label: 'Install to project (.claude)', idx: 1 },
    { label: 'Cancel', idx: 2 },
  ];
  for (const opt of options) {
    const selected = opt.idx === state.subcursor;
    const pointer = selected ? c(' ▸ ', 'cyan') : '   ';
    const label = selected ? c(opt.label, 'bold') : opt.label;
    lines.push(pointer + label);
  }
  return lines;
}

function getHelpBar(mode: Mode): string {
  const dim = (t: string) => c(t, 'dim');
  const key = (k: string) => c(k, 'cyan');

  switch (mode.type) {
    case 'list':
      return dim('  ') +
        key('a') + dim(' add  ') +
        key('d') + dim(' delete  ') +
        key('s') + dim(' style  ') +
        key('J/K') + dim(' reorder  ') +
        key('r') + dim(' raw  ') +
        key('t') + dim(' theme  ') +
        key('w') + dim(' wrap  ') +
        key('i') + dim(' install  ') +
        key('q') + dim(' quit');
    case 'categories':
    case 'components':
    case 'styles':
    case 'themes':
    case 'confirm-install':
      return dim('  ') +
        key('↑↓') + dim(' navigate  ') +
        key('enter') + dim(' select  ') +
        key('esc') + dim(' back');
    case 'raw':
      return dim('  ') +
        key('enter') + dim(' add  ') +
        key('esc') + dim(' cancel');
  }
}

function render(state: State): void {
  const width = getTermWidth();
  const out: string[] = [];

  // Header
  out.push('');
  out.push('  ' + c('claudeline', 'bold', 'magenta') + c(' configurator', 'dim'));
  out.push('');

  // Preview box
  const previewLines = state.previewCache.split('\n');
  out.push(...renderBox(previewLines, width));
  out.push('');

  // Format string
  const format = buildFormat(state.segments);
  const maxFmtWidth = width - 12;
  const displayFmt = format.length > maxFmtWidth ? format.slice(0, maxFmtWidth - 1) + '…' : format;
  out.push(c('  format: ', 'dim') + displayFmt);
  out.push('');

  // Mode-specific content
  switch (state.mode.type) {
    case 'list':
      out.push(...renderListMode(state));
      break;
    case 'categories':
      out.push(...renderCategoryList(state));
      break;
    case 'components':
      out.push(...renderComponentList(state, state.mode.categoryIndex));
      break;
    case 'styles':
      out.push(...renderStyleList(state));
      break;
    case 'themes':
      out.push(...renderThemeList(state));
      break;
    case 'raw':
      out.push(...renderRawInput(state));
      break;
    case 'confirm-install':
      out.push(...renderConfirmInstall(state));
      break;
  }

  out.push('');

  // Status message
  if (state.message) {
    out.push('  ' + state.message);
    out.push('');
  }

  // Help bar
  out.push(getHelpBar(state.mode));
  out.push('');

  // Write everything at once
  process.stdout.write(CURSOR_HOME + out.join('\n') + '\n' + CLEAR_BELOW);
}

// ─── Segment description lookup ───────────────────────────────

function getSegmentDescription(seg: string): string {
  // Strip style prefixes to find the base key
  const parts = seg.split(':');
  const styleKeys = new Set(Object.keys(COLORS));
  let idx = 0;
  while (idx < parts.length - 1 && styleKeys.has(parts[idx])) idx++;
  const baseKey = parts.slice(idx).join(':');

  for (const cat of CATEGORIES) {
    for (const item of cat.items) {
      if (item.key === baseKey) return item.description;
    }
  }
  return '';
}

// ─── Style application ────────────────────────────────────────

function stripStyle(segment: string): string {
  const parts = segment.split(':');
  const styleKeys = new Set(Object.keys(COLORS));
  let idx = 0;
  while (idx < parts.length - 1 && styleKeys.has(parts[idx])) idx++;
  return parts.slice(idx).join(':');
}

function applyStyleToSegment(segment: string, style: string): string {
  const base = stripStyle(segment);
  if (style === '(none)') return base;
  return style + ':' + base;
}

// ─── Group wrapping ───────────────────────────────────────────

function wrapSegment(state: State): void {
  if (state.segments.length === 0) return;
  const seg = state.segments[state.cursor];
  // If already wrapped, unwrap
  if ((seg.startsWith('[') && seg.endsWith(']')) ||
      (seg.startsWith('(') && seg.endsWith(')'))) {
    state.segments[state.cursor] = seg.slice(1, -1);
  } else {
    state.segments[state.cursor] = '[' + seg + ']';
  }
  updatePreview(state);
}

// ─── Input handling ───────────────────────────────────────────

function getListLength(state: State): number {
  switch (state.mode.type) {
    case 'categories': return CATEGORIES.length;
    case 'components': return CATEGORIES[state.mode.categoryIndex].items.length;
    case 'styles': return STYLES.length;
    case 'themes': return Object.keys(THEMES).length;
    case 'confirm-install': return 3;
    default: return 0;
  }
}

function handleInput(state: State, data: Buffer): boolean {
  const key = data.toString();

  // Global: Ctrl+C
  if (key === '\x03') return true;

  // Raw input mode has its own handling
  if (state.mode.type === 'raw') {
    return handleRawInput(state, key, data);
  }

  // Arrow keys
  if (key === `${ESC}[A`) { // Up
    if (state.mode.type === 'list') {
      state.cursor = Math.max(0, state.cursor - 1);
    } else {
      state.subcursor = Math.max(0, state.subcursor - 1);
    }
    return false;
  }
  if (key === `${ESC}[B`) { // Down
    if (state.mode.type === 'list') {
      state.cursor = Math.min(state.segments.length - 1, state.cursor + 1);
    } else {
      state.subcursor = Math.min(getListLength(state) - 1, state.subcursor + 1);
    }
    return false;
  }

  // Escape → go back (only bare ESC, not part of a sequence)
  if (key === ESC) {
    if (state.mode.type !== 'list') {
      state.mode = { type: 'list' };
      state.subcursor = 0;
    }
    return false;
  }

  // Enter
  if (key === '\r') {
    return handleEnter(state);
  }

  // List-mode specific keys
  if (state.mode.type === 'list') {
    return handleListKey(state, key);
  }

  return false;
}

function handleRawInput(state: State, key: string, data: Buffer): boolean {
  if (state.mode.type !== 'raw') return false;

  if (key === ESC) {
    state.mode = { type: 'list' };
    return false;
  }

  if (key === '\r') {
    const value = state.mode.buffer.trim();
    if (value) {
      // Tokenize in case user entered multiple segments
      const tokens = tokenize(value);
      const insertAt = state.cursor + 1;
      state.segments.splice(insertAt, 0, ...tokens);
      state.cursor = insertAt + tokens.length - 1;
      clampCursor(state);
      updatePreview(state);
      showMessage(state, c('Added: ', 'green') + tokens.join(' '));
    }
    state.mode = { type: 'list' };
    return false;
  }

  // Backspace
  if (key === '\x7f' || key === '\b') {
    if (state.mode.cursorPos > 0) {
      const buf = state.mode.buffer;
      state.mode.buffer = buf.slice(0, state.mode.cursorPos - 1) + buf.slice(state.mode.cursorPos);
      state.mode.cursorPos--;
    }
    return false;
  }

  // Delete
  if (key === `${ESC}[3~`) {
    if (state.mode.cursorPos < state.mode.buffer.length) {
      const buf = state.mode.buffer;
      state.mode.buffer = buf.slice(0, state.mode.cursorPos) + buf.slice(state.mode.cursorPos + 1);
    }
    return false;
  }

  // Left/Right arrows
  if (key === `${ESC}[D`) {
    state.mode.cursorPos = Math.max(0, state.mode.cursorPos - 1);
    return false;
  }
  if (key === `${ESC}[C`) {
    state.mode.cursorPos = Math.min(state.mode.buffer.length, state.mode.cursorPos + 1);
    return false;
  }

  // Home/End
  if (key === `${ESC}[H` || key === '\x01') {
    state.mode.cursorPos = 0;
    return false;
  }
  if (key === `${ESC}[F` || key === '\x05') {
    state.mode.cursorPos = state.mode.buffer.length;
    return false;
  }

  // Printable characters
  if (key.length === 1 && key >= ' ') {
    const buf = state.mode.buffer;
    state.mode.buffer = buf.slice(0, state.mode.cursorPos) + key + buf.slice(state.mode.cursorPos);
    state.mode.cursorPos++;
  }

  return false;
}

function handleEnter(state: State): boolean {
  switch (state.mode.type) {
    case 'categories': {
      state.mode = { type: 'components', categoryIndex: state.subcursor };
      state.subcursor = 0;
      break;
    }
    case 'components': {
      const cat = CATEGORIES[(state.mode as { type: 'components'; categoryIndex: number }).categoryIndex];
      const item = cat.items[state.subcursor];
      const insertAt = state.segments.length === 0 ? 0 : state.cursor + 1;
      state.segments.splice(insertAt, 0, item.key);
      state.cursor = insertAt;
      updatePreview(state);
      showMessage(state, c('Added: ', 'green') + item.key);
      state.mode = { type: 'list' };
      state.subcursor = 0;
      break;
    }
    case 'styles': {
      const style = STYLES[state.subcursor];
      state.segments[state.cursor] = applyStyleToSegment(state.segments[state.cursor], style.key);
      updatePreview(state);
      showMessage(state, c('Styled: ', 'green') + state.segments[state.cursor]);
      state.mode = { type: 'list' };
      state.subcursor = 0;
      break;
    }
    case 'themes': {
      const themeNames = Object.keys(THEMES);
      const themeName = themeNames[state.subcursor];
      const format = THEMES[themeName];
      state.segments = tokenize(format);
      state.cursor = 0;
      updatePreview(state);
      showMessage(state, c('Loaded theme: ', 'green') + themeName);
      state.mode = { type: 'list' };
      state.subcursor = 0;
      break;
    }
    case 'confirm-install': {
      if (state.subcursor === 2) {
        // Cancel
        state.mode = { type: 'list' };
        state.subcursor = 0;
        break;
      }
      const project = state.subcursor === 1;
      const format = buildFormat(state.segments);
      const opts: InstallOptions = {};
      const result = install(format, project, opts);
      if (result.success) {
        showMessage(state, c('Installed! Restart Claude Code to see changes.', 'green', 'bold'));
      } else {
        showMessage(state, c('Install failed: ' + result.message, 'red'));
      }
      state.mode = { type: 'list' };
      state.subcursor = 0;
      break;
    }
    default:
      break;
  }
  return false;
}

function handleListKey(state: State, key: string): boolean {
  switch (key) {
    case 'q': return true; // Quit

    case 'a': // Add segment
      state.mode = { type: 'categories' };
      state.subcursor = 0;
      break;

    case 'd': // Delete segment
    case '\x1b[3~': // Delete key
      if (state.segments.length > 0) {
        const removed = state.segments.splice(state.cursor, 1)[0];
        clampCursor(state);
        updatePreview(state);
        showMessage(state, c('Removed: ', 'yellow') + removed);
      }
      break;

    case 's': // Style
      if (state.segments.length > 0) {
        state.mode = { type: 'styles' };
        state.subcursor = 0;
      }
      break;

    case 'K': // Move up
      if (state.cursor > 0) {
        [state.segments[state.cursor - 1], state.segments[state.cursor]] =
          [state.segments[state.cursor], state.segments[state.cursor - 1]];
        state.cursor--;
        updatePreview(state);
      }
      break;

    case 'J': // Move down
      if (state.cursor < state.segments.length - 1) {
        [state.segments[state.cursor], state.segments[state.cursor + 1]] =
          [state.segments[state.cursor + 1], state.segments[state.cursor]];
        state.cursor++;
        updatePreview(state);
      }
      break;

    case 'r': // Raw input
      state.mode = { type: 'raw', buffer: '', cursorPos: 0 };
      break;

    case 't': // Theme picker
      state.mode = { type: 'themes' };
      state.subcursor = 0;
      break;

    case 'w': // Wrap in brackets
      wrapSegment(state);
      break;

    case 'i': // Install
      if (state.segments.length === 0) {
        showMessage(state, c('Nothing to install — add some segments first', 'yellow'));
      } else {
        state.mode = { type: 'confirm-install' };
        state.subcursor = 0;
      }
      break;
  }
  return false;
}

// ─── Entry point ──────────────────────────────────────────────

export interface ConfigureOptions {
  format?: string;
  theme?: string;
}

export async function configure(options: ConfigureOptions = {}): Promise<void> {
  // Require interactive terminal
  if (!process.stdin.isTTY) {
    console.error('The configure command requires an interactive terminal.');
    process.exit(1);
  }

  // Determine initial format
  let initialFormat: string;
  if (options.format) {
    initialFormat = options.format;
  } else if (options.theme) {
    initialFormat = THEMES[options.theme] || THEMES.default;
  } else {
    initialFormat = THEMES.default;
  }

  const state: State = {
    segments: tokenize(initialFormat),
    cursor: 0,
    subcursor: 0,
    mode: { type: 'list' },
    previewCache: '',
    message: '',
    messageTimeout: null,
    scrollOffset: 0,
  };

  updatePreview(state);

  // Setup terminal
  process.stdout.write(ENTER_ALT + HIDE_CURSOR);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  const cleanup = () => {
    if (state.messageTimeout) clearTimeout(state.messageTimeout);
    process.stdout.write(SHOW_CURSOR + LEAVE_ALT);
    process.stdin.setRawMode(false);
    process.stdin.pause();
  };

  // Handle resize
  process.stdout.on('resize', () => render(state));

  // Handle SIGINT gracefully
  const onSigint = () => {
    cleanup();
    process.exit(0);
  };
  process.on('SIGINT', onSigint);

  // Initial render
  render(state);

  // Input loop
  return new Promise<void>((resolve) => {
    const onData = (data: Buffer) => {
      const shouldQuit = handleInput(state, data);
      if (shouldQuit) {
        process.stdin.removeListener('data', onData);
        process.removeListener('SIGINT', onSigint);
        cleanup();

        // Print final format to stdout so user can copy it
        const format = buildFormat(state.segments);
        if (format) {
          console.log('');
          console.log(c('Final format:', 'dim'));
          console.log(format);
          console.log('');
        }

        resolve();
        return;
      }
      render(state);
    };

    process.stdin.on('data', onData);
  });
}
