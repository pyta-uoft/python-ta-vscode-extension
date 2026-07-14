import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { registerLogger, traceError, traceLog, traceVerbose } from './common/log/logging';
import {
    checkVersion,
    getInterpreterDetails,
    initializePython,
    onDidChangePythonInterpreter,
    resolveInterpreter,
} from './common/python';
import { restartServer } from './common/server';
import { checkIfConfigurationChanged, getInterpreterFromSetting } from './common/settings';
import { loadServerDefaults } from './common/setup';
import { LS_SERVER_RESTART_DELAY } from './common/constants';
import { getLSClientTraceLevel } from './common/utilities';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './common/vscodeapi';

import { spawn } from 'child_process';
import * as path from 'path';

let lsClient: LanguageClient | undefined;
let isRestarting = false;
let restartTimer: NodeJS.Timeout | undefined;

let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // This is required to get server name and module. This should be
    // the first thing that we do in this extension.
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    // Setup logging
    const outputChannel = createOutputChannel(serverName);
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));

    const changeLogLevel = async (c: vscode.LogLevel, g: vscode.LogLevel) => {
        const level = getLSClientTraceLevel(c, g);
        await lsClient?.setTrace(level);
    };

    context.subscriptions.push(
        outputChannel.onDidChangeLogLevel(async (e) => {
            await changeLogLevel(e, vscode.env.logLevel);
        }),
        vscode.env.onDidChangeLogLevel(async (e) => {
            await changeLogLevel(outputChannel.logLevel, e);
        }),
    );

    diagnosticCollection = vscode.languages.createDiagnosticCollection('python-ta');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    
    context.subscriptions.push(
        diagnosticCollection,
        statusBarItem,
        vscode.commands.registerCommand(`${serverId}.check`, runPythonTA)
    );

    // Log Server information
    traceLog(`Name: ${serverInfo.name}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

    const runServer = async () => {
        // TODO: Comment back this code when LSP is ready to be implemented

        // if (isRestarting) {
        //     if (restartTimer) {
        //         clearTimeout(restartTimer);
        //     }
        //     restartTimer = setTimeout(runServer, LS_SERVER_RESTART_DELAY);
        //     return;
        // }
        // isRestarting = true;
        // try {
        //     const interpreter = getInterpreterFromSetting(serverId);
        //     if (interpreter && interpreter.length > 0) {
        //         if (checkVersion(await resolveInterpreter(interpreter))) {
        //             traceVerbose(`Using interpreter from ${serverInfo.module}.interpreter: ${interpreter.join(' ')}`);
        //             lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);
        //         }
        //         return;
        //     }

        //     const interpreterDetails = await getInterpreterDetails();
        //     if (interpreterDetails.path) {
        //         traceVerbose(`Using interpreter from Python extension: ${interpreterDetails.path.join(' ')}`);
        //         lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);
        //         return;
        //     }

        //     traceError(
        //         'Python interpreter missing:\r\n' +
        //             '[Option 1] Select python interpreter using the ms-python.python.\r\n' +
        //             `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n` +
        //             'Please use Python 3.10 or greater.',
        //     );
        // } finally {
        //     isRestarting = false;
        // }
    };

    context.subscriptions.push(
        onDidChangePythonInterpreter(async () => {
            await runServer();
        }),
        onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
            if (checkIfConfigurationChanged(e, serverId)) {
                await runServer();
            }
        }),
        registerCommand(`${serverId}.restart`, async () => {
            await runServer();
        }),
    );

    setImmediate(async () => {
        const interpreter = getInterpreterFromSetting(serverId);
        if (interpreter === undefined || interpreter.length === 0) {
            traceLog(`Python extension loading`);
            await initializePython(context.subscriptions);
            traceLog(`Python extension loaded`);
        } else {
            await runServer();
        }
    });
}

export async function deactivate(): Promise<void> {
    if (lsClient) {
        try {
            await lsClient.stop();
        } catch (ex) {
            traceError(`Server: Stop failed: ${ex}`);
        }
    }
}

async function runPythonTA(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'python') {
        vscode.window.showWarningMessage('PythonTA: Open a Python file first.');
        return;
    }

    if (editor.document.isUntitled) {
        vscode.window.showWarningMessage('PythonTA: Please save the file before running the linter.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    
    statusBarItem.text = '$(loading~spin) Running PythonTA...';
    statusBarItem.show();

    const serverId = 'python-ta';
    let pythonPath: string | undefined;

    const settingsInterpreter = getInterpreterFromSetting(serverId);
    if (settingsInterpreter && settingsInterpreter.length > 0) {
        pythonPath = settingsInterpreter[0];
    } 
    else {
        const interpreterDetails = await getInterpreterDetails(editor.document.uri);
        if (interpreterDetails.path && interpreterDetails.path.length > 0) {
            pythonPath = interpreterDetails.path[0];
        }
    }

    const python = pythonPath || 'python';
    
    const env = Object.assign({}, process.env);
    if (python !== 'python') {
        const pythonDir = path.dirname(python);
        const venvDir = path.dirname(pythonDir);
        env.PATH = `${pythonDir}${path.delimiter}${env.PATH || ''}`;
        env.VIRTUAL_ENV = venvDir;
        delete env.PYTHONHOME;
    }

    const args = ['-m', 'python_ta', '--output-format', 'pyta-lsp', filePath];

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : undefined;

    const proc = spawn(python, args, { cwd: cwd, env: env });
    
    let stdout = '';
    let stderr = '';
    let spawnFailed = false;

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('error', () => {
        spawnFailed = true;
        statusBarItem.hide();
        vscode.window.showErrorMessage(`PythonTA: Failed to start process. Could not find executable '${python}'.`);
    });

    proc.on('close', (code: number | null) => {
        statusBarItem.hide();

        if (spawnFailed) {
            return;
        }

        if (code !== 0 && stdout.trim() === '') {
            const detail = stderr.trim() ? `\nDetails: ${stderr.trim()}` : '';
            vscode.window.showErrorMessage(`PythonTA: Process failed (exit ${code}).${detail}`);
            return;
        }

        let results: any[];
        try {
            results = JSON.parse(stdout);
        } catch {
            if (stdout.includes('[INFO] Your PythonTA report is being opened')) {
                vscode.window.showInformationMessage('PythonTA generated a web report instead of LSP data.');
                diagnosticCollection.set(editor.document.uri, []);
            } else {
                vscode.window.showErrorMessage('PythonTA: Received non-JSON output.');
                console.error("Raw Output:", stdout, stderr);
            }
            return;
        }

        diagnosticCollection.set(editor.document.uri, []); 
        for (const { uri, diagnostics } of results) {
            const vscodeDiags = diagnostics.map((d: any) => {
                const diag = new vscode.Diagnostic(
                    new vscode.Range(
                        d.range.start.line, d.range.start.character,
                        d.range.end.line, d.range.end.character
                    ),
                    d.message,
                    d.severity === 1 ? vscode.DiagnosticSeverity.Error : 
                    d.severity === 2 ? vscode.DiagnosticSeverity.Warning : 
                    d.severity === 3 ? vscode.DiagnosticSeverity.Information : 
                    vscode.DiagnosticSeverity.Hint
                );
                diag.code = d.code;
                diag.source = d.source ?? 'python-ta';
                return diag;
            });
            diagnosticCollection.set(vscode.Uri.parse(uri), vscodeDiags);
        }
    });
}