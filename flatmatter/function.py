from abc import ABC, abstractmethod
from typing import Any


class Function(ABC):
    name: str

    def __init__(self):
        pass

    @abstractmethod
    def compute(self, args: list[Any]) -> Any:
        pass


def fn(name: str):
    def wrapper(cls: type[Function]):
        cls.name = name

        return cls

    return wrapper
