from abc import ABCMeta, abstractmethod
from typing import Any


class Function(ABCMeta):
    name: str

    @abstractmethod
    def compute(self, *args: list[Any]) -> Any:
        raise NotImplementedError("Subclasses must extend this class.")

def fn(name: str):
    def wrapper(cls: type[Function]):
        cls.name = name

        return cls

    return wrapper
 
