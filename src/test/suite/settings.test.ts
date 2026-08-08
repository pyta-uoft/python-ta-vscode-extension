import * as assert from 'assert';
import * as vscode from 'vscode';
import { checkIfConfigurationChanged, getGlobalSettings } from '../../common/settings';

const NAMESPACE = 'python-ta';

suite('settings.getGlobalSettings', () => {
    test('returns defaults matching package.json when nothing overridden', async () => {
        const settings = await getGlobalSettings(NAMESPACE, false);
        assert.deepStrictEqual(settings.args, []);
        assert.deepStrictEqual(settings.path, []);
        assert.strictEqual(settings.importStrategy, 'useBundled');
        assert.strictEqual(settings.showNotifications, 'off');
        assert.strictEqual(settings.configPath, '');
    });
});

suite('settings.checkIfConfigurationChanged', () => {
    test('returns true when a namespaced setting changes', async () => {
        const config = vscode.workspace.getConfiguration(NAMESPACE);
        const original = config.get<string[]>('args');

        const changed = new Promise<vscode.ConfigurationChangeEvent>((resolve) => {
            const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
                disposable.dispose();
                resolve(e);
            });
        });

        await config.update('args', ['--foo'], vscode.ConfigurationTarget.Global);
        try {
            const event = await changed;
            assert.strictEqual(checkIfConfigurationChanged(event, NAMESPACE), true);
        } finally {
            await config.update('args', original, vscode.ConfigurationTarget.Global);
        }
    });

    test('returns false for changes to an unrelated configuration namespace', async () => {
        const config = vscode.workspace.getConfiguration('editor');
        const original = config.get<boolean>('wordWrap');

        const changed = new Promise<vscode.ConfigurationChangeEvent>((resolve) => {
            const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
                disposable.dispose();
                resolve(e);
            });
        });

        await config.update('wordWrap', 'on', vscode.ConfigurationTarget.Global);
        try {
            const event = await changed;
            assert.strictEqual(checkIfConfigurationChanged(event, NAMESPACE), false);
        } finally {
            await config.update('wordWrap', original, vscode.ConfigurationTarget.Global);
        }
    });
});
