import { trimChar } from "./utils.ts";

export type Matter = {
  [key: string]: Matter | unknown;
};

export type ConformanceResult = {
  passed: boolean;
  error?: string;
};

export type ParsedValue = {
  value: unknown;
  computeActions: ComputeAction[];
};

export type ComputeAction = {
  identifier: string;
  args: Array<unknown>;
};

export interface Serializer {
  serialize(parsedConfig: Matter): unknown;
}

export interface FlatMatterFn {
  name: string;

  compute(args: unknown[]): unknown;
}

export default class FlatMatter {
  private content: string;
  private parsedConfig: Matter = {};
  private functions: FlatMatterFn[];

  constructor(content: string, functions: FlatMatterFn[] = []) {
    this.content = content;
    this.functions = functions;
    this.parse();

    console.log("done");
  }

  private parse(): void {
    for (const line of this.content.split(/\r?\n/)) {
      this.parseLine(line);
    }
  }

  /**
   * Parses a given line of FlatMatter.
   *
   * @param {string} line
   * @returns {void}
   */
  private parseLine(line: string): void {
    this.validateLineConformance(line);

    const keys = line.split(":")[0].trim().split(".");
    const value = line.split(":").slice(1).join(":").trim();
    const parsedValue = this.parseValue(value);

    if (!parsedValue) return;

    const config = keys.reduceRight((acc, key) => {
      return { [key]: acc };
    }, this.computeValue(parsedValue)) as Matter;

    this.parsedConfig = { ...this.parsedConfig, ...config };
  }

  private validateLineConformance(line: string): void {}

  private validateLineHasKeyVal(line: string): ConformanceResult {
    return {
      passed: true,
    };
  }

  private validateLineHasOnlyOneColonChar(line: string): ConformanceResult {
    return {
      passed: true,
    };
  }

  /**
   * Detects if the value is a simple value. A simple value is any
   * of the following: `"a string"`, boolean `true` or `false`, or
   * anything numeric like `12345` or `123.45`.
   *
   * @param {string} value
   * @returns {boolean}
   */
  private isSimpleValue(value: string): boolean {
    const isString = value.startsWith('"') && value.endsWith('"');
    const isBoolean = value === "true" || value === "false";
    const isNumber = !Number.isNaN(value);

    return isString || isBoolean || isNumber;
  }

  /**
   * Detects if the value is a function value. A function value is any
   * of the following:
   *
   * - A function call with arguments: `(function-name *args)`
   * - A function call by reference: `function-name`
   *
   * @param {string} value
   * @returns {boolean}
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
   *
   * @param {string} value
   * @returns {boolean}
   */
  private isPipedValue(value: string): boolean {
    for (const part of this.composePipedValueParts(value)) {
      if (!this.isSimpleValue(part) && !this.isFunctionValue(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parses a value to a `ParsedValue` object, or `null`
   * in case it could not for whatever reason.
   *
   * @param {string} value
   * @returns {ParsedValue | null}
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
   *
   * @param {string} value
   * @returns {string | number | boolean}
   */
  private parseSimpleValue(value: string): string | number | boolean {
    if (value === "true" || value === "false") {
      return value === "true";
    }

    if (!Number.isNaN(parseFloat(value))) {
      return parseFloat(value);
    }

    if (!Number.isNaN(parseInt(value))) {
      return parseInt(value);
    }

    return trimChar(value, '"');
  }

  /**
   * Parses the value part of a line into a Compute Action, which is
   * later executed to run the function described in FlatMatter.
   *
   * @param {string} value
   * @returns {ComputeAction}
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
   *
   * @param {string} value
   * @returns {ParsedValue}
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
   *
   * @param {string} value
   * @returns {unknown[]}
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
   *
   * @param {string} value
   * @returns {string[]}
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
   *
   * @param {ParsedValue} parsedValue
   * @returns {unknown}
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

      value = fnInstance.compute(ca.args);
    }

    return value;
  }

  /**
   * Takes a Serializer and uses it to transform internal data
   * object to a desired output.
   *
   * @param {Serializer} serializer
   * @returns {unknown}
   */
  public serialize(serializer: Serializer): unknown {
    return serializer.serialize(this.parsedConfig);
  }
}
