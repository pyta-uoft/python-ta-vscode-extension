import * as assert from 'assert';
import { LogLevel } from 'vscode';
import { Trace } from 'vscode-jsonrpc/node';
import { getLSClientTraceLevel, getProjectRoot } from '../../common/utilities';

suite('utilities.getLSClientTraceLevel', () => {
    test('returns Off when both levels are Off', () => {
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Off, LogLevel.Off), Trace.Off);
    });

    test('falls back to global level when channel level is Off', () => {
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Off, LogLevel.Debug), Trace.Verbose);
    });

    test('falls back to channel level when global level is Off', () => {
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Info, LogLevel.Off), Trace.Messages);
    });

    test('uses the more verbose (numerically smaller) of the two levels', () => {
        // Info (2) is more verbose than Warning (3); Debug (4) is more verbose than Info.
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Info, LogLevel.Warning), Trace.Messages);
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Debug, LogLevel.Info), Trace.Verbose);
    });

    test('maps Debug and Trace to Trace.Verbose', () => {
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Debug, LogLevel.Debug), Trace.Verbose);
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Trace, LogLevel.Trace), Trace.Verbose);
    });

    test('maps Error, Warning, and Info to Trace.Messages', () => {
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Error, LogLevel.Error), Trace.Messages);
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Warning, LogLevel.Warning), Trace.Messages);
        assert.strictEqual(getLSClientTraceLevel(LogLevel.Info, LogLevel.Info), Trace.Messages);
    });
});

suite('utilities.getProjectRoot', () => {
    test('resolves to a workspace folder without throwing', async () => {
        const root = await getProjectRoot();
        assert.ok(root.uri);
        assert.ok(root.name.length > 0);
    });
});
