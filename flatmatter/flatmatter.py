from typing import Any, Dict, Optional
from .function  import Function
from .parsed_value import ParsedValue
from .compute_action import ComputeAction

class FlatMatter:
    __parsed_config: Dict[str, Any] = {}
    __functions: list[Function] = []
    __content: str = ""

    def __init__(self, content: str, functions: list[Function] = []):
        self.__content = content
        self.__functions = functions

    def __parse(self):
        for line in self.__content.splitlines():
            self.__parse_line(line)

    def __parse_line(self, line: str):
        """
        Parses a given line of FlatMatter.
        """
        # todo: check line conformance
        keys = line.split(":")[0].strip().split(".")
        value = line.split(":")[1].strip()
        value_parsed = self.__parse_value(value)

        if not value_parsed:
            return

        value_computed = self.__compute_value(value_parsed)
        current = self.__parsed_config

        for idx, key in enumerate(keys):
            if idx == len(keys) - 1:
                current[key] = value_computed
            else:
                if key not in current:
                    current[key] = {}

                if isinstance(current[key], dict):
                    current = current[key]

    @staticmethod
    def __is_simple_value(value: str) -> bool:
        """
        Detects if the value is a simple value. A simple value is any
        of the following: `"a string"`, boolean `true` or `false`, or
        anything numeric like `12345` or `123.45`.
        """
        is_string = value.startswith('"') and value.endswith('"')
        is_bool = value == "true" or value == "false"
        is_number = all([x in "1234567890." for x in value.lstrip("-")])

        return is_string or is_bool or is_number

    @staticmethod
    def __is_function_value(value: str) -> bool:
        """
        Detects if the value is a function value. A function value is any
        of the following:

        - A function call with arguments: `(function-name *args)`
        - A function call by reference: `function-name`
        """
        is_fn = value.startswith("(") and value.endswith(")")
        is_fn_reference = value.isalnum()

        return is_fn or is_fn_reference

    def __is_piped_value(self, value: str) -> bool:
        """
        Detects if the value is a piped value. A piped value is a mix of
        simple and function value parts, piped together with the forward
        slash `/` character. For example:

        ```yaml
        posts: (get-content "posts") / (limit 10) / only-published
        ```

        or:

        ```yaml
        posts: "posts" / get-content / (limit 10) / only-published
        ```

        The result of the previous pipe gets passed to the next as a first
        argument.
        """
        for part in self.__compose_piped_value_parts(value):
            is_simple_value = self.__is_simple_value(part)
            is_function_value = self.__is_function_value(part)

            if not is_simple_value or is_function_value:
                return False

        return True

    def __parse_value(self, value: str) -> Optional[ParsedValue]:
        """
        """
        if self.__is_simple_value(value):
            return ParsedValue(
                value=self.__parse_simple_value(value),
                compute_actions=[]
            )

        if self.__is_function_value(value):
            return ParsedValue(
                value=None,
                compute_actions=[
                    self.__parse_function_value(value),
                ],
            )

        if self.__is_piped_value(value):
            return self.__parse_piped_value(value)

        return None

    @staticmethod
    def __parse_simple_value(value: str) -> str | int | float | bool:
        """

        """
        if all([x in "1234567890" for x in value.lstrip("-")]):
            return int(value)

        if all([x in "1234567890." for x in value.lstrip("-")]):
            return float(value)

        if value == "true" or value == "false":
            return True if value == "true" else False

        return value[1:-1]

    def __parse_function_value(self, value: str) -> ComputeAction:
        """"""
        is_fn = value.startswith("(") and value.endswith(")")

        if not is_fn:
            return ComputeAction(identifier=value, args=[])

        fn_name = value[1:-1].split(" ")[0].strip()
        fn_args = self.__parse_function_value_args(value)

        return ComputeAction(
            identifier=fn_name,
            args=fn_args,
        )

    def __parse_piped_value(self, value: str) -> ParsedValue:
        """"""
        parts = self.__compose_piped_value_parts(value)

        if self.__is_simple_value(parts[0]):
            return ParsedValue(
                value=self.__parse_simple_value(parts[0]),
                compute_actions=[self.__parse_function_value(x) for x in parts[1:]],
            )

        return ParsedValue(
            value=None,
            compute_actions=[self.__parse_function_value(x) for x in parts]
        )

    def __parse_function_value_args(self, value: str) -> list[Any]:
        """
        Takes the entire value part of a line and, assuming it is a function value,
        parses it into a list of arguments to be passed down to the function.

        """
        parts = value[1:-1].split(" ")[1:]

        if len(parts) == 0:
            return []

        normalized_parts = [parts[0]]

        for idx, part in enumerate(parts[1:], start=1):
            until_current = " ".join(parts[1:idx])
            quote_count = until_current.count('"')

            if quote_count % 2 == 0:
                normalized_parts.append(part.strip())
                continue

            last_normalized_part = normalized_parts[-1]
            normalized_parts[-1] = f"{last_normalized_part} {parts[idx]}"

        args: list[str | int | float | bool] = []

        for part in normalized_parts:
            args.append(self.__parse_simple_value(part))

        return args

    @staticmethod
    def __compose_piped_value_parts(value: str) -> list[str]:
        """
        Takes an entire value of a line and composes it into a list
        of piped parts.
        """
        parts = value.split(" / ")

        if len(parts) == 0:
            return []

        normalized_parts = [parts[0]]

        for idx, part in enumerate(parts[1:], start=1):
            until_current = " / ".join(parts[1:idx])
            quote_count = until_current.count('"')

            if quote_count % 2 == 0:
                normalized_parts.append(part.strip())
                continue

            last_normalized_part = normalized_parts[-1]
            normalized_parts[-1] = f"{last_normalized_part} / {parts[idx]}"

        return normalized_parts

    def __compute_value(self, parsed_value: ParsedValue) -> Any:
        """"""
        value = parsed_value.value

        for compute_action in parsed_value.compute_actions:
            fn_instance = self.__find_function_instance(compute_action.identifier)

            if not fn_instance:
                continue

            if value is not None:
                compute_action.args = [value] + compute_action.args

            value = fn_instance.compute(compute_action.args)

        return value

    def __find_function_instance(self, name: str) -> Optional[Function]:
        """"""
        for fn in self.__functions:
            if fn.name is name:
                return fn

        return None

    def to_dict(self):
        self.__parse()

        return self.__parsed_config

def fm(content: str, functions: list[Function] = []) -> Dict[str, Any]:
    return FlatMatter(content, functions).to_dict()
