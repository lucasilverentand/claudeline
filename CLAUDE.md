# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build (uses tsup for bundling)
bun run build

# Development with watch mode
bun run dev

# Install dependencies (run outside sandbox)
bun install
```

## Conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`)
- This is required for release-please to generate correct changelogs and version bumps

## Architecture

claudeline is a CLI tool that generates customizable status line scripts for Claude Code. It works by:

1. **Parsing** a format string (e.g., `"[claude:model] fs:dir git:branch"`) into a component AST
2. **Generating** a Node.js script that reads JSON from stdin and outputs the formatted status line
3. **Installing** the script to `~/.claude/statusline.js` and updating `~/.claude/settings.json`

### Key Files

- `tsup.config.ts` - Build config; injects `PACKAGE_VERSION` from package.json at build time
- `src/index.ts` - CLI entry point using Commander.js
- `src/parser.ts` - Parses format strings into `ParsedComponent[]` AST with support for styles, groups, and conditionals
- `src/generator.ts` - Transforms AST into executable Node.js script with proper imports and error handling
- `src/installer.ts` - Handles installation to `~/.claude/` (global) or `.claude/` (project)
- `src/themes.ts` - Predefined theme format strings
- `src/components/` - Component generators for each type (claude, fs, git, ctx, cost, env, time)

### Format String Syntax

Components use `type:key` format with optional style prefixes:
- `green:git:branch` - styled component
- `[...]` - grouping with brackets
- `if:git(...)` - conditional rendering
- `sep:arrow`, `emoji:folder` - separators and emojis

The parser extracts style prefixes first, then determines component type/key.

### Generated Script Structure

The generator outputs a Node.js script that:
1. Imports required modules (path, os, child_process, fs) based on component needs
2. Reads JSON from stdin containing Claude Code session data
3. Evaluates component expressions with error handling
4. Outputs the formatted status line string
