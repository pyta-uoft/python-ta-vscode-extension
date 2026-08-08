#!/usr/bin/env node
'use strict';

// Runs the extension test suite under c8 (V8 coverage).
//
// c8 measures coverage of whatever JS file VS Code actually loads as the
// extension's main entry. `dist/extension.js` is a webpack bundle whose
// source map uses `webpack://` source URIs, which coverage tooling can't
// resolve back to real files -- it reports one opaque blob instead of a
// per-file breakdown. `out/extension.js` (plain `tsc` output, unbundled) is
// a 1:1 compile of `src/`, so this script points package.json's "main" at
// that just for the duration of this run, then restores it.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const originalContent = fs.readFileSync(pkgPath, 'utf8');
const modifiedContent = originalContent.replace(
    /"main":\s*"\.\/dist\/extension\.js"/,
    '"main": "./out/extension.js"',
);

if (modifiedContent === originalContent) {
    console.error('run-coverage: could not find "main": "./dist/extension.js" in package.json to swap out.');
    process.exit(1);
}

function restore() {
    fs.writeFileSync(pkgPath, originalContent);
}
process.on('SIGINT', () => {
    restore();
    process.exit(130);
});

fs.writeFileSync(pkgPath, modifiedContent);
try {
    const result = spawnSync(
        'c8',
        [
            '--reporter=text',
            '--reporter=html',
            // lcovonly produces .coverage/typescript/reports/lcov.info, for
            // uploading to coveralls.io in CI.
            '--reporter=lcovonly',
            // Keep coverage output next to the Python side's, under .coverage/.
            // temp-directory is a sibling of (not nested in) reports-dir: c8
            // clears reports-dir before writing, which would wipe temp-directory's
            // raw per-process V8 coverage data first if it were nested inside.
            '--reports-dir',
            '.coverage/typescript/reports',
            '--temp-directory',
            '.coverage/typescript/tmp',
            '--exclude',
            'out/test/**',
            // Downloaded test extensions (e.g. ms-python.debugpy) live under
            // .vscode-test/, inside the repo's cwd, and would otherwise show
            // up in the report alongside our own source.
            '--exclude',
            '.vscode-test/**',
            'node',
            './out/test/runTest.js',
        ],
        { stdio: 'inherit', shell: process.platform === 'win32' },
    );
    process.exitCode = result.status ?? 1;
} finally {
    restore();
}
