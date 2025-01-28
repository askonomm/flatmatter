import { EOL } from "node:os";
import { trimChar } from "./utils.ts";

export type ParsedValue = {
  value: unknown;
  computeActions: ComputeAction[];
};

export type ComputeAction = {
  identifier: string;
  args: Array<unknown>;
};

export interface Serializer<T> {
  serialize(config: Record<string, unknown>): T;
}

export interface FlatMatterFn {
  name: string;

  compute(...args: unknown[]): unknown;
}

export default class FlatMatter {
  private content: string;
  private parsedConfig: Record<string, unknown> = {};
  private functions: FlatMatterFn[];

  constructor(content: string, functions: FlatMatterFn[] = []) {
    this.content = content;
    this.functions = functions;
    this.parse();
  }

  private parse(): void {
    const lines = this.content.split(EOL);
    let frontMatterBreakCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---" && frontMatterBreakCount < 2) {
        frontMatterBreakCount++;
        continue;
      }

      // FlatMatter ends, Markdown begins
      if (frontMatterBreakCount < 2) {
        this.parseLine(i, lines[i]);
        continue;
      }

      this.parsedConfig.content = lines.slice(i).join(EOL).trim();
      break;
    }
  }

  /**
   * Parses a given line of FlatMatter.
   */
  private parseLine(idx: number, line: string): void {
    this.validateLineConformance(idx, line);

    const keys = line.split(":")[0].trim().split(".");
    const value = line.split(":").slice(1).join(":").trim();
    const parsedValue = this.parseValue(value);

    if (!parsedValue) return;

    const config = keys.reduceRight((acc, key) => {
      return { [key]: acc };
    }, this.computeValue(parsedValue)) as Record<string, unknown>;

    this.parsedConfig = { ...this.parsedConfig, ...config };
  }

  /**
   * For better developer experience, this validates each line
   * against some common mistakes you can make, and throws an Error
   * if you did.
   */
  private validateLineConformance(idx: number, line: string): void {
    const validators = [
      this.validateLineHasKeyVal,
      this.validateLineHasOnlyOneColonChar,
    ];

    for (const validator of validators) {
      validator(idx, line);
    }
  }

  /**
   * Validates that the given line has a value separator.
   */
  private validateLineHasKeyVal(idx: number, line: string): void {
    if (!line.includes(":")) {
      throw new Error(`Line on index ${idx} doesn't have a value separator.`);
    }
  }

  /**
   * Validates that the given line has only one value separator.
   */
  private validateLineHasOnlyOneColonChar(idx: number, line: string): void {
    let separatorCount = 0;
    let parts = line.split(":").slice(1);

    for (let i = 0; i < parts.length; i++) {
      const partsUntilCurrent = parts.slice(0, i).join(":");
      const quoteCount = partsUntilCurrent.split('"').length - 1;

      if (quoteCount % 2 === 0) {
        separatorCount++;
      }
    }

    if (separatorCount > 1) {
      throw new Error(`Line on index ${idx} has multiple value separators.`);
    }
  }

  /**
   * Detects if the value is a simple value. A simple value is any
   * of the following: `"a string"`, boolean `true` or `false`, or
   * anything numeric like `12345` or `123.45`.
   */
  private isSimpleValue(value: string): boolean {
    const isString = value.startsWith('"') && value.endsWith('"');
    const isBoolean = value === "true" || value === "false";
    const isNumber = !isNaN(parseFloat(value));

    return isString || isBoolean || isNumber;
  }

  /**
   * Detects if the value is a function value. A function value is any
   * of the following:
   *
   * - A function call with arguments: `(function-name *args)`
   * - A function call by reference: `function-name`
   */
  private isFunctionValue(value: string): boolean {
    const isFnCall = value.startsWith("(") && value.endsWith(")");
    const isFnReference = !!value.match(/^([a-zA-Z0-9_-]+)$/);

    return isFnCall || isFnReference;
  }

  /**
   * Detects if the value is a piped value. A piped value is a mix of
   * simple and function value parts, piped together with the forward
   * slash `/` character. For example:
   *
   * ```yaml
   * posts: (get-content "posts") / (limit 10) / only-published
   * ```
   *
   * or:
   *
   *  ```yaml
   * posts: "posts" / get-content / (limit 10) / only-published
   * ```
   *
   * The result of the previous pipe gets passed to the next as a first
   * argument.
   */
  private isPipedValue(value: string): boolean {
    return this.composePipedValueParts(value).every((part) => {
      return this.isSimpleValue(part) || this.isFunctionValue(part);
    });
  }

  /**
   * Parses a value to a `ParsedValue` object, or `null`
   * in case it could not for whatever reason.
   */
  private parseValue(value: string): ParsedValue | null {
    if (this.isSimpleValue(value)) {
      return {
        value: this.parseSimpleValue(value),
        computeActions: [],
      };
    }

    if (this.isFunctionValue(value)) {
      return {
        value: null,
        computeActions: [this.parseFunctionValue(value)],
      };
    }

    if (this.isPipedValue(value)) {
      return this.parsePipedValue(value);
    }

    return null;
  }

  /**
   * Parses the value part of a line into a simple value, like for example
   * a `string`, `number` or `boolean`.
   */
  private parseSimpleValue(value: string): string | number | boolean {
    if (value === "true" || value === "false") {
      return value === "true";
    }

    if (!Number.isNaN(parseInt(value)) && value.indexOf(".") === -1) {
      return parseInt(value);
    }

    if (!Number.isNaN(parseFloat(value)) && value.indexOf(".") !== -1) {
      return parseFloat(value);
    }

    return trimChar(value, '"');
  }

  /**
   * Parses the value part of a line into a Compute Action, which is
   * later executed to run the function described in FlatMatter.
   */
  private parseFunctionValue(value: string): ComputeAction {
    const isFn = value.startsWith("(") && value.endsWith(")");

    if (!isFn) {
      return {
        identifier: value,
        args: [],
      };
    }

    const fnName = trimChar(value, ["(", ")"]).split(" ")[0].trim();
    const fnArgs = this.parseFunctionValueArgs(value);

    return {
      identifier: fnName,
      args: fnArgs,
    };
  }

  /**
   * Parses the value part of a line into a ParsedValue, which is
   * composed out of piped parts separated by the forward slash `/` character.
   *
   * The ParsedValue will include the default value, if any, and a list of compute
   * actions which will later be executed.
   */
  private parsePipedValue(value: string): ParsedValue {
    const parts = this.composePipedValueParts(value);

    if (this.isSimpleValue(parts[0])) {
      return {
        value: this.parseSimpleValue(parts[0]),
        computeActions: parts.slice(1).map((p) => this.parseFunctionValue(p)),
      };
    }

    return {
      value: null,
      computeActions: parts.map((p) => this.parseFunctionValue(p)),
    };
  }

  /**
   * Takes the entire value part of a line and, assuming it is a function value,
   * parses it into a list of arguments to be passed down to the function.
   */
  private parseFunctionValueArgs(value: string): unknown[] {
    const parts = value
      .substring(1, value.length - 1)
      .split(" ")
      .slice(1);

    if (!parts.length) {
      return [];
    }

    const normalizedParts = [parts[0]];

    for (let i = 1; i < parts.length; i++) {
      const untilCurrent = normalizedParts.join(" ");
      const quoteCount = untilCurrent.split('"').length - 1;

      if (quoteCount % 2 === 0) {
        normalizedParts.push(parts[i]);
        continue;
      }

      const lastIndex = normalizedParts.length - 1;
      const lastPart = normalizedParts[lastIndex];

      normalizedParts[lastIndex] = `${lastPart} ${parts[i]}`;
    }

    return normalizedParts.map((part) => this.parseSimpleValue(part));
  }

  /**
   * Takes an entire value of a line and composes it into a list
   * of piped parts.
   */
  private composePipedValueParts(value: string): string[] {
    const parts = value.split(" / ");
    const normalizedParts = [parts[0]];

    for (let i = 1; i < parts.length; i++) {
      const untilCurrent = normalizedParts.join(" / ");
      const quoteCount = untilCurrent.split('"').length - 1;

      if (quoteCount % 2 === 0) {
        normalizedParts.push(parts[i]);
        continue;
      }

      const lastIndex = normalizedParts.length - 1;
      const lastPart = normalizedParts[lastIndex];

      normalizedParts[lastIndex] = `${lastPart} / ${parts[i]}`;
    }

    return normalizedParts;
  }

  /**
   * Takes ParsedValue and, optionally an initial value, and runs
   * compute actions over it to return the final computed value.
   */
  private computeValue(parsedValue: ParsedValue): unknown {
    let value = parsedValue.value;

    for (const ca of parsedValue.computeActions) {
      const fnInstance = this.functions.find((f) => f.name === ca.identifier);

      if (!fnInstance) {
        continue;
      }

      if (value !== null) {
        ca.args = [value, ...ca.args];
      }

      value = fnInstance.compute(...ca.args);
    }

    return value;
  }

  /**
   * Takes a Serializer and uses it to transform internal data
   * object to a desired output.
   */
  public serialize<T>(serializer: Serializer<T>): T {
    return serializer.serialize(this.parsedConfig);
  }
}
