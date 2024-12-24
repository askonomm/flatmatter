from flatmatter import Function


def function_name(cls: Function, name: str):
    cls.name = name

    return cls
