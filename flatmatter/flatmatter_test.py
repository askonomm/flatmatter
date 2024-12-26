from typing import Any
from . import FlatMatter, Function, fn


def test_str_datatype():
    fm = FlatMatter('test: "string"')

    assert fm.to_dict() == {"test": "string"}


def test_long_str_datatype():
    fm = FlatMatter('test: "long string goes here!"')

    assert fm.to_dict() == {"test": "long string goes here!"}


def test_special_chars_str_datatype():
    fm = FlatMatter('test: "/ \\ ?!, _*@#$%^&"')

    assert fm.to_dict() == {"test": "/ \\ ?!, _*@#$%^&"}


def test_int_datatype():
    fm = FlatMatter("test: 12345")

    assert fm.to_dict() == {"test": 12345}


def test_float_datatype():
    fm = FlatMatter("test: 123.45")

    assert fm.to_dict() == {"test": 123.45}


def test_bool_true_datatype():
    fm = FlatMatter("test: true")

    assert fm.to_dict() == {"test": True}


def test_bool_false_datatype():
    fm = FlatMatter("test: false")

    assert fm.to_dict() == {"test": False}


def test_function_reference_value():
    class FunctionReference1(Function):
        name = 'function-reference1'

        def compute(self, args: list[Any]) -> Any:
            return "hello"

    fm = FlatMatter("test: function-reference1", [FunctionReference1])

    assert fm.to_dict() == {"test": "hello"}


def test_function_call_value():
    class FunctionCall1(Function):
        name = 'function-call1'

        def compute(self, args: list[Any]) -> Any:
            return args[0]

    fm = FlatMatter('test: (function-call1 "hello")', [FunctionCall1])

    assert fm.to_dict() == {"test": "hello"}


def test_piped_value():
    class FunctionReference2(Function):
        name = 'function-reference2'

        def compute(self, args: list[Any]) -> Any:
            return f"hello {args[0]}"

    fm = FlatMatter('test: "testing pipes" / function-reference2', [FunctionReference2])

    assert fm.to_dict() == {"test": "hello testing pipes"}


def test_piped_value_with_function_call():
    class FunctionCall2(Function):
        name = 'function-call2'

        def compute(self, args: list[Any]) -> Any:
            return f"{args[0]} {args[1]}"

    fm = FlatMatter('test: "testing pipes" / (function-call2 12345)', [FunctionCall2])

    assert fm.to_dict() == {"test": "testing pipes 12345"}


def test_longer_piped_value():
    class FunctionReference3(Function):
        name = 'function-reference3'

        def compute(self, args: list[Any]) -> Any:
            return f"hello {args[0]}"

    class FunctionCall3(Function):
        name = 'function-call3'

        def compute(self, args: list[Any]) -> Any:
            return f"{args[0]} {args[1]}"

    fm = FlatMatter('test: "testing" / (function-call3 12345) / function-reference3', [
        FunctionCall3,
        FunctionReference3
    ])

    assert fm.to_dict() == {"test": "hello testing 12345"}


def test_longer_piped_value_with_no_default_value():
    class FunctionReference4(Function):
        name = 'function-reference4'

        def compute(self, args: list[Any]) -> Any:
            return f"hello {args[0]}"

    class FunctionCall4(Function):
        name = 'function-call4'

        def compute(self, args: list[Any]) -> Any:
            return f"{args[0]}"

    fm = FlatMatter('test: (function-call4 12345) / function-reference4', [
        FunctionCall4,
        FunctionReference4
    ])

    assert fm.to_dict() == {"test": "hello 12345"}


def test_invalid_value():
    fm = FlatMatter("test: invalid value")

    assert fm.to_dict() == {}


def test_invalid_and_valid_value():
    fm = FlatMatter("test: invalid value\ntest2: 12345")

    assert fm.to_dict() == {"test2": 12345}


def test_nested_key():
    fm = FlatMatter("test.nested.key: true")

    assert fm.to_dict() == {'test': {'nested': {'key': True}}}
