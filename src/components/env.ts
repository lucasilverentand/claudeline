// Environment components - these require shell execution
export const envComponents: Record<string, { code: string; fallback: string }> = {
  node: {
    code: 'execSync("node --version 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  'node-short': {
    code: 'execSync("node --version 2>/dev/null", { encoding: "utf8" }).trim().replace("v", "")',
    fallback: '""',
  },
  bun: {
    code: 'execSync("bun --version 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  npm: {
    code: 'execSync("npm --version 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  pnpm: {
    code: 'execSync("pnpm --version 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  yarn: {
    code: 'execSync("yarn --version 2>/dev/null", { encoding: "utf8" }).trim()',
    fallback: '""',
  },
  python: {
    code: 'execSync("python3 --version 2>/dev/null || python --version 2>/dev/null", { encoding: "utf8" }).trim().replace("Python ", "")',
    fallback: '""',
  },
  deno: {
    code: 'execSync("deno --version 2>/dev/null", { encoding: "utf8" }).split("\\n")[0].replace("deno ", "")',
    fallback: '""',
  },
  rust: {
    code: 'execSync("rustc --version 2>/dev/null", { encoding: "utf8" }).trim().split(" ")[1]',
    fallback: '""',
  },
  go: {
    code: 'execSync("go version 2>/dev/null", { encoding: "utf8" }).trim().split(" ")[2].replace("go", "")',
    fallback: '""',
  },
  ruby: {
    code: 'execSync("ruby --version 2>/dev/null", { encoding: "utf8" }).trim().split(" ")[1]',
    fallback: '""',
  },
  java: {
    code: 'execSync("java -version 2>&1", { encoding: "utf8" }).split("\\n")[0].match(/"([^"]+)"/)?.[1] || ""',
    fallback: '""',
  },
  user: {
    code: 'os.userInfo().username',
    fallback: '""',
  },
  hostname: {
    code: 'os.hostname()',
    fallback: '""',
  },
  'hostname-short': {
    code: 'os.hostname().split(".")[0]',
    fallback: '""',
  },
  shell: {
    code: 'path.basename(process.env.SHELL || "")',
    fallback: '""',
  },
  term: {
    code: 'process.env.TERM || ""',
    fallback: '""',
  },
  os: {
    code: 'process.platform',
    fallback: '""',
  },
  arch: {
    code: 'process.arch',
    fallback: '""',
  },
  'os-release': {
    code: 'os.release()',
    fallback: '""',
  },
  cpus: {
    code: 'os.cpus().length.toString()',
    fallback: '""',
  },
  memory: {
    code: 'Math.round(os.totalmem() / 1024 / 1024 / 1024) + "GB"',
    fallback: '""',
  },
};

export function getEnvComponent(key: string): { code: string; fallback: string } | null {
  return envComponents[key] || null;
}
