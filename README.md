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

To start the extension,

### Running tests

To run the Python tests, run `uv run pytest src/test/python_tests`.

### Template information

This repository is based on a [Template for VS Code python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template). See the template `README.md` for more information.

## Linting

Run `nox --session lint` to run linting on both Python and TypeScript code. Please update the nox file if you want to use a different linter and formatter.

## Packaging and Publishing

1. Update various fields in `package.json`. At minimum, check the following fields and update them accordingly. See [extension manifest reference](https://code.visualstudio.com/api/references/extension-manifest) to add more fields:
    - `"publisher"`: Update this to your publisher id from <https://marketplace.visualstudio.com/>.
    - `"version"`: See <https://semver.org/> for details of requirements and limitations for this field.
    - `"license"`: Update license as per your project. Defaults to `MIT`.
    - `"keywords"`: Update keywords for your project, these will be used when searching in the VS Code marketplace.
    - `"categories"`: Update categories for your project, makes it easier to filter in the VS Code marketplace.
    - `"homepage"`, `"repository"`, and `"bugs"` : Update URLs for these fields to point to your project.
    - **Optional** Add `"icon"` field with relative path to a image file to use as icon for this project.
1. Make sure to check the following markdown files:
    - **REQUIRED** First time only: `CODE_OF_CONDUCT.md`, `LICENSE`, `SUPPORT.md`, `SECURITY.md`
    - Every Release: `CHANGELOG.md`
1. Build package using `nox --session build_package`.
1. Take the generated `.vsix` file and upload it to your extension management page <https://marketplace.visualstudio.com/manage>.

To do this from the command line see here <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>
