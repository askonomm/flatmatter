from typing import Any


class Function:
    name: str
    
    def compute(self, *args: List[str | int | float | bool | Any]) -> Any:
        raise NotImplementedError("Subclasses must extend this class.")
