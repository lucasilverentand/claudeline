// Git components - these require shell execution
export const gitComponents: Record<string, { code: string; fallback: string }> = {
  branch: {
    code: 'execSync("git branch --show-current 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  status: {
    code: '(() => { try { execSync("git diff --quiet 2>/dev/null"); return "✓"; } catch { return "*"; } })()',
    fallback: '""',
  },
  'status-emoji': {
    code: '(() => { try { execSync("git diff --quiet 2>/dev/null"); return "✨"; } catch { return "📝"; } })()',
    fallback: '""',
  },
  'status-word': {
    code: '(() => { try { execSync("git diff --quiet 2>/dev/null"); return "clean"; } catch { return "dirty"; } })()',
    fallback: '""',
  },
  ahead: {
    code: '(() => { const n = execSync("git rev-list --count @{u}..HEAD 2>/dev/null", { encoding: "utf8" }).trim(); return n !== "0" ? "↑" + n : ""; })()',
    fallback: '""',
  },
  behind: {
    code: '(() => { const n = execSync("git rev-list --count HEAD..@{u} 2>/dev/null", { encoding: "utf8" }).trim(); return n !== "0" ? "↓" + n : ""; })()',
    fallback: '""',
  },
  'ahead-behind': {
    code: `(() => {
      const ahead = execSync("git rev-list --count @{u}..HEAD 2>/dev/null", { encoding: "utf8" }).trim();
      const behind = execSync("git rev-list --count HEAD..@{u} 2>/dev/null", { encoding: "utf8" }).trim();
      let result = "";
      if (ahead !== "0") result += "↑" + ahead;
      if (behind !== "0") result += "↓" + behind;
      return result;
    })()`,
    fallback: '""',
  },
  stash: {
    code: '(() => { const n = execSync("git stash list 2>/dev/null | wc -l", { encoding: "utf8" }).trim(); return n !== "0" ? "⚑" + n : ""; })()',
    fallback: '""',
  },
  staged: {
    code: '(() => { const n = execSync("git diff --cached --numstat 2>/dev/null | wc -l", { encoding: "utf8" }).trim(); return n !== "0" ? "●" + n : ""; })()',
    fallback: '""',
  },
  modified: {
    code: '(() => { const n = execSync("git diff --numstat 2>/dev/null | wc -l", { encoding: "utf8" }).trim(); return n !== "0" ? "+" + n : ""; })()',
    fallback: '""',
  },
  untracked: {
    code: '(() => { const n = execSync("git ls-files --others --exclude-standard 2>/dev/null | wc -l", { encoding: "utf8" }).trim(); return n !== "0" ? "?" + n : ""; })()',
    fallback: '""',
  },
  dirty: {
    code: `(() => {
      const staged = parseInt(execSync("git diff --cached --numstat 2>/dev/null | wc -l", { encoding: "utf8" }).trim()) || 0;
      const modified = parseInt(execSync("git diff --numstat 2>/dev/null | wc -l", { encoding: "utf8" }).trim()) || 0;
      const untracked = parseInt(execSync("git ls-files --others --exclude-standard 2>/dev/null | wc -l", { encoding: "utf8" }).trim()) || 0;
      if (staged === 0 && modified === 0 && untracked === 0) return "";
      const parts = [];
      if (staged > 0) parts.push("+" + staged);
      if (untracked > 0) parts.push("-" + untracked);
      if (modified > 0) parts.push("~" + modified);
      return parts.join(" ");
    })()`,
    fallback: '""',
  },
  commit: {
    code: 'execSync("git rev-parse --short HEAD 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  'commit-long': {
    code: 'execSync("git rev-parse HEAD 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  tag: {
    code: 'execSync("git describe --tags --abbrev=0 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  remote: {
    code: 'execSync("git remote 2>/dev/null", { encoding: "utf8" }).trim().split("\\n")[0]',
    fallback: '""',
  },
  repo: {
    code: 'path.basename(execSync("git rev-parse --show-toplevel 2>/dev/null", { encoding: "utf8" }).trim())',
    fallback: '""',
  },
  user: {
    code: 'execSync("git config user.name 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  email: {
    code: 'execSync("git config user.email 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  'remote-url': {
    code: 'execSync("git remote get-url origin 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
};

export function getGitComponent(key: string): { code: string; fallback: string } | null {
  return gitComponents[key] || null;
}
