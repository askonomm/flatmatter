from . import FlatMatter


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
