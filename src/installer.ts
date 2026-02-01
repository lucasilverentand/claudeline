import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface InstallOptions {
  useBunx?: boolean;
  useNpx?: boolean;
  globalInstall?: boolean;
  noEmoji?: boolean;
  noColor?: boolean;
}

function getClaudeDir(project: boolean): string {
  if (project) {
    return path.join(process.cwd(), '.claude');
  }
  return path.join(os.homedir(), '.claude');
}

function escapeForShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}

function detectPackageRunner(): 'bunx' | 'npx' {
  // Check if running under bun
  if (process.versions.bun || process.env.BUN_INSTALL) {
    return 'bunx';
  }
  return 'npx';
}

function buildCommand(format: string, options: InstallOptions): string {
  const parts: string[] = [];

  if (options.globalInstall) {
    parts.push('claudeline');
  } else if (options.useBunx) {
    parts.push('bunx claudeline');
  } else if (options.useNpx) {
    parts.push('npx claudeline');
  } else {
    // Auto-detect based on runtime
    parts.push(`${detectPackageRunner()} claudeline`);
  }

  parts.push('run');
  parts.push(`'${escapeForShell(format)}'`);

  if (options.noEmoji) {
    parts.push('--disable-emoji');
  }
  if (options.noColor) {
    parts.push('--disable-color');
  }

  return parts.join(' ');
}

export function install(
  format: string,
  project = false,
  options: InstallOptions = {}
): { success: boolean; message: string } {
  const claudeDir = getClaudeDir(project);
  const settingsPath = path.join(claudeDir, 'settings.json');

  try {
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    const command = buildCommand(format, options);

    let settings: Record<string, unknown> = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch {
        // If settings file is corrupted, start fresh
      }
    }

    settings.statusLine = {
      type: 'command',
      command,
      padding: 0,
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    return {
      success: true,
      message: `Updated settings at ${settingsPath}\nCommand: ${command}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to install: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function uninstall(project = false): { success: boolean; message: string } {
  const claudeDir = getClaudeDir(project);
  const settingsPath = path.join(claudeDir, 'settings.json');

  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      delete settings.statusLine;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }

    return {
      success: true,
      message: 'Statusline configuration removed',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to uninstall: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
