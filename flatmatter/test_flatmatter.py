from . import FlatMatter


def test_str_datatype():
    fm = FlatMatter("test: \"string\"")
    assert fm.to_dict() == {"test": "string"}


def test_long_str_datatype():
    fm = FlatMatter("test: \"long string goes here!\"")
    assert fm.to_dict() == {"test": "long string goes here!"}

def test_special_chars_str_datatype():
    fm = FlatMatter("test: \"/ \\ ?!, _*@#$%^&\"")
    assert fm.to_dict() == {"test": "/ \\ ?!, _*@#$%^&"}