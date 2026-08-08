"""Unit tests for the pure helper functions in bundled/tool/lsp_server.py.

These exercise URI/path normalization, JSON diagnostic parsing, and the
workspace-settings lookup helpers directly, without spinning up a real LSP
session (see test_server.py / test_notebook.py for end-to-end coverage).
"""

import json
import os
import pathlib
import types

import pytest
from lsprotocol import types as lsp
from pygls import uris

import lsp_server


@pytest.fixture(autouse=True)
def _reset_module_state():
    """Each test gets a clean slate for the module-level settings caches."""
    saved_workspace = dict(lsp_server.WORKSPACE_SETTINGS)
    saved_global = dict(lsp_server.GLOBAL_SETTINGS)
    lsp_server.WORKSPACE_SETTINGS.clear()
    lsp_server.GLOBAL_SETTINGS.clear()
    yield
    lsp_server.WORKSPACE_SETTINGS.clear()
    lsp_server.WORKSPACE_SETTINGS.update(saved_workspace)
    lsp_server.GLOBAL_SETTINGS.clear()
    lsp_server.GLOBAL_SETTINGS.update(saved_global)


# ---------------------------------------------------------------------------
# _get_document_path
# ---------------------------------------------------------------------------


def test_get_document_path_regular_file_uri():
    file_uri = "file:///home/user/project/foo.py"
    document = types.SimpleNamespace(uri=file_uri)
    assert lsp_server._get_document_path(document) == uris.to_fs_path(file_uri)


def test_get_document_path_notebook_cell_uri_strips_scheme_and_fragment():
    file_uri = "file:///home/user/project/nb.ipynb"
    cell_uri = "vscode-notebook-cell:/home/user/project/nb.ipynb#cell1"
    document = types.SimpleNamespace(uri=cell_uri)
    assert lsp_server._get_document_path(document) == uris.to_fs_path(file_uri)


# ---------------------------------------------------------------------------
# _parse_json_output
# ---------------------------------------------------------------------------


def _make_payload():
    return [
        {
            "uri": "file:///home/user/project/foo.py",
            "diagnostics": [
                {
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 0, "character": 5},
                    },
                    "message": "msg",
                    "severity": 1,
                    "code": "E0001",
                    "source": "python-ta",
                }
            ],
        },
        {"uri": "file:///home/user/project/bar.py", "diagnostics": []},
    ]


def test_parse_json_output_returns_diagnostics_for_matching_uri():
    content = json.dumps(_make_payload())
    result = lsp_server._parse_json_output(content, "file:///home/user/project/foo.py")

    assert len(result) == 1
    diagnostic = result[0]
    assert isinstance(diagnostic, lsp.Diagnostic)
    assert diagnostic.message == "msg"
    assert diagnostic.code == "E0001"
    assert diagnostic.source == "python-ta"
    assert diagnostic.severity == lsp.DiagnosticSeverity.Error


def test_parse_json_output_ignores_leading_log_lines():
    content = "some log preamble\nmore logs\n" + json.dumps(_make_payload())
    result = lsp_server._parse_json_output(content, "file:///home/user/project/foo.py")
    assert len(result) == 1


def test_parse_json_output_returns_empty_list_for_unmatched_uri():
    content = json.dumps(_make_payload())
    result = lsp_server._parse_json_output(content, "file:///home/user/project/missing.py")
    assert result == []


def test_parse_json_output_returns_empty_list_when_no_json_array_present():
    assert lsp_server._parse_json_output("no json here", "file:///x.py") == []


def test_parse_json_output_returns_empty_list_for_file_with_no_diagnostics():
    content = json.dumps(_make_payload())
    result = lsp_server._parse_json_output(content, "file:///home/user/project/bar.py")
    assert result == []


# ---------------------------------------------------------------------------
# _get_global_defaults
# ---------------------------------------------------------------------------


def test_get_global_defaults_uses_builtin_fallbacks_when_empty():
    defaults = lsp_server._get_global_defaults()
    assert defaults["path"] == []
    assert defaults["args"] == []
    assert defaults["importStrategy"] == "useBundled"
    assert defaults["showNotifications"] == "off"
    assert defaults["configPath"] == ""


def test_get_global_defaults_reflects_global_settings_overrides():
    lsp_server.GLOBAL_SETTINGS.update({"importStrategy": "fromEnvironment", "args": ["--foo"]})
    defaults = lsp_server._get_global_defaults()
    assert defaults["importStrategy"] == "fromEnvironment"
    assert defaults["args"] == ["--foo"]


# ---------------------------------------------------------------------------
# _update_workspace_settings / _get_settings_by_path / _get_document_key /
# _get_settings_by_document
# ---------------------------------------------------------------------------


def test_update_workspace_settings_with_no_settings_uses_cwd():
    lsp_server._update_workspace_settings(None)
    key = os.getcwd()
    assert key in lsp_server.WORKSPACE_SETTINGS
    assert lsp_server.WORKSPACE_SETTINGS[key]["workspaceFS"] == key


def _fs_path(path) -> str:
    """Round-trips a path through a file URI, the same normalization real
    document/workspace paths go through (e.g. lower-cased drive letter on
    Windows), so keys built here match what lsp_server actually stores."""
    return uris.to_fs_path(uris.from_fs_path(os.fspath(path)))


def test_update_workspace_settings_keys_by_workspace_fs_path(tmp_path):
    workspace_uri = uris.from_fs_path(os.fspath(tmp_path))
    lsp_server._update_workspace_settings(
        [{"workspace": workspace_uri, "cwd": os.fspath(tmp_path)}]
    )
    key = _fs_path(tmp_path)
    assert key in lsp_server.WORKSPACE_SETTINGS
    assert lsp_server.WORKSPACE_SETTINGS[key]["workspaceFS"] == key


def test_get_settings_by_path_walks_up_to_nearest_workspace(tmp_path):
    workspace_uri = uris.from_fs_path(os.fspath(tmp_path))
    lsp_server._update_workspace_settings([{"workspace": workspace_uri, "cwd": "${workspaceFolder}"}])

    nested_file = pathlib.Path(_fs_path(tmp_path)) / "src" / "pkg" / "mod.py"
    settings = lsp_server._get_settings_by_path(nested_file)
    assert settings["workspaceFS"] == _fs_path(tmp_path)


def test_get_document_key_returns_none_when_no_workspace_matches(tmp_path):
    workspace_uri = uris.from_fs_path(os.fspath(tmp_path / "other-workspace"))
    lsp_server._update_workspace_settings([{"workspace": workspace_uri, "cwd": "${workspaceFolder}"}])

    document = types.SimpleNamespace(path=_fs_path(tmp_path / "unrelated" / "foo.py"))
    assert lsp_server._get_document_key(document) is None


def test_get_document_key_finds_containing_workspace(tmp_path):
    workspace_uri = uris.from_fs_path(os.fspath(tmp_path))
    lsp_server._update_workspace_settings([{"workspace": workspace_uri, "cwd": "${workspaceFolder}"}])

    document = types.SimpleNamespace(path=_fs_path(tmp_path / "src" / "foo.py"))
    assert lsp_server._get_document_key(document) == _fs_path(tmp_path)


def test_get_settings_by_document_none_returns_first_workspace_settings(tmp_path):
    workspace_uri = uris.from_fs_path(os.fspath(tmp_path))
    lsp_server._update_workspace_settings([{"workspace": workspace_uri, "cwd": "${workspaceFolder}"}])

    settings = lsp_server._get_settings_by_document(None)
    assert settings["workspaceFS"] == _fs_path(tmp_path)


def test_get_settings_by_document_outside_any_workspace_synthesizes_settings(tmp_path):
    workspace_uri = uris.from_fs_path(os.fspath(tmp_path / "workspace"))
    lsp_server._update_workspace_settings([{"workspace": workspace_uri, "cwd": "${workspaceFolder}"}])

    outside_file = pathlib.Path(_fs_path(tmp_path)) / "elsewhere" / "foo.py"
    document = types.SimpleNamespace(path=os.fspath(outside_file))
    settings = lsp_server._get_settings_by_document(document)
    assert settings["workspaceFS"] == os.fspath(outside_file.parent)
