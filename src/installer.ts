import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getClaudeDir(project: boolean): string {
  if (project) {
    return path.join(process.cwd(), '.claude');
  }
  return path.join(os.homedir(), '.claude');
}

export function install(script: string, project = false): { success: boolean; message: string } {
  const claudeDir = getClaudeDir(project);
  const scriptPath = path.join(claudeDir, 'statusline.js');
  const settingsPath = path.join(claudeDir, 'settings.json');

  try {
    // Ensure .claude directory exists
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Write the statusline script
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });

    // Update settings.json
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
      command: scriptPath,
      padding: 0,
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    return {
      success: true,
      message: `Installed statusline to ${scriptPath}\nUpdated settings at ${settingsPath}`,
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
  const scriptPath = path.join(claudeDir, 'statusline.js');
  const settingsPath = path.join(claudeDir, 'settings.json');

  try {
    // Remove the script if it exists
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    // Remove statusLine from settings
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
