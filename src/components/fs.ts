// File system components
export const fsComponents: Record<string, string> = {
  path: 'data.workspace?.current_dir || data.cwd || ""',
  dir: 'path.basename(data.workspace?.current_dir || data.cwd || "")',
  project: 'path.basename(data.workspace?.project_dir || "")',
  'project-path': 'data.workspace?.project_dir || ""',
  home: '(data.workspace?.current_dir || data.cwd || "").replace(os.homedir(), "~")',
  cwd: 'data.cwd || ""',
  relative: `(() => {
    const curr = data.workspace?.current_dir || "";
    const proj = data.workspace?.project_dir || "";
    if (proj && curr.startsWith(proj)) {
      return curr.slice(proj.length + 1) || ".";
    }
    return path.basename(curr);
  })()`,
};

export function getFsComponent(key: string): string | null {
  return fsComponents[key] || null;
}
