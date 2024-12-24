from typing import Any


class Function:
    def compute(self, *args) -> Any:
        raise NotImplementedError("Subclasses must extend this class.")
