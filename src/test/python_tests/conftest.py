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
