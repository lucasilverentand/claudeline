export const THEMES: Record<string, string> = {
  minimal: 'claude:model fs:dir',

  default: '[claude:model] emoji:folder fs:dir if:git(sep:pipe emoji:branch git:branch git:status)',

  powerline: 'bold:cyan:claude:model sep:powerline fs:dir if:git(sep:powerline green:git:branch git:status)',

  full: '[bold:cyan:claude:model] fs:home sep:arrow green:git:branch git:status sep:pipe ctx:bar ctx:percent sep:pipe cost:total',

  git: '[claude:model] emoji:folder fs:dir sep:pipe emoji:branch git:branch git:status git:ahead-behind if:dirty(sep:pipe git:staged git:modified git:untracked)',

  tokens: 'claude:model sep:pipe ctx:emoji ctx:tokens sep:pipe cost:lines',

  dev: '[fs:dir] git:branch sep:pipe env:node sep:pipe time:now',

  dashboard: '[bold:claude:model] fs:dir sep:pipe git:branch git:status sep:pipe ctx:percent sep:pipe cost:total sep:pipe time:now',

  'context-focus': 'claude:model sep:pipe ctx:bar sep:pipe ctx:tokens sep:pipe ctx:emoji',

  cost: 'claude:model sep:pipe cost:total sep:pipe cost:duration sep:pipe cost:lines-both',

  simple: 'claude:model fs:dir git:branch',

  verbose: '[claude:model] [claude:version] sep:pipe fs:home sep:pipe git:branch git:status git:ahead-behind sep:pipe ctx:bar ctx:percent sep:pipe cost:total cost:duration sep:pipe time:now',

  nerd: 'emoji:node env:node-short sep:dot emoji:folder fs:dir sep:dot emoji:branch git:branch git:status',

  compact: 'claude:model sep:slash fs:dir sep:slash git:branch',

  colorful: 'bold:magenta:claude:model sep:arrow cyan:fs:dir sep:arrow green:git:branch yellow:git:status sep:arrow blue:ctx:percent',

  luca: 'claude:model-letter git:repo git:branch git:dirty cost:total',
};

export function getTheme(name: string): string | null {
  return THEMES[name] || null;
}

export function listThemes(): void {
  console.log('\n\x1b[1mAvailable Themes:\x1b[0m\n');

  for (const [name, format] of Object.entries(THEMES)) {
    console.log(`\x1b[36m${name}\x1b[0m`);
    console.log(`  ${format}`);
    console.log();
  }
}
