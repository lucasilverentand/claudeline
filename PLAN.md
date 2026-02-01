# claudeline - npx Status Line Generator for Claude Code

## Overview
A CLI tool that generates customizable status line scripts for Claude Code based on a simple, composable syntax.

## Usage
```bash
npx claudeline fs:path,git:branch,git:status,claude:model
npx claudeline --output bash "fs:dir git:branch | claude:model ctx:bar"
npx claudeline --install "green:git:branch sep:arrow blue:fs:dir"
```

## Architecture

```
claudeline/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── parser.ts             # Parse the format string
│   ├── generator.ts          # Generate script output
│   ├── installer.ts          # Install to ~/.claude/
│   ├── components/           # Individual status components
│   │   ├── index.ts
│   │   ├── claude.ts         # Claude-specific info
│   │   ├── git.ts            # Git operations
│   │   ├── fs.ts             # File system info
│   │   ├── context.ts        # Context window stats
│   │   ├── cost.ts           # Cost/usage stats
│   │   ├── env.ts            # Environment info
│   │   ├── time.ts           # Time/date
│   │   ├── sep.ts            # Separators
│   │   └── style.ts          # ANSI styling
│   └── templates/
│       ├── bash.ts
│       ├── node.ts
│       └── python.ts
└── bin/
    └── claudeline.js         # Shebang wrapper
```

## Component Options

### Claude/Session (`claude:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `claude:model` | Model display name | `Opus` |
| `claude:model-id` | Full model ID | `claude-opus-4-1` |
| `claude:version` | Claude Code version | `1.0.80` |
| `claude:session` | Session ID (first 8 chars) | `abc123de` |
| `claude:style` | Output style name | `default` |

### Cost/Usage (`cost:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `cost:total` | Total cost USD | `$0.01` |
| `cost:duration` | Session duration | `45s` |
| `cost:api` | API call duration | `2.3s` |
| `cost:lines` | Net lines changed | `+133` |
| `cost:added` | Lines added | `+156` |
| `cost:removed` | Lines removed | `-23` |

### Context Window (`ctx:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `ctx:percent` | Percentage used | `42%` |
| `ctx:remaining` | Percentage remaining | `58%` |
| `ctx:tokens` | Tokens used/total | `19k/200k` |
| `ctx:in` | Input tokens | `15k` |
| `ctx:out` | Output tokens | `4k` |
| `ctx:bar` | Visual progress bar | `[████░░░░░░]` |
| `ctx:bar:5` | Bar with custom width | `[██░░░]` |
| `ctx:emoji` | Emoji indicator | `🟢` / `🟡` / `🔴` |

### File System (`fs:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `fs:path` | Full current path | `/Users/luca/project` |
| `fs:dir` | Current directory name | `project` |
| `fs:project` | Project directory name | `myapp` |
| `fs:project-path` | Full project path | `/Users/luca/myapp` |
| `fs:home` | Path with ~ for home | `~/project` |
| `fs:relative` | Relative to project | `src/components` |

### Git (`git:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `git:branch` | Current branch | `main` |
| `git:status` | Clean/dirty indicator | `*` or `✓` |
| `git:status-emoji` | Emoji status | `✨` / `📝` |
| `git:ahead` | Commits ahead | `↑2` |
| `git:behind` | Commits behind | `↓1` |
| `git:ahead-behind` | Combined | `↑2↓1` |
| `git:stash` | Stash count | `⚑3` |
| `git:staged` | Staged file count | `●2` |
| `git:modified` | Modified file count | `+3` |
| `git:untracked` | Untracked count | `?1` |
| `git:commit` | Short commit hash | `a1b2c3d` |
| `git:commit-long` | Full commit hash | `a1b2c3d4e5f6...` |
| `git:tag` | Latest tag | `v1.2.3` |
| `git:remote` | Remote name | `origin` |
| `git:repo` | Repository name | `claudeline` |
| `git:user` | Git user name | `luca` |
| `git:email` | Git user email | `luca@...` |

### Environment (`env:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `env:node` | Node.js version | `v20.10.0` |
| `env:bun` | Bun version | `1.0.25` |
| `env:npm` | npm version | `10.2.3` |
| `env:pnpm` | pnpm version | `8.14.0` |
| `env:yarn` | yarn version | `4.0.2` |
| `env:python` | Python version | `3.12.1` |
| `env:deno` | Deno version | `1.40.0` |
| `env:rust` | Rust version | `1.75.0` |
| `env:go` | Go version | `1.21.6` |
| `env:user` | Username | `luca` |
| `env:hostname` | Hostname | `macbook` |
| `env:shell` | Current shell | `zsh` |
| `env:term` | Terminal type | `xterm-256color` |
| `env:os` | OS name | `darwin` |
| `env:arch` | Architecture | `arm64` |

### Time (`time:`)
| Option | Description | Example Output |
|--------|-------------|----------------|
| `time:now` | Current time | `14:32` |
| `time:seconds` | Time with seconds | `14:32:45` |
| `time:12h` | 12-hour format | `2:32 PM` |
| `time:date` | Current date | `Feb 1` |
| `time:full` | Full date | `2026-02-01` |
| `time:iso` | ISO timestamp | `2026-02-01T14:32:45Z` |
| `time:unix` | Unix timestamp | `1738420365` |
| `time:weekday` | Day of week | `Sat` |
| `time:elapsed` | Session elapsed | `5m` |

### Separators (`sep:`)
| Option | Description | Output |
|--------|-------------|--------|
| `sep:pipe` | Pipe | ` \| ` |
| `sep:arrow` | Arrow | ` → ` |
| `sep:arrow-left` | Left arrow | ` ← ` |
| `sep:chevron` | Chevron | ` › ` |
| `sep:dot` | Dot | ` • ` |
| `sep:dash` | Dash | ` - ` |
| `sep:slash` | Slash | ` / ` |
| `sep:space` | Space | ` ` |
| `sep:none` | No separator | `` |
| `sep:newline` | (for multiline) | `\n` |

### Text/Emoji (`text:` / `emoji:`)
| Option | Description | Output |
|--------|-------------|--------|
| `text:Hello` | Custom text | `Hello` |
| `text:"Hello World"` | Text with spaces | `Hello World` |
| `emoji:folder` | Folder emoji | `📁` |
| `emoji:branch` | Branch emoji | `🌿` |
| `emoji:git` | Git emoji | `` |
| `emoji:node` | Node emoji | `⬢` |
| `emoji:python` | Python emoji | `🐍` |
| `emoji:rust` | Rust emoji | `🦀` |
| `emoji:check` | Check mark | `✓` |
| `emoji:x` | X mark | `✗` |
| `emoji:warn` | Warning | `⚠` |
| `emoji:star` | Star | `★` |
| `emoji:fire` | Fire | `🔥` |
| `emoji:rocket` | Rocket | `🚀` |
| `emoji:sparkle` | Sparkle | `✨` |

### Colors/Styling (`color:component` or shorthand)
| Prefix | Description |
|--------|-------------|
| `red:` | Red text |
| `green:` | Green text |
| `blue:` | Blue text |
| `yellow:` | Yellow text |
| `magenta:` | Magenta text |
| `cyan:` | Cyan text |
| `white:` | White text |
| `gray:` | Gray/dim text |
| `bold:` | Bold text |
| `dim:` | Dim text |
| `italic:` | Italic text |
| `underline:` | Underlined text |
| `bg-red:` | Red background |
| `bg-green:` | Green background |
| `bg-blue:` | Blue background |

Colors can be combined: `bold:green:git:branch`

### Conditionals (`if:`)
| Option | Description |
|--------|-------------|
| `if:git` | Only show if in git repo |
| `if:dirty` | Only show if git is dirty |
| `if:node` | Only show if package.json exists |
| `if:python` | Only show if in Python project |

Example: `if:git(git:branch,git:status)`

### Groups/Brackets
| Option | Description | Output |
|--------|-------------|--------|
| `[...]` | Square brackets | `[content]` |
| `(...)` | Parentheses | `(content)` |
| `{...}` | Curly braces | `{content}` |
| `<...>` | Angle brackets | `<content>` |

## CLI Options

```bash
claudeline [format] [options]

Options:
  -o, --output <type>    Output format: bash, node, python, fish, zsh (default: node)
  -i, --install          Install directly to ~/.claude/settings.json
  -p, --preview          Preview the status line with sample data
  -l, --list             List all available components
  -t, --theme <name>     Use a preset theme
  -c, --config <file>    Load config from file
  -v, --verbose          Show generated script
  --no-emoji             Disable emoji output
  --no-color             Disable color output
  --separator <sep>      Default separator between components
  --help                 Show help
  --version              Show version

Themes:
  --theme minimal        [Model] dir
  --theme powerline      Powerline-style with git info
  --theme full           Everything including cost and context
  --theme git            Git-focused status line
  --theme tokens         Token/context focused
```

## Example Configurations

### Minimal
```bash
npx claudeline "claude:model fs:dir"
# Output: [Opus] claudeline
```

### Git-focused
```bash
npx claudeline "[claude:model] emoji:folder fs:dir if:git(sep:pipe emoji:branch git:branch git:status)"
# Output: [Opus] 📁 claudeline | 🌿 main *
```

### Full Dashboard
```bash
npx claudeline "[bold:cyan:claude:model] fs:home sep:arrow green:git:branch git:status sep:pipe ctx:bar ctx:percent sep:pipe cost:total"
# Output: [Opus] ~/claudeline → main * | [████░░░░░░] 42% | $0.01
```

### Token-focused
```bash
npx claudeline "claude:model sep:pipe ctx:emoji ctx:tokens sep:pipe cost:lines"
# Output: Opus | 🟢 19k/200k | +133
```

### Developer Info
```bash
npx claudeline "[fs:dir] git:branch sep:pipe env:node sep:pipe time:now"
# Output: [claudeline] main | v20.10.0 | 14:32
```

## Implementation Plan

### Phase 1: Core Setup
1. Initialize npm package with TypeScript
2. Set up build pipeline (tsup or esbuild)
3. Create CLI argument parser
4. Implement basic component system

### Phase 2: Components
1. Implement all `claude:` components (read from stdin JSON)
2. Implement all `fs:` components
3. Implement all `git:` components
4. Implement all `ctx:` components
5. Implement all `cost:` components
6. Implement all `env:` components
7. Implement all `time:` components
8. Implement separators and text

### Phase 3: Styling
1. ANSI color code generation
2. Style prefix parsing
3. Conditional rendering
4. Grouping/brackets

### Phase 4: Output Generation
1. Node.js template generator
2. Bash template generator
3. Python template generator
4. Fish/Zsh templates (bonus)

### Phase 5: Installation & Polish
1. Auto-install to `~/.claude/settings.json`
2. Preview mode with mock data
3. Theme presets
4. Documentation and examples
5. Tests

## Technical Notes

- Use `commander` or `yargs` for CLI parsing
- Use `chalk` for terminal colors (for preview mode)
- Generated scripts should have no dependencies
- Support both comma and space as component separators
- Handle missing data gracefully (git commands may fail outside repos)
- Keep generated scripts as small as possible
