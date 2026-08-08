import * as cp from 'child_process';
import * as path from 'path';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test runner script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // A throwaway workspace folder so the extension activates
        // (`workspaceContains:*.py`) without touching a real project.
        const workspacePath = path.resolve(__dirname, '../../src/test/testFixture');

        const vscodeExecutablePath = await downloadAndUnzipVSCode();
        const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

        // package.json declares `ms-python.python` as an extension dependency,
        // so it must be installed in the test profile or activation fails.
        // `shell: true` is required on Windows, where the CLI entry point is a `.cmd` file.
        cp.spawnSync(cliPath, [...cliArgs, '--install-extension', 'ms-python.python'], {
            encoding: 'utf-8',
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });

        // Download VS Code, unzip it and run the integration test
        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [workspacePath],
        });
    } catch (err) {
        console.error('Failed to run tests');
        console.error(err);
        process.exit(1);
    }
}

main();
