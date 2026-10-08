"""Tests for running tools over the language server's JSON-RPC subprocess."""

import lsp_jsonrpc


class _FakeJsonRpc:
    def __init__(self):
        self.sent_data = None

    def send_data(self, data):
        self.sent_data = data

    def receive_data(self):
        return {"id": self.sent_data["id"], "result": ""}


def test_run_over_json_rpc_forwards_empty_source(monkeypatch):
    """An empty document must still be forwarded when stdin is enabled."""
    rpc = _FakeJsonRpc()
    monkeypatch.setattr(
        lsp_jsonrpc,
        "get_or_start_json_rpc",
        lambda _workspace, _interpreter, _cwd: rpc,
    )

    lsp_jsonrpc.run_over_json_rpc(
        workspace="workspace",
        interpreter=["python"],
        module="python_ta",
        argv=["python_ta", "--stdin"],
        use_stdin=True,
        cwd="workspace",
        source="",
    )

    assert rpc.sent_data["source"] == ""
