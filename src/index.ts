#!/usr/bin/env node

import { program } from 'commander';
import { parseFormat, listComponents } from './parser.js';
import { getTheme, listThemes, THEMES } from './themes.js';
import { install, uninstall } from './installer.js';
import { getSampleDataJson } from './preview.js';
import { evaluateFormat } from './runtime.js';

const VERSION = '1.0.0';

// Helper to read stdin
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      resolve(input);
    });
    process.stdin.on('error', reject);
  });
}

// Run subcommand - evaluates format string at runtime
program
  .command('run <format>')
  .description('Evaluate a format string and output the status line')
  .option('--disable-emoji', 'Disable emoji output')
  .option('--disable-color', 'Disable color output')
  .action(async (format, options) => {
    try {
      const input = await readStdin();
      const data = JSON.parse(input);
      const output = evaluateFormat(format, data, {
        noEmoji: options.disableEmoji ?? false,
        noColor: options.disableColor ?? false,
      });
      console.log(output);
    } catch (e) {
      // On any error, output a simple fallback
      console.log('[claudeline]');
    }
  });

program
  .name('claudeline')
  .description('Customizable status line generator for Claude Code')
  .version(VERSION)
  .argument('[format]', 'Status line format string')
  .option('-i, --install', 'Install directly to ~/.claude/')
  .option('-u, --uninstall', 'Remove statusline configuration')
  .option('--project', 'Install/uninstall to project .claude/ instead of global')
  .option('-t, --theme <name>', 'Use a preset theme')
  .option('-l, --list', 'List all available components')
  .option('--themes', 'List all available themes')
  .option('-p, --preview', 'Show sample JSON data for testing')
  .option('--no-emoji', 'Disable emoji output')
  .option('--no-color', 'Disable color output')
  .option('--use-bunx', 'Use bunx in installed command')
  .option('--use-npx', 'Use npx in installed command')
  .option('--global-install', 'Assume claudeline is globally installed (use claudeline directly)')
  .addHelpText('after', `
Examples:
  $ npx claudeline --theme minimal --install
  $ npx claudeline --theme powerline --install --project
  $ npx claudeline --list
  $ npx claudeline --themes

  # Test the run command directly:
  $ echo '{"model":{"display_name":"Sonnet"}}' | npx claudeline run "claude:model fs:dir"

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
      console.log('\nTest with the run command:');
      console.log('  echo \'<json>\' | npx claudeline run "claude:model fs:dir"');
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

    // Parse the format string to validate it
    const components = parseFormat(formatStr);

    if (components.length === 0) {
      console.error('No valid components found in format string');
      process.exit(1);
    }

    // Handle installation
    if (options.install) {
      const result = install(formatStr, options.project, {
        useBunx: options.useBunx,
        useNpx: options.useNpx,
        globalInstall: options.globalInstall,
        noEmoji: !options.emoji,
        noColor: !options.color,
      });
      if (result.success) {
        console.log('✓ ' + result.message);
        console.log('\nRestart Claude Code to see your new status line!');
      } else {
        console.error('✗ ' + result.message);
        process.exit(1);
      }
      return;
    }

    // Default: show the command that would be installed
    console.log('Format string validated. Use --install to install.');
    console.log(`Command: npx claudeline run '${formatStr}'`);
  });

program.parse();
