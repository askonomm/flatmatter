from typing import List
from typing_extensions import Any
from flatmatter.compute_action import ComputeAction


class ParsedValue:
    def __init__(self, value: str|int|float|bool|Any|None  = None, compute_actions: List[ComputeAction] = []):
        self.value = value
        # todo validate compute fns
        self.compute_actions = compute_actions
