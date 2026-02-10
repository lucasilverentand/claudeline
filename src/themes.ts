export const THEMES: Record<string, string> = {
  minimal: 'claude:model fs:dir',

  default: '[claude:model] nerd:nf-cod-folder fs:dir if:git(sep:pipe nerd:nf-dev-git_branch git:branch git:status)',

  powerline: 'bold:cyan:claude:model sep:powerline nerd:nf-cod-folder fs:dir if:git(sep:powerline green:nerd:nf-dev-git_branch green:git:branch git:status)',

  full: '[bold:cyan:claude:model] nerd:nf-cod-home fs:home sep:arrow green:nerd:nf-dev-git_branch green:git:branch git:status sep:pipe ctx:bar ctx:percent sep:pipe nerd:nf-fa-dollar_sign cost:total',

  git: '[claude:model] nerd:nf-cod-folder fs:dir sep:pipe nerd:nf-dev-git_branch git:branch git:status git:ahead-behind if:dirty(sep:pipe git:staged git:modified git:untracked)',

  tokens: 'claude:model sep:pipe ctx:icon ctx:tokens sep:pipe cost:lines',

  dev: '[nerd:nf-cod-folder fs:dir] nerd:nf-dev-git_branch git:branch sep:pipe nerd:nf-dev-nodejs_small env:node sep:pipe nerd:nf-fa-clock time:now',

  dashboard: '[bold:claude:model] nerd:nf-cod-folder fs:dir sep:pipe nerd:nf-dev-git_branch git:branch git:status sep:pipe nerd:nf-fa-gauge ctx:percent sep:pipe nerd:nf-fa-dollar_sign cost:total sep:pipe nerd:nf-fa-clock time:now',

  'context-focus': 'claude:model sep:pipe ctx:bar sep:pipe ctx:tokens sep:pipe ctx:icon',

  cost: 'claude:model sep:pipe nerd:nf-fa-dollar_sign cost:total sep:pipe nerd:nf-fa-stopwatch cost:duration sep:pipe cost:lines-both',

  simple: 'claude:model fs:dir git:branch',

  verbose: '[claude:model] [claude:version] sep:pipe nerd:nf-cod-home fs:home sep:pipe nerd:nf-dev-git_branch git:branch git:status git:ahead-behind sep:pipe ctx:bar ctx:percent sep:pipe nerd:nf-fa-dollar_sign cost:total cost:duration sep:pipe nerd:nf-fa-clock time:now',

  nerd: 'nerd:nf-dev-nodejs_small env:node-short sep:dot nerd:nf-cod-folder fs:dir sep:dot nerd:nf-dev-git_branch git:branch git:status',

  compact: 'claude:model sep:slash fs:dir sep:slash git:branch',

  colorful: 'bold:magenta:claude:model sep:arrow cyan:nerd:nf-cod-folder cyan:fs:dir sep:arrow green:nerd:nf-dev-git_branch green:git:branch yellow:git:status sep:arrow blue:nerd:nf-fa-gauge blue:ctx:percent',

  luca: 'bold:magenta:claude:model if:effort(dim:sep:middot claude:effort-icon claude:effort) dim:sep:middot cyan:nerd:nf-md-source_branch cyan:git:repo sep:none text:: sep:none green:git:branch if:subdir(sep:none white:text:/ sep:none white:fs:relative) if:dirty(dim:sep:middot git:dirty) dim:sep:middot white:account:email sep:newline bold:white:usage:5h-bar:8 usage:5h (usage:5h-pace) dim:usage:5h-reset dim:sep:middot bold:white:usage:week-bar:8 usage:week (usage:week-pace) dim:usage:week-reset dim:sep:middot white:cost:total',
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
