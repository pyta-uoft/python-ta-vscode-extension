# PythonTA VS Code Extension

This project is an extension for running [PythonTA](https://www.cs.toronto.edu/~david/pyta/) within VS Code.

## Developers

### Requirements

1. [VS Code](https://code.visualstudio.com/download?_exp_download=d53503e735)
2. [Python extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
3. [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
4. [Node.js](https://nodejs.org/en/download)
5. [`pnpm`](https://pnpm.io/installation)

### Setup

1. Install Python dependencies: `uv sync`.
2. Install Javascript dependencies: `pnpm install`.

To start the extension, use the `Debug Extension and Python` configuration in VS Code.

### Running tests

To run the Python tests, run `uv run pytest src/test/python_tests`.

## Linting

To lint the Typescript code, run `pnpm run lint`.

Linting for the Python code has not been set up yet.

### Template information

This repository is based on a [Template for VS Code python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template). See the template `README.md` for more information.
