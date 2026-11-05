import * as assert from 'assert';
import * as vscode from 'vscode';

function waitForPythonTADiagnostics(uri: vscode.Uri): Promise<readonly vscode.Diagnostic[]> {
    return new Promise((resolve, reject) => {
        const subscription = vscode.languages.onDidChangeDiagnostics((event) => {
            if (event.uris.some((changedUri) => changedUri.toString() === uri.toString())) {
                checkDiagnostics();
            }
        });
        const timeout = setTimeout(() => {
            subscription.dispose();
            reject(new Error(`Timed out waiting for PythonTA diagnostics for ${uri.fsPath}`));
        }, 60000);

        function checkDiagnostics() {
            const diagnostics = vscode.languages
                .getDiagnostics(uri)
                .filter((diagnostic) => diagnostic.source === 'python-ta');
            if (diagnostics.length > 0) {
                clearTimeout(timeout);
                subscription.dispose();
                resolve(diagnostics);
            }
        }

        checkDiagnostics();
    });
}

suite('Extension activation', () => {
    test('extension is present and activates', async () => {
        const ext = vscode.extensions.getExtension('david-yz-liu.python-ta');
        assert.ok(ext, 'Extension not found by id david-yz-liu.python-ta');

        await ext!.activate();
        assert.strictEqual(ext!.isActive, true);
    });

    test('registers the restart command', async () => {
        const ext = vscode.extensions.getExtension('david-yz-liu.python-ta');
        await ext?.activate();

        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('python-ta.restart'), 'python-ta.restart command was not registered');
    });

    test('publishes PythonTA diagnostics after activation', async function () {
        this.timeout(70000);
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Test workspace was not opened');

        const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'diagnostics.py');
        const diagnosticsPromise = waitForPythonTADiagnostics(uri);
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        const diagnostics = await diagnosticsPromise;
        assert.ok(
            diagnostics.some((diagnostic) => diagnostic.code === 'E0602'),
            'Expected PythonTA to report the undefined variable',
        );
    });
});
