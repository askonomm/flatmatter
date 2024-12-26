from abc import ABC, abstractmethod
from typing import Any


class Function(ABC):
    name: str

    def __init__(self):
        pass

    @abstractmethod
    def compute(self, args: list[Any]) -> Any:
        raise NotImplementedError("Subclasses must extend this class.")


def fn(name: str):
    def wrapper(cls: type[Function]):
        cls.name = name

        return cls

    return wrapper
