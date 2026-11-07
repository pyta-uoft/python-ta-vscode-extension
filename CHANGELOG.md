# Changelog

## [unreleased]

### 🛡️ Security

### 🚨 Breaking changes

### ✨ New features and improvements

- Implement initial PythonTA LSP server
- Add initial PythonTA implementation that simply calls the CLI
- Lint Python documents from their editor contents through standard input
- Add automatic discovery of PythonTA configuration files in the workspace root

### 🐛 Bug fixes

- Updated publisher name from `<david-yz-liu>` to `david-yz-liu`
- Fixed `substitute_attr` in the bundled language server not restoring the original value when the wrapped code raised an exception
- Parse PythonTA's complete standard output as JSON and log an error when the output is malformed.

### 🔧 Internal changes

- Removed unused `nox` dependency
- Improved test infrastructure: fixed and expanded Python tests, added Typescript extension tests (using Mocha + `@vscode/test-electron`), and added GitHub Actions workflow to run tests
- Removed unused glob pattern `'build/**/*.yml'` from `package.json` `format-check` command
- Added test coverage tracking
- Stabilized aggregate coverage reporting when a language-specific report is unavailable
- Stabilized TypeScript coverage by waiting for an end-to-end PythonTA diagnostic
- Fixed `vsce-package` script failing under pnpm by passing `--no-dependencies`, since dependencies are bundled by webpack
- Excluded development-only files (e.g., `.claude/`, `.mypy_cache/`, lockfiles, `scripts/`) from the packaged extension
- Stabilized TypeScript coverage by testing the language client stop-failure path directly
