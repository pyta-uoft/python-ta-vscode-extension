"""Unit tests for the pure helper functions in bundled/tool/lsp_utils.py."""

import os
import sys

import lsp_utils


def test_as_list_wraps_single_value():
    assert lsp_utils.as_list("a") == ["a"]


def test_as_list_wraps_non_sequence_object():
    obj = object()
    assert lsp_utils.as_list(obj) == [obj]


def test_as_list_passes_through_list():
    original = ["a", "b"]
    assert lsp_utils.as_list(original) is original


def test_as_list_passes_through_tuple():
    original = ("a", "b")
    assert lsp_utils.as_list(original) is original


def test_is_same_path_true_for_equivalent_paths(tmp_path):
    p1 = str(tmp_path / "foo" / ".." / "bar.py")
    p2 = str(tmp_path / "bar.py")
    assert lsp_utils.is_same_path(p1, p2)


def test_is_same_path_false_for_different_paths(tmp_path):
    p1 = str(tmp_path / "foo.py")
    p2 = str(tmp_path / "bar.py")
    assert not lsp_utils.is_same_path(p1, p2)


def test_is_same_path_case_insensitive_on_windows(tmp_path):
    p1 = str(tmp_path / "Foo.py")
    p2 = str(tmp_path / "foo.py")
    if os.name == "nt":
        assert lsp_utils.is_same_path(p1, p2)
    else:
        assert not lsp_utils.is_same_path(p1, p2)


def test_is_current_interpreter_true_for_sys_executable():
    assert lsp_utils.is_current_interpreter(sys.executable)


def test_is_current_interpreter_false_for_other_path():
    assert not lsp_utils.is_current_interpreter("/definitely/not/python")


def test_is_stdlib_file_true_for_installed_site_package():
    # Despite the name, is_stdlib_file() checks site-packages directories
    # (site.getsitepackages() / getusersitepackages()), not the interpreter's
    # standard library directory, so a real stdlib module like os.py returns
    # False here -- see test_is_stdlib_file_false_for_stdlib_module below.
    import pytest as _pytest

    assert lsp_utils.is_stdlib_file(_pytest.__file__)


def test_is_stdlib_file_false_for_stdlib_module():
    assert not lsp_utils.is_stdlib_file(os.__file__)


def test_is_stdlib_file_false_for_project_file():
    assert not lsp_utils.is_stdlib_file(os.fspath(lsp_utils.__file__))


def test_run_result_holds_stdout_and_stderr():
    result = lsp_utils.RunResult("out", "err")
    assert result.stdout == "out"
    assert result.stderr == "err"


def test_custom_io_round_trips_written_content():
    stream = lsp_utils.CustomIO("<stdout>", encoding="utf-8")
    stream.write("hello")
    assert stream.get_value() == "hello"
    # close() is intentionally a no-op so the buffer stays readable.
    stream.close()
    assert stream.get_value() == "hello"


def test_substitute_attr_restores_original_value_after_context():
    class Obj:
        attr = "original"

    obj = Obj()
    with lsp_utils.substitute_attr(obj, "attr", "temporary"):
        assert obj.attr == "temporary"
    assert obj.attr == "original"


def test_substitute_attr_restores_on_exception():
    class Obj:
        attr = "original"

    obj = Obj()
    try:
        with lsp_utils.substitute_attr(obj, "attr", "temporary"):
            raise ValueError("boom")
    except ValueError:
        pass
    assert obj.attr == "original"


def test_redirect_io_swaps_and_restores_stream():
    original_stdout = sys.stdout
    replacement = lsp_utils.CustomIO("<stdout>", encoding="utf-8")
    with lsp_utils.redirect_io("stdout", replacement):
        assert sys.stdout is replacement
    assert sys.stdout is original_stdout
