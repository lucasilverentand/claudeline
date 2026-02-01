import type { ParsedComponent, GeneratorOptions } from './types.js';
import { getClaudeComponent } from './components/claude.js';
import { getFsComponent } from './components/fs.js';
import { getGitComponent } from './components/git.js';
import { getContextComponent } from './components/context.js';
import { getCostComponent } from './components/cost.js';
import { getEnvComponent } from './components/env.js';
import { getTimeComponent } from './components/time.js';
import { getSeparator } from './separators.js';
import { getEmoji } from './emojis.js';
import { getAnsiCode } from './colors.js';

interface GenerationContext {
  needsExecSync: boolean;
  needsOs: boolean;
  needsPath: boolean;
}

interface ExpressionInfo {
  expr: string;
  isSeparator: boolean;
}

export function generateScript(components: ParsedComponent[], options: GeneratorOptions): string {
  const ctx: GenerationContext = {
    needsExecSync: false,
    needsOs: false,
    needsPath: false,
  };

  // First pass: detect what imports we need
  detectRequirements(components, ctx);

  // Generate the component expressions with type info
  const expressionInfos: ExpressionInfo[] = components
    .map(c => ({
      expr: generateExpression(c, options, ctx),
      isSeparator: c.type === 'sep',
    }))
    .filter(e => e.expr);

  // Build the script
  return buildNodeScript(expressionInfos, ctx, options);
}

function detectRequirements(components: ParsedComponent[], ctx: GenerationContext): void {
  for (const comp of components) {
    if (comp.type === 'git' || comp.type === 'env') {
      ctx.needsExecSync = true;
    }
    if (comp.type === 'fs' || comp.type === 'git' || comp.type === 'env') {
      ctx.needsPath = true;
    }
    if (comp.type === 'fs' || comp.type === 'env') {
      ctx.needsOs = true;
    }
    if (comp.type === 'conditional' && comp.children) {
      if (comp.key === 'git') ctx.needsExecSync = true;
      detectRequirements(comp.children, ctx);
    }
    if (comp.type === 'group' && comp.children) {
      detectRequirements(comp.children, ctx);
    }
  }
}

function generateExpression(
  comp: ParsedComponent,
  options: GeneratorOptions,
  ctx: GenerationContext
): string {
  let expr = '';

  switch (comp.type) {
    case 'claude': {
      const code = getClaudeComponent(comp.key);
      if (code) expr = code;
      break;
    }

    case 'fs': {
      const code = getFsComponent(comp.key);
      if (code) {
        ctx.needsPath = true;
        ctx.needsOs = true;
        expr = code;
      }
      break;
    }

    case 'git': {
      const gitComp = getGitComponent(comp.key);
      if (gitComp) {
        ctx.needsExecSync = true;
        ctx.needsPath = true;
        expr = `(() => { try { return ${gitComp.code}; } catch { return ${gitComp.fallback}; } })()`;
      }
      break;
    }

    case 'ctx': {
      const code = getContextComponent(comp.key, comp.args);
      if (code) expr = code;
      break;
    }

    case 'cost': {
      const code = getCostComponent(comp.key);
      if (code) expr = code;
      break;
    }

    case 'env': {
      const envComp = getEnvComponent(comp.key);
      if (envComp) {
        ctx.needsExecSync = true;
        ctx.needsOs = true;
        ctx.needsPath = true;
        expr = `(() => { try { return ${envComp.code}; } catch { return ${envComp.fallback}; } })()`;
      }
      break;
    }

    case 'time': {
      const code = getTimeComponent(comp.key);
      if (code) expr = code;
      break;
    }

    case 'sep': {
      const sep = getSeparator(comp.key);
      expr = JSON.stringify(sep);
      break;
    }

    case 'emoji': {
      if (options.noEmoji) {
        expr = '""';
      } else {
        const emoji = getEmoji(comp.key);
        expr = JSON.stringify(emoji);
      }
      break;
    }

    case 'text': {
      expr = JSON.stringify(comp.key);
      break;
    }

    case 'group': {
      if (comp.children) {
        const inner = comp.children.map(c => generateExpression(c, options, ctx)).filter(Boolean);
        const brackets = {
          square: ['[', ']'],
          paren: ['(', ')'],
          curly: ['{', '}'],
          angle: ['<', '>'],
        }[comp.key] || ['[', ']'];

        expr = `${JSON.stringify(brackets[0])} + ${inner.join(' + ')} + ${JSON.stringify(brackets[1])}`;
      }
      break;
    }

    case 'conditional': {
      if (comp.children) {
        ctx.needsExecSync = true;
        const inner = comp.children.map(c => generateExpression(c, options, ctx)).filter(Boolean);
        const condition = getConditionCode(comp.key);
        expr = `(${condition} ? (${inner.join(' + ')}) : "")`;
      }
      break;
    }
  }

  if (!expr) return '';

  // Wrap in parentheses to ensure correct precedence when concatenating
  expr = `(${expr})`;

  // Apply styles
  if (comp.styles.length > 0 && !options.noColor) {
    const { open, close } = getAnsiCode(comp.styles);
    if (open) {
      expr = `"${open}" + ${expr} + "${close}"`;
    }
  }

  return expr;
}

function getConditionCode(condition: string): string {
  switch (condition) {
    case 'git':
      return '(() => { try { execSync("git rev-parse --git-dir 2>/dev/null"); return true; } catch { return false; } })()';
    case 'dirty':
      return '(() => { try { execSync("git diff --quiet 2>/dev/null"); return false; } catch { return true; } })()';
    case 'clean':
      return '(() => { try { execSync("git diff --quiet 2>/dev/null"); return true; } catch { return false; } })()';
    case 'node':
      return 'fs.existsSync("package.json")';
    case 'python':
      return 'fs.existsSync("pyproject.toml") || fs.existsSync("setup.py") || fs.existsSync("requirements.txt")';
    case 'rust':
      return 'fs.existsSync("Cargo.toml")';
    case 'go':
      return 'fs.existsSync("go.mod")';
    default:
      return 'true';
  }
}

function buildNodeScript(
  expressionInfos: ExpressionInfo[],
  ctx: GenerationContext,
  options: GeneratorOptions
): string {
  const imports: string[] = [];

  if (ctx.needsPath) {
    imports.push('const path = require("path");');
  }
  if (ctx.needsOs) {
    imports.push('const os = require("os");');
  }
  if (ctx.needsExecSync) {
    imports.push('const { execSync } = require("child_process");');
  }
  imports.push('const fs = require("fs");');

  // Join expressions, adding spaces only between non-separator components
  let outputExpr = '""';
  if (expressionInfos.length > 0) {
    const parts: string[] = [];
    for (let i = 0; i < expressionInfos.length; i++) {
      const curr = expressionInfos[i];
      const prev = expressionInfos[i - 1];

      // Add space before this expression if:
      // - It's not the first expression
      // - Neither this nor the previous expression is a separator
      if (i > 0 && !curr.isSeparator && !prev?.isSeparator) {
        parts.push('" "');
      }

      parts.push(curr.expr);
    }
    outputExpr = parts.join(' + ');
  }

  return `#!/usr/bin/env node
${imports.join('\n')}

// Helper functions
function formatTokens(n) {
  if (n >= 1000000) return Math.round(n / 1000000) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return n.toString();
}

function formatDuration(ms) {
  if (ms < 1000) return ms + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  if (ms < 3600000) return Math.round(ms / 60000) + "m";
  return (ms / 3600000).toFixed(1) + "h";
}

// Read JSON from stdin
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const output = ${outputExpr};
    console.log(output);
  } catch (e) {
    console.log("[claudeline]");
  }
});
`;
}
