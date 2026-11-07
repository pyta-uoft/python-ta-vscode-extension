import * as assert from 'assert';
import * as vscode from 'vscode';
import { checkIfConfigurationChanged, getGlobalSettings } from '../../common/settings';

const NAMESPACE = 'python-ta';

/**
 * Resolves with the first configuration change event that affects `section`.
 * Unrelated changes (e.g. other extensions updating settings while they activate)
 * are ignored, so the test sees the event caused by its own update.
 */
function waitForConfigurationChange(section: string): Promise<vscode.ConfigurationChangeEvent> {
    return new Promise((resolve) => {
        const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(section)) {
                disposable.dispose();
                resolve(e);
            }
        });
    });
}

suite('settings.getGlobalSettings', () => {
    test('returns defaults matching package.json when nothing overridden', async () => {
        const settings = await getGlobalSettings(NAMESPACE, false);
        assert.deepStrictEqual(settings.args, []);
        assert.deepStrictEqual(settings.path, []);
        assert.strictEqual(settings.importStrategy, 'useBundled');
        assert.strictEqual(settings.showNotifications, 'off');
        assert.strictEqual(settings.configPath, '');
        assert.strictEqual(settings.useProjectRootConfig, true);
    });
});

suite('settings.checkIfConfigurationChanged', () => {
    test('returns true when a namespaced setting changes', async () => {
        const config = vscode.workspace.getConfiguration(NAMESPACE);
        const original = config.get<string[]>('args');

        const changed = waitForConfigurationChange(`${NAMESPACE}.args`);

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

        const changed = waitForConfigurationChange('editor.wordWrap');

        await config.update('wordWrap', 'on', vscode.ConfigurationTarget.Global);
        try {
            const event = await changed;
            assert.strictEqual(checkIfConfigurationChanged(event, NAMESPACE), false);
        } finally {
            await config.update('wordWrap', original, vscode.ConfigurationTarget.Global);
        }
    });
});
