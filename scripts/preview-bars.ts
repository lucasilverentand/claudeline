function barColorFromDelta(delta: number): { fg: number | null; bold: boolean } {
  if (delta > 15) return { fg: 31, bold: true };
  if (delta > 5) return { fg: 31, bold: false };
  return { fg: null, bold: false };
}

function bar(pct: number, delta: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const filledStr = '█'.repeat(filled);
  const emptyStr = '░'.repeat(empty);
  const reset = '\x1b[0m';
  const { fg, bold } = barColorFromDelta(delta);
  if (fg === null) {
    return `${filledStr}\x1b[2m${emptyStr}${reset}`;
  }
  const boldStr = bold ? '1;' : '';
  return `\x1b[0;${boldStr}${fg}m${filledStr}${reset}\x1b[0;2;${fg}m${emptyStr}${reset}`;
}

const scenarios: { label: string; pct: number; delta: number }[] = [
  { label: 'Fine',           pct:  8, delta: -22 },
  { label: 'Fine',           pct: 23, delta: -12 },
  { label: 'Fine',           pct: 37, delta:  -3 },
  { label: 'Fine',           pct: 50, delta:   0 },
  { label: 'Fine',           pct: 63, delta:   3 },
  { label: 'Fine',           pct: 74, delta:   5 },
  { label: 'Overpacing',     pct: 43, delta:   8 },
  { label: 'Overpacing',     pct: 67, delta:  11 },
  { label: 'Overpacing',     pct: 83, delta:  14 },
  { label: 'Will hit limit', pct: 53, delta:  18 },
  { label: 'Will hit limit', pct: 71, delta:  25 },
  { label: 'Will hit limit', pct: 95, delta:  35 },
];

console.log('\n  Usage bar preview — color based on pace delta\n');
console.log('  \x1b[2m%used  delta   bar                       scenario\x1b[0m\n');

for (const s of scenarios) {
  const pctLabel = `${String(s.pct).padStart(3)}%`;
  const sign = s.delta >= 0 ? '+' : '';
  const deltaLabel = `${sign}${String(s.delta).padStart(s.delta >= 0 ? 2 : 3)}%`;
  process.stdout.write(`  ${pctLabel}  ${deltaLabel}   ${bar(s.pct, s.delta)}  \x1b[2m${s.label}\x1b[0m\n`);
}
console.log();
