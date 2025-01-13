type Matter = {
    [key: string]: Matter | unknown;
};
interface Serializer {
    serialize(parsedConfig: Matter): unknown;
}
interface FlatMatterFn {
    name: string;
    compute(...args: unknown[]): unknown;
}
declare class FlatMatter {
    private content;
    private parsedConfig;
    private functions;
    constructor(content: string, functions?: FlatMatterFn[]);
    private parse;
    /**
     * Parses a given line of FlatMatter.
     *
     * @param {string} line
     * @returns {void}
     */
    private parseLine;
    private validateLineConformance;
    private validateLineHasKeyVal;
    private validateLineHasOnlyOneColonChar;
    /**
     * Detects if the value is a simple value. A simple value is any
     * of the following: `"a string"`, boolean `true` or `false`, or
     * anything numeric like `12345` or `123.45`.
     *
     * @param {string} value
     * @returns {boolean}
     */
    private isSimpleValue;
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
    private isFunctionValue;
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
    private isPipedValue;
    /**
     * Parses a value to a `ParsedValue` object, or `null`
     * in case it could not for whatever reason.
     *
     * @param {string} value
     * @returns {ParsedValue | null}
     */
    private parseValue;
    /**
     * Parses the value part of a line into a simple value, like for example
     * a `string`, `number` or `boolean`.
     *
     * @param {string} value
     * @returns {string | number | boolean}
     */
    private parseSimpleValue;
    /**
     * Parses the value part of a line into a Compute Action, which is
     * later executed to run the function described in FlatMatter.
     *
     * @param {string} value
     * @returns {ComputeAction}
     */
    private parseFunctionValue;
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
    private parsePipedValue;
    /**
     * Takes the entire value part of a line and, assuming it is a function value,
     * parses it into a list of arguments to be passed down to the function.
     *
     * @param {string} value
     * @returns {unknown[]}
     */
    private parseFunctionValueArgs;
    /**
     * Takes an entire value of a line and composes it into a list
     * of piped parts.
     *
     * @param {string} value
     * @returns {string[]}
     */
    private composePipedValueParts;
    /**
     * Takes ParsedValue and, optionally an initial value, and runs
     * compute actions over it to return the final computed value.
     *
     * @param {ParsedValue} parsedValue
     * @returns {unknown}
     */
    private computeValue;
    /**
     * Takes a Serializer and uses it to transform internal data
     * object to a desired output.
     *
     * @param {Serializer} serializer
     * @returns {unknown}
     */
    serialize(serializer: Serializer): unknown;
}

declare class ToObject implements Serializer {
    serialize(parsedConfig: Matter): Matter;
}

declare class ToJson implements Serializer {
    serialize(parsedConfig: Matter): string;
}

export { FlatMatter, type FlatMatterFn, type Matter, type Serializer, ToJson, ToObject };
