"""Shared pytest setup for the Python test suite.

Puts `bundled/libs` and `bundled/tool` on `sys.path` so test modules can
`import lsp_server`, `lsp_utils`, etc. the same way the language server
process does, without each test file repeating the path setup.
"""

import os
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).parents[3]

for _sub_dir in ("libs", "tool"):
    _dir = os.fspath(_PROJECT_ROOT / "bundled" / _sub_dir)
    if _dir not in sys.path:
        sys.path.insert(0, _dir)


def pytest_configure(config):
    """When pytest-cov's `--cov` is passed, also measure coverage inside the
    LSP server subprocess the test client spawns (session.py's LspSession),
    since most of lsp_server.py only runs there, not in-process.

    coverage.py auto-starts itself in a subprocess when COVERAGE_PROCESS_START is set.
    WITH_COVERAGE switches that same subprocess spawn to use `shell=True`, which coverage.py's
    subprocess measurement needs to work here.
    See https://coverage.readthedocs.io/en/latest/subprocess.html
    """
    if config.getoption("cov_source", default=None):
        os.environ.setdefault("COVERAGE_PROCESS_START", os.fspath(_PROJECT_ROOT / "pyproject.toml"))
        os.environ.setdefault("WITH_COVERAGE", "1")
