"""
Test for linting over LSP.
"""

from threading import Event

from hamcrest import assert_that, is_

from .lsp_test_client import constants, defaults, session, utils

TEST_FILE_PATH = constants.TEST_DATA / "sample1" / "sample.py"
TEST_FILE_URI = utils.as_uri(str(TEST_FILE_PATH))
TIMEOUT = 10  # 10 seconds


def test_linting_example():
    """Test to linting on file open."""
    contents = TEST_FILE_PATH.read_text()

    actual = []
    with session.LspSession() as ls_session:
        ls_session.initialize(defaults.VSCODE_DEFAULT_INITIALIZE)

        done = Event()

        def _handler(params):
            nonlocal actual
            actual = params
            done.set()

        ls_session.set_notification_callback(session.PUBLISH_DIAGNOSTICS, _handler)

        ls_session.notify_did_open(
            {
                "textDocument": {
                    "uri": TEST_FILE_URI,
                    "languageId": "python",
                    "version": 1,
                    "text": contents,
                }
            }
        )

        # wait for some time to receive all notifications
        done.wait(TIMEOUT)

        # Note: Diagnostics come from python-ta's `pyta-lsp` JSON output, so
        # `source` is "python-ta" rather than the extension/server display name.
        expected = {
            "uri": TEST_FILE_URI,
            "diagnostics": [
                {
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 2, "character": 8},
                    },
                    "message": "Missing module docstring",
                    "severity": 3,
                    "code": "C0114",
                    "source": "python-ta",
                },
                {
                    "range": {
                        "start": {"line": 2, "character": 0},
                        "end": {"line": 2, "character": 8},
                    },
                    "message": "Forbidden top-level code found on line 3",
                    "severity": 1,
                    "code": "E9992",
                    "source": "python-ta",
                },
                {
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 0, "character": 10},
                    },
                    "message": "You may not import module sys.",
                    "severity": 1,
                    "code": "E9999",
                    "source": "python-ta",
                },
                {
                    "range": {
                        "start": {"line": 2, "character": 0},
                        "end": {"line": 2, "character": 8},
                    },
                    "message": "Used input/output function print",
                    "severity": 1,
                    "code": "E9998",
                    "source": "python-ta",
                },
                {
                    "range": {
                        "start": {"line": 2, "character": 6},
                        "end": {"line": 2, "character": 7},
                    },
                    "message": "Undefined variable 'x'",
                    "severity": 1,
                    "code": "E0602",
                    "source": "python-ta",
                },
                {
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 0, "character": 10},
                    },
                    "message": "The import import sys is unused, and so can be removed.",
                    "severity": 2,
                    "code": "W0611",
                    "source": "python-ta",
                },
            ],
        }

    assert_that(actual, is_(expected))


def test_linting_clears_on_close():
    """Diagnostics are cleared (empty list) when a linted file is closed."""
    contents = TEST_FILE_PATH.read_text()

    actual = []
    with session.LspSession() as ls_session:
        ls_session.initialize(defaults.VSCODE_DEFAULT_INITIALIZE)

        opened = Event()
        closed = Event()

        def _handler(params):
            nonlocal actual
            actual = params
            if params.get("diagnostics") == []:
                closed.set()
            else:
                opened.set()

        ls_session.set_notification_callback(session.PUBLISH_DIAGNOSTICS, _handler)

        ls_session.notify_did_open(
            {
                "textDocument": {
                    "uri": TEST_FILE_URI,
                    "languageId": "python",
                    "version": 1,
                    "text": contents,
                }
            }
        )
        opened.wait(TIMEOUT)

        ls_session.notify_did_close(
            {"textDocument": {"uri": TEST_FILE_URI}}
        )
        closed.wait(TIMEOUT)

    assert_that(actual, is_({"uri": TEST_FILE_URI, "diagnostics": []}))
