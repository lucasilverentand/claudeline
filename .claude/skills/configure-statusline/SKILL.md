---
name: configure-statusline
description: Configure claudeline status line for Claude Code. Use when user wants to set up, customize, or change their status line display. Helps users choose themes, build custom formats, and install to global or project scope.
tools: Read, Bash, AskUserQuestion
---

# Configure Claudeline Status Line

Help users configure their Claude Code status line using claudeline.

## Workflow

### Step 1: Understand User's Needs

Ask the user what they want:

```
What would you like to do?
1. **Quick setup** - Install a preset theme
2. **Custom format** - Build a custom status line
3. **See current** - Check what's currently configured
4. **Uninstall** - Remove status line configuration
```

### Step 2: Determine Scope

Ask where to install:

```
Where should the status line be configured?
1. **Global** (~/.claude/settings.json) - Applies to all projects
2. **Project** (.claude/settings.json) - Only this project
```

### Step 3A: Quick Setup (Theme Selection)

If user wants a theme, show available options:

| Theme | Description | Preview |
|-------|-------------|---------|
| `minimal` | Just model and directory | `Sonnet 4 myproject` |
| `default` | Model, directory, git info | `[Sonnet 4] 📁 myproject \| 🌿 main ✓` |
| `powerline` | Powerline style with colors | `Sonnet 4  myproject  main ✓` |
| `full` | Everything including cost/context | `[Sonnet 4] ~/project → main ✓ \| [████░░] 45% \| $0.42` |
| `git` | Git-focused with detailed status | `[Sonnet 4] 📁 myproject \| 🌿 main ✓ ↑2` |
| `tokens` | Token/context focused | `Sonnet 4 \| 🟢 50k/200k \| +133` |
| `dashboard` | Full dashboard view | `[Sonnet 4] myproject \| main ✓ \| 45% \| $0.42 \| 14:32` |
| `compact` | Minimal with slashes | `Sonnet 4 / myproject / main` |
| `colorful` | Vibrant colors | Colored model, dir, branch, status |

Install with:
```bash
npx claudeline --theme <name> --install [--project]
```

### Step 3B: Custom Format Builder

If user wants custom, guide them through building a format string.

#### Available Components

**Model/Session:**
- `claude:model` - Model name (Sonnet 4)
- `claude:model-letter` - First letter (S)

**Directory:**
- `fs:dir` - Current directory name
- `fs:home` - Path with ~ for home
- `fs:project` - Project name

**Git:**
- `git:branch` - Branch name
- `git:status` - ✓ or *
- `git:ahead-behind` - ↑2↓1
- `git:dirty` - Combined status

**Context:**
- `ctx:percent` - Usage % (45%)
- `ctx:bar` - Progress bar [████░░]
- `ctx:emoji` - 🟢🟡🟠🔴
- `ctx:tokens` - 50k/200k

**Cost:**
- `cost:total` - $0.42
- `cost:duration` - 5m
- `cost:lines` - +133

**Time:**
- `time:now` - 14:32
- `time:date` - Feb 1

**Separators:** `sep:pipe` (\|), `sep:arrow` (→), `sep:dot` (•), `sep:slash` (/)

**Emojis:** `emoji:folder` (📁), `emoji:branch` (🌿), `emoji:rocket` (🚀)

**Styling:** Prefix with `green:`, `bold:`, `cyan:`, etc.

**Grouping:** `[...]` adds brackets, `if:git(...)` for conditionals

#### Example Formats

```bash
# Simple
"claude:model fs:dir git:branch"

# With separators
"claude:model sep:pipe fs:dir sep:arrow git:branch"

# With colors
"bold:cyan:claude:model fs:dir green:git:branch"

# With conditionals (only show git info in git repos)
"claude:model fs:dir if:git(sep:pipe git:branch git:status)"

# Full custom
"[bold:cyan:claude:model] emoji:folder fs:dir sep:arrow green:git:branch git:status sep:pipe ctx:percent"
```

Install custom format:
```bash
npx claudeline "<format>" --install [--project]
```

### Step 4: Verify Installation

After installing, show the user:

1. What was written to settings.json
2. Remind them to restart Claude Code

```bash
# Check current configuration
cat ~/.claude/settings.json | grep -A5 statusLine

# Or for project
cat .claude/settings.json | grep -A5 statusLine
```

### Step 5: Test Before Installing (Optional)

User can test their format:

```bash
# See sample data
npx claudeline --preview

# Test with sample data
echo '{"model":{"display_name":"Sonnet 4"},"workspace":{"current_dir":"/test/project"}}' | npx claudeline run "claude:model fs:dir"
```

## Commands Reference

```bash
# Install theme globally
npx claudeline --theme minimal --install

# Install theme to project only
npx claudeline --theme powerline --install --project

# Install custom format
npx claudeline "claude:model fs:dir git:branch" --install

# List all themes
npx claudeline --themes

# List all components
npx claudeline --list

# Uninstall
npx claudeline --uninstall [--project]

# Preview sample data
npx claudeline --preview
```

## Troubleshooting

**Status line not showing?**
- Restart Claude Code after installing
- Check settings.json has the statusLine config

**Command not found?**
- Ensure Node.js/npm is installed
- Try `npx claudeline --help`

**Want to use bun instead of npx?**
- Use `--use-bunx` flag when installing
