import * as assert from 'assert';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { stopServer } from '../../common/server';

/** Returns a stand-in LanguageClient whose `stop()` behaves as given, and a counter of calls to it. */
function fakeClient(stop: () => Promise<void>): { client: LanguageClient; stopCalls: () => number } {
    let calls = 0;
    const client = {
        stop: () => {
            calls += 1;
            return stop();
        },
    } as unknown as LanguageClient;
    return { client, stopCalls: () => calls };
}

suite('server.stopServer', () => {
    suiteSetup(async () => {
        // Activating the extension registers the output channel logger, so the
        // failure path below logs through it just as it does at runtime.
        await vscode.extensions.getExtension('david-yz-liu.python-ta')?.activate();
    });

    test('does nothing when there is no client', async () => {
        await stopServer(undefined);
    });

    test('stops the client', async () => {
        const { client, stopCalls } = fakeClient(() => Promise.resolve());
        await stopServer(client);
        assert.strictEqual(stopCalls(), 1);
    });

    test('logs and swallows errors when the client fails to stop', async () => {
        // Mirrors vscode-languageclient's error when a restart races a client that is still starting.
        const { client, stopCalls } = fakeClient(() =>
            Promise.reject(new Error("Client is not running and can't be stopped. It's current state is: starting")),
        );
        await stopServer(client);
        assert.strictEqual(stopCalls(), 1);
    });
});
