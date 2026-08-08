import * as path from 'path';
import { glob } from 'glob';
import Mocha from 'mocha';

// @vscode/test-electron launches a real VS Code Extension Host and expects
// this module to export a `run()` it can call once that host is up. Mocha is
// used here (rather than e.g. Jest) because it fits that contract directly —
// it's a plain library we drive ourselves with `new Mocha()` / `mocha.run()`,
// with no test process or environment of its own to reconcile with the one
// @vscode/test-electron already launched.
export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 20000,
    });

    const testsRoot = path.resolve(__dirname, '.');
    const files = await glob('**/*.test.js', { cwd: testsRoot });

    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    return new Promise((resolve, reject) => {
        try {
            mocha.run((failures) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}
