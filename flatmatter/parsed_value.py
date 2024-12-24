from typing import List
from flatmatter.compute_action import ComputeAction


class ParsedValue:
    def __init__(self, value: str|int|float|bool = None, compute_actions: List[ComputeAction] = None):
        self.value = value
        # todo validate compute fns
        self.compute_actions = compute_actions