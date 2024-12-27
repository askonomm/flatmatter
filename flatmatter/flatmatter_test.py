from typing import Any
import pytest

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
    class FunctionReference(Function):
        name = 'function-reference'

        def compute(self, args: list[Any]) -> Any:
            return "hello"

    fm = FlatMatter("test: function-reference", [FunctionReference])

    assert fm.to_dict() == {"test": "hello"}


def test_function_call_value():
    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return args[0]

    fm = FlatMatter('test: (function-call "hello")', [FunctionCall])

    assert fm.to_dict() == {"test": "hello"}


def test_function_no_exist():
    fm = FlatMatter('test: (function-call "hello")', [])

    assert fm.to_dict() == {"test": None}


def test_function_no_exist_in_piped_value():
    fm = FlatMatter('test: 12345 / (function-call "hello")', [])

    assert fm.to_dict() == {"test": 12345}


def test_piped_value():
    class FunctionReference(Function):
        name = 'function-reference'

        def compute(self, args: list[Any]) -> Any:
            return f"hello {args[0]}"

    fm = FlatMatter('test: "testing pipes" / function-reference', [FunctionReference])

    assert fm.to_dict() == {"test": "hello testing pipes"}


def test_piped_value_with_function_call():
    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return f"{args[0]} {args[1]}"

    fm = FlatMatter('test: "testing pipes" / (function-call 12345)', [FunctionCall])

    assert fm.to_dict() == {"test": "testing pipes 12345"}


def test_longer_piped_value():
    class FunctionReference(Function):
        name = 'function-reference'

        def compute(self, args: list[Any]) -> Any:
            return f"hello {args[0]}"

    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return f"{args[0]} {args[1]}"

    fm = FlatMatter('test: "testing" / (function-call 12345) / function-reference', [
        FunctionCall,
        FunctionReference
    ])

    assert fm.to_dict() == {"test": "hello testing 12345"}


def test_longer_piped_value_with_no_default_value():
    class FunctionReference(Function):
        name = 'function-reference'

        def compute(self, args: list[Any]) -> Any:
            return f"hello {args[0]}"

    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return f"{args[0]}"

    fm = FlatMatter('test: (function-call 12345) / function-reference', [
        FunctionCall,
        FunctionReference
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


def test_line_has_key_val():
    with pytest.raises(SyntaxError):
        FlatMatter("test").to_dict()


def test_line_has_only_one_colon_char():
    with pytest.raises(SyntaxError):
        FlatMatter("test: test: test").to_dict()


def test_function_value_args():
    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return args

    fm = FlatMatter("test: (function-call 12345 \"some string\" true false)", [
        FunctionCall
    ])

    assert fm.to_dict() == {"test": [12345, 'some string', True, False]}


def test_function_value_no_args():
    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return args

    fm = FlatMatter("test: (function-call)", [
        FunctionCall
    ])

    assert fm.to_dict() == {"test": []}


def test_forward_slash_in_strings():
    class FunctionCall(Function):
        name = 'function-call'

        def compute(self, args: list[Any]) -> Any:
            return args

    fm = FlatMatter("test: \"test / something\" / (function-call 12345 \"some / string\")", [
        FunctionCall
    ])

    assert fm.to_dict() == {"test":  ['test / something', 12345, 'some / string']}


def test_function_decoration():
    @fn("function-call")
    class FunctionCall(Function):
        def compute(self, args: list[Any]) -> Any:
            return args

    fm = FlatMatter("test: (function-call)", [FunctionCall])

    assert fm.to_dict() == {"test": []}