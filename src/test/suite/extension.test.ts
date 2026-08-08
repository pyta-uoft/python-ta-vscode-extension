import * as assert from 'assert';
import * as vscode from 'vscode';

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
});
