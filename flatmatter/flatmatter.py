import inspect
import re
from typing import Any, Callable, Dict, Optional
from .function import Function
from .parsed_value import ParsedValue
from .compute_action import ComputeAction
from .conformance_result import ConformanceResult


class FlatMatter:
    __parsed_config: Dict[str, Any] = {}
    __function_instances: Dict[str, Function] = {}
    __content: str = ""

    def __init__(self, content: str, functions: list[type[Function]] = None):
        self.__parsed_config = {}
        self.__content = content
        self.__function_instances = {}

        if functions:
            for function in functions:
                instance = function()
                self.__function_instances[instance.name] = instance

    def __parse(self):
        for line in self.__content.splitlines():
            self.__parse_line(line)

    def __parse_line(self, line: str):
        """
        Parses a given line of FlatMatter.
        """
        self.__validate_line_conformance(line)

        keys = line.split(":")[0].strip().split(".")
        value = ":".join(line.split(":")[1:]).strip()
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

    def __validate_line_conformance(self, line: str):
        """
        Validates line conformance with a variety of checks. If any
        fails, raises a SyntaxError.
        """
        checks: list[Callable] = [
            self.__validate_line_has_key_val,
            self.__validate_line_has_only_one_colon_char,
        ]

        for check in checks:
            result = check(line)

            if not result.passed:
                raise SyntaxError(
                    f"\n\nFlatMatter error: {result.error.lstrip()}\n---\nLine: {line}\n\n"
                )

    @staticmethod
    def __validate_line_has_key_val(line: str) -> ConformanceResult:
        """
        Validates that the line has clear key and value separation.
        """
        if line.find(":") == -1:
            return ConformanceResult(
                passed=False, error="There is no separation between key or value."
            )

        return ConformanceResult(passed=True)

    @staticmethod
    def __validate_line_has_only_one_colon_char(line: str) -> ConformanceResult:
        """
        Validates that the line has only one top-level `:` character. Top-level
        as in `:` is only allowed inside a value that is a string, or a string
        argument to a function.
        """
        char_count = 0

        for idx, char in enumerate(line):
            if char == ":" and line[0:idx].count('"') % 2 == 0:
                char_count += 1

        if char_count > 1:
            return ConformanceResult(
                passed=False,
                error=inspect.cleandoc(
                    """
                    A line can only contain one `:` character outside of a
                    string or a string function argument.
                    """
                ),
            )

        return ConformanceResult(passed=True)

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
        is_fn_reference = re.match(r"^([a-zA-Z0-9_-]+)$", value) is not None

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

            if not is_simple_value and not is_function_value:
                return False

        return True

    def __parse_value(self, value: str) -> Optional[ParsedValue]:
        """
        Parses the value part of a line.
        """
        if self.__is_simple_value(value):
            return ParsedValue(value=self.__parse_simple_value(value), compute_actions=[])

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
        Parses the value part of a line into a simple value, like for example
        a string, an int, float or bool.
        """
        if all([x in "1234567890" for x in value.lstrip("-")]):
            return int(value)

        if all([x in "1234567890." for x in value.lstrip("-")]):
            return float(value)

        if value == "true" or value == "false":
            return True if value == "true" else False

        return value[1:-1]

    def __parse_function_value(self, value: str) -> ComputeAction:
        """
        Parses the value part of a line into a Compute Action, which is
        later executed to run the function described in FlatMatter.
        """
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
        """
        Parses the value part of a line into a ParsedValue, which is
        composed out of piped parts separated by the forward slash `/` character.

        The ParsedValue will include the default value, if any, and a list of compute
        actions which will later be executed.
        """
        parts = self.__compose_piped_value_parts(value)

        if self.__is_simple_value(parts[0]):
            return ParsedValue(
                value=self.__parse_simple_value(parts[0]),
                compute_actions=[self.__parse_function_value(x) for x in parts[1:]],
            )

        return ParsedValue(
            value=None, compute_actions=[self.__parse_function_value(x) for x in parts]
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
        """
        Takes ParsedValue and, optionally an initial value, and runs
        compute actions over it to return the final computed value.
        """
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
        """
        For a given `name` attempts to find a corresponding Function,
        and will return an instance of it if it does.
        """
        return self.__function_instances.get(name)

    def to_dict(self) -> Dict[str, Any]:
        """
        Return the parsed config data as a dictionary.
        """
        self.__parse()

        return self.__parsed_config


def fm(content: str, functions: list[type[Function]] = None) -> Dict[str, Any]:
    """
    Shorthand function that does the equivalent of `FlatMatter(...).to_dict()`.
    """
    return FlatMatter(content, functions).to_dict()
