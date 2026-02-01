# claudeline

Customizable status line generator for [Claude Code](https://claude.ai/claude-code).

## Installation

```bash
# Generate and install a status line
npx claudeline --theme default --install

# Or with a custom format
npx claudeline "[claude:model] fs:dir sep:arrow git:branch" --install
```

## Usage

```bash
# Use a preset theme
npx claudeline --theme powerline --install

# Custom format with styling
npx claudeline "[bold:cyan:claude:model] emoji:folder fs:dir sep:arrow green:git:branch"

# List all available components
npx claudeline --list

# List all themes
npx claudeline --themes

# Preview sample JSON data for testing
npx claudeline --preview

# Output the generated script
npx claudeline "fs:dir git:branch" --verbose
```

## Format Syntax

Components are specified using a `type:key` format and can be separated by spaces or commas:

```bash
# These are equivalent
npx claudeline "fs:dir git:branch claude:model"
npx claudeline "fs:dir,git:branch,claude:model"
```

### Style Prefixes

Add colors and styles by prefixing components:

```bash
# Single style
npx claudeline "green:git:branch"

# Multiple styles (chained)
npx claudeline "bold:cyan:claude:model"

# Available styles: red, green, blue, yellow, magenta, cyan, white, gray
#                   bold, dim, italic, underline
#                   bg-red, bg-green, bg-blue, etc.
```

### Grouping

Use brackets to group components:

```bash
npx claudeline "[claude:model] fs:dir"  # Output: [Opus] mydir
npx claudeline "(git:branch)"           # Output: (main)
```

### Conditionals

Show components only when conditions are met:

```bash
npx claudeline "fs:dir if:git(sep:pipe git:branch)"
# Shows branch only if in a git repo
```

## Components

### Claude/Session (`claude:`)
- `claude:model` - Model display name (e.g., "Opus")
- `claude:model-id` - Full model ID
- `claude:version` - Claude Code version
- `claude:session` - Session ID (first 8 chars)
- `claude:style` - Output style name

### Context Window (`ctx:`)
- `ctx:percent` - Percentage used (e.g., "42%")
- `ctx:remaining` - Percentage remaining
- `ctx:tokens` - Tokens used/total (e.g., "19k/200k")
- `ctx:bar` - Visual progress bar `[████░░░░░░]`
- `ctx:bar:5` - Bar with custom width
- `ctx:emoji` - Status emoji (🟢/🟡/🟠/🔴)

### Cost/Usage (`cost:`)
- `cost:total` - Total cost (e.g., "$0.02")
- `cost:duration` - Session duration
- `cost:lines` - Net lines changed (+133)
- `cost:added` - Lines added
- `cost:removed` - Lines removed

### File System (`fs:`)
- `fs:path` - Full current path
- `fs:dir` - Current directory name
- `fs:project` - Project directory name
- `fs:home` - Path with ~ for home

### Git (`git:`)
- `git:branch` - Current branch
- `git:status` - Clean/dirty indicator (✓/*)
- `git:ahead` - Commits ahead (↑2)
- `git:behind` - Commits behind (↓1)
- `git:stash` - Stash count
- `git:staged` - Staged files
- `git:modified` - Modified files
- `git:commit` - Short commit hash

### Environment (`env:`)
- `env:node` - Node.js version
- `env:bun` - Bun version
- `env:python` - Python version
- `env:user` - Username
- `env:hostname` - Hostname

### Time (`time:`)
- `time:now` - Current time (14:32)
- `time:date` - Current date (Feb 1)
- `time:elapsed` - Session elapsed time

### Separators (`sep:`)
- `sep:pipe` - ` | `
- `sep:arrow` - ` → `
- `sep:dot` - ` • `
- `sep:dash` - ` - `
- `sep:space` - ` `

### Emojis (`emoji:`)
- `emoji:folder` - 📁
- `emoji:branch` - 🌿
- `emoji:fire` - 🔥
- `emoji:rocket` - 🚀
- And many more...

## Themes

```bash
npx claudeline --themes  # List all themes
```

Available themes:
- `minimal` - Just model and directory
- `default` - Model, directory, and git info
- `powerline` - Powerline-style with colors
- `full` - Everything including cost and context
- `git` - Git-focused with detailed status
- `tokens` - Token/context focused
- `dashboard` - Full dashboard view
- `colorful` - Vibrant colored output

## CLI Options

```
-o, --output <type>    Output format: node (default)
-i, --install          Install directly to ~/.claude/
-u, --uninstall        Remove statusline configuration
-t, --theme <name>     Use a preset theme
-l, --list             List all available components
--themes               List all available themes
-p, --preview          Show sample JSON data
-v, --verbose          Show the generated script
--no-emoji             Disable emoji output
--no-color             Disable color output
```

## Examples

```bash
# Minimal
npx claudeline "claude:model fs:dir" --install

# Git-focused
npx claudeline "[claude:model] fs:dir sep:pipe git:branch git:status git:ahead-behind" --install

# Full dashboard
npx claudeline "[bold:cyan:claude:model] fs:home sep:arrow green:git:branch sep:pipe ctx:bar ctx:percent sep:pipe cost:total" --install

# Developer info
npx claudeline "[fs:dir] git:branch sep:pipe env:node sep:pipe time:now" --install
```

## License

MIT
