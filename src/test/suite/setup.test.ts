import * as assert from 'assert';
import { loadServerDefaults } from '../../common/setup';

suite('setup.loadServerDefaults', () => {
    test('reads serverInfo from package.json', () => {
        const info = loadServerDefaults();
        assert.strictEqual(info.name, 'PythonTA VS Code Extension');
        assert.strictEqual(info.module, 'python-ta');
    });
});
