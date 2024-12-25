from typing import Any


class Function:
    name: str
    
    def compute(self, *args: list[Any]) -> Any:
        raise NotImplementedError("Subclasses must extend this class.")
