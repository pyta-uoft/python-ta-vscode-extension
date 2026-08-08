# Changelog

## [unreleased]

### 🛡️ Security

### 🚨 Breaking changes

### ✨ New features and improvements

- Implement initial PythonTA LSP server
- Add initial PythonTA implementation that simply calls the CLI

### 🐛 Bug fixes

- Updated publisher name from `<david-yz-liu>` to `david-yz-liu`
- Fixed `substitute_attr` in the bundled language server not restoring the original value when the wrapped code raised an exception

### 🔧 Internal changes

- Removed unused `nox` dependency
- Improved test infrastructure: fixed and expanded Python tests, added Typescript extension tests (using Mocha + `@vscode/test-electron`), and added GitHub Actions workflow to run tests
- Removed unused glob pattern `'build/**/*.yml'` from `package.json` `format-check` command
