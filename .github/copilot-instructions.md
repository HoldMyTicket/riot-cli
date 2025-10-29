# Copilot Instructions for riot-cli

## Project Overview
This is a command-line tool for compiling Riot.js tags. It's a fork/variant published as `@holdmyticket/hmt-riot-cli` that provides compilation, watching, and syntax checking for `.tag` files into JavaScript.

## Architecture & Key Components

### Entry Point & CLI Structure
- **`lib/index.js`**: Main CLI entry with shebang, handles option parsing via `optionator`
- **Task-based architecture**: Each command is implemented as a class extending `Task.js`
- **API dual-mode**: Works both as CLI tool and Node.js module (`module.parent` check)

### Core Task Classes (in `lib/tasks/`)
- **`Make.js`**: Compiles `.tag` files to `.js` using riot-compiler
- **`Watch.js`**: File watcher using chokidar + cluster for process resilience  
- **`Check.js`**: Syntax analyzer for tag validation
- **`New.js`**: Scaffolds new tag templates

### Configuration & Options
- **`lib/options.js`**: Defines CLI options using optionator schema
- **Config file support**: `--config` flag loads external config files
- **Flow detection**: Automatic file vs directory detection (`opt.flow`)

## Development Workflows

### Testing
```bash
make test           # Full test suite (eslint + cli + mocha)
make eslint         # Code style checking  
make test-cli       # CLI integration tests via shell commands
make test-mocha     # Unit tests with istanbul coverage
```

### Building & Publishing
```bash
make raw            # Build process (see Makefile for details)
# Update package.json version, commit, tag vX.X.X, push
npm publish         # To npmjs
```

## Key Patterns & Conventions

### Task Pattern
```javascript
class TaskName extends Task {
  run(opt) {
    // Task logic using opt.from, opt.to, opt.compiler settings
    // Always call super() in constructor for validation
  }
}
```

### File Processing Flow
- **Flow types**: Detected automatically as file-to-file (`ff`), file-to-dir (`fd`), dir-to-file (`df`), dir-to-dir (`dd`)
- **Extension handling**: Uses `this.extRegex` (default `.tag`) for file matching
- **Path resolution**: Always resolve to absolute paths via `path.resolve()`

### Error Handling
- **Global silent mode**: `global.isSilent` controls output verbosity
- **CLI vs Module**: Different error handling for CLI usage vs programmatic usage
- **Validation**: Task constructor validates options and sets `this.error`

### Dependencies & Integration
- **riot-compiler**: Core compilation engine (can be globally overridden)
- **chokidar**: File watching with ignore patterns for temp files
- **shelljs**: Cross-platform shell operations (find, mkdir, test)
- **cluster**: Process management for watch mode resilience

## File Patterns & Structure

### Test Organization
- **`test/runner.js`**: Test suite entry point
- **`test/specs/`**: Mocha specs using expect.js
- **`test/fixtures/`**: Config file examples
- **`test/tags/`**: Sample tag files for testing
- **`test/expected/`**: Expected output for comparison tests

### Temporary File Handling
- **Pattern**: `TEMP_FILE_NAME` regex filters editor temp files (`.name.tag`, `~name.tag`, `name~.tag`)
- **Generated**: Tests create files in `test/generated/` (gitignored)

## Common Operations

### Adding New CLI Options
1. Add option definition to `lib/options.js`
2. Handle in `cli()` function option translation
3. Pass through to Task constructor in `opt` object
4. Update help text in options append section

### Extending Compilation
- **Parser extension**: Use `opt.parsers` to extend `compiler.parsers`  
- **Preprocessors**: Support for style/template/type preprocessors via options
- **Output formats**: Support for modular (AMD/CommonJS) via `opt.modular`

## Critical Implementation Notes
- **Watch mode**: Uses cluster.fork() to survive parser process.exit() calls
- **Config loading**: Async config file loading with `co()` generator pattern
- **Path handling**: Extensive use of `path.resolve()` for absolute path consistency
- **Color output**: Chalk configuration respects `--colors` flag