#!/usr/bin/env node

import { program } from 'commander';
import { parseFormat, listComponents } from './parser.js';
import { generateScript } from './generator.js';
import { getTheme, listThemes, THEMES } from './themes.js';
import { install, uninstall } from './installer.js';
import { getSampleDataJson } from './preview.js';
import type { GeneratorOptions } from './types.js';

const VERSION = '1.0.0';

program
  .name('claudeline')
  .description('Customizable status line generator for Claude Code')
  .version(VERSION)
  .argument('[format]', 'Status line format string')
  .option('-o, --output <type>', 'Output format: node, bash, python', 'node')
  .option('-i, --install', 'Install directly to ~/.claude/')
  .option('-u, --uninstall', 'Remove statusline configuration')
  .option('--project', 'Install/uninstall to project .claude/ instead of global')
  .option('-t, --theme <name>', 'Use a preset theme')
  .option('-l, --list', 'List all available components')
  .option('--themes', 'List all available themes')
  .option('-p, --preview', 'Show sample JSON data for testing')
  .option('-v, --verbose', 'Show the generated script')
  .option('--no-emoji', 'Disable emoji output')
  .option('--no-color', 'Disable color output')
  .option('-s, --separator <sep>', 'Default separator between components', 'space')
  .addHelpText('after', `
Examples:
  $ npx claudeline "fs:dir git:branch claude:model"
  $ npx claudeline --theme powerline --install
  $ npx claudeline --theme minimal --install --project
  $ npx claudeline "[bold:cyan:claude:model] fs:dir sep:arrow green:git:branch"
  $ npx claudeline --list
  $ npx claudeline --themes

Format Syntax:
  component       Single component (e.g., fs:dir, git:branch)
  prefix:comp     Styled component (e.g., green:git:branch, bold:red:text:ERROR)
  sep:name        Separator (e.g., sep:pipe, sep:arrow)
  emoji:name      Emoji (e.g., emoji:folder, emoji:branch)
  text:value      Custom text (e.g., text:Hello)
  [...]           Group with square brackets
  if:cond(...)    Conditional (e.g., if:git(git:branch))

Components can be separated by spaces or commas.
Multiple style prefixes can be chained: bold:green:git:branch
`)
  .action((format, options) => {
    // Handle special flags first
    if (options.list) {
      listComponents();
      return;
    }

    if (options.themes) {
      listThemes();
      return;
    }

    if (options.uninstall) {
      const result = uninstall(options.project);
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    }

    if (options.preview) {
      console.log('Sample JSON input for testing:\n');
      console.log(getSampleDataJson());
      console.log('\nPipe this to your statusline script to test:');
      console.log('  echo \'<json>\' | ~/.claude/statusline.js');
      return;
    }

    // Determine the format string
    let formatStr = format;

    if (options.theme) {
      const theme = getTheme(options.theme);
      if (!theme) {
        console.error(`Unknown theme: ${options.theme}`);
        console.error(`Available themes: ${Object.keys(THEMES).join(', ')}`);
        process.exit(1);
      }
      formatStr = theme;
    }

    if (!formatStr) {
      // Default format if none specified
      formatStr = THEMES.default;
    }

    // Parse the format string
    const components = parseFormat(formatStr);

    if (components.length === 0) {
      console.error('No valid components found in format string');
      process.exit(1);
    }

    // Generate the script
    const genOptions: GeneratorOptions = {
      output: options.output as 'node' | 'bash' | 'python',
      noEmoji: !options.emoji,
      noColor: !options.color,
      separator: options.separator,
    };

    const script = generateScript(components, genOptions);

    // Handle output
    if (options.install) {
      const result = install(script, options.project);
      if (result.success) {
        console.log('✓ ' + result.message);
        console.log('\nRestart Claude Code to see your new status line!');
      } else {
        console.error('✗ ' + result.message);
        process.exit(1);
      }
      return;
    }

    if (options.verbose) {
      console.log('Generated script:\n');
      console.log(script);
      return;
    }

    // Default: output the script
    console.log(script);
  });

program.parse();
