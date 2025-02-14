import { EOL } from "node:os";
import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import * as Ref from "effect/Ref";
import * as Cause from "effect/Cause";
import * as Schema from "effect/Schema";
import { trimChar } from "./utils.ts";

const ComputeAction = Schema.Struct({
  identifier: Schema.NonEmptyString,
  args: Schema.Array(Schema.Unknown),
});

const ParsedValue = Schema.Struct({
  value: Schema.Unknown,
  computeActions: Schema.Array(ComputeAction),
});

type Function = {
  name: string;
  compute(...args: unknown[]): unknown;
};

class FunctionsState extends Context.Tag("FunctionsState")<
  FunctionsState,
  Ref.Ref<Function[]>
>() {}

/**
 * State for holding the content string.
 */
class ContentState extends Context.Tag("ContentState")<
  ContentState,
  Ref.Ref<string>
>() {}

/**
 * State for holding the parsed configuration.
 */
class ConfigState extends Context.Tag("ConfigState")<
  ConfigState,
  Ref.Ref<Record<string, unknown>>
>() {}

const validateLineHasKeyValEffect = (idx: number, line: string) =>
  Effect.gen(function* () {
    if (!line.includes(":")) {
      yield* Effect.fail(
        Cause.fail(`Line on index ${idx} doesn't have a value separator.`),
      );
    }
  });

/**
 * Validates that the given line has only one value separator.
 */
const validateLineHasOnlyOneColonCharEffect = (idx: number, line: string) =>
  Effect.gen(function* () {
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
      yield* Effect.fail(
        Cause.fail(`Line on index ${idx} has multiple value separators.`),
      );
    }
  });

const validateLineConformanceEffect = (idx: number, line: string) =>
  Effect.gen(function* () {
    const validatorEffects = [
      validateLineHasKeyValEffect,
      validateLineHasOnlyOneColonCharEffect,
    ];

    for (const validatorEffect of validatorEffects) {
      yield* validatorEffect(idx, line);
    }
  });

const isSimpleValue = (value: string): boolean => {
  const isString = value.startsWith('"') && value.endsWith('"');
  const isBoolean = value === "true" || value === "false";
  const isNumber = !isNaN(parseFloat(value));

  return isString || isBoolean || isNumber;
};

const parseSimpleValue = (value: string): string | number | boolean => {
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
};

const parseFunctionValueArgs = (value: string): unknown[] => {
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

  return normalizedParts.map((part) => parseSimpleValue(part));
};

const parseFunctionValue = (
  value: string,
): Schema.Schema.Type<typeof ComputeAction> => {
  const isFn = value.startsWith("(") && value.endsWith(")");

  if (!isFn) {
    return ComputeAction.make({
      identifier: value,
      args: [],
    });
  }

  const fnName = trimChar(value, ["(", ")"]).split(" ")[0].trim();
  const fnArgs = parseFunctionValueArgs(value);

  return ComputeAction.make({
    identifier: fnName,
    args: fnArgs,
  });
};

const composePipedValueParts = (value: string): string[] => {
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
};

const parseValueEffect = (value: string) =>
  Effect.gen(function* () {
    const parts = composePipedValueParts(value);

    if (isSimpleValue(parts[0])) {
      return ParsedValue.make({
        value: parseSimpleValue(parts[0]),
        computeActions: parts.slice(1).map((p) => parseFunctionValue(p)),
      });
    }

    return ParsedValue.make({
      value: null,
      computeActions: parts.map((p) => parseFunctionValue(p)),
    });
  });

const computeValueEffect = (parsedValue: typeof ParsedValue.Type) =>
  Effect.gen(function* () {
    let value = parsedValue.value;
    const functions = yield* Ref.get(yield* FunctionsState);

    for (const computeAction of parsedValue.computeActions) {
      const fn = functions.find((f) => f.name === computeAction.identifier);

      if (!fn) {
        continue;
      }

      if (value !== null) {
        value = fn.compute(value, ...computeAction.args);
        continue;
      }

      value = fn.compute(...computeAction.args);
    }

    return value;
  });

const parseLineEffect = (idx: number, line: string) =>
  Effect.gen(function* () {
    yield* validateLineConformanceEffect(idx, line);

    const keys = line.split(":")[0].trim().split(".");
    const value = line.split(":").slice(1).join(":").trim();
    const parsedValue = yield* parseValueEffect(value);

    const updatedConfig = keys.reduceRight(
      (acc, key) => {
        return { [key]: acc };
      },
      yield* computeValueEffect(parsedValue),
    ) as Record<string, unknown>;

    yield* Ref.update(yield* ConfigState, (config) => {
      return { ...config, ...updatedConfig };
    });
  });

const parseContentEffect = Effect.gen(function* () {
  const content = yield* Ref.get(yield* ContentState);
  const lines = content.split(EOL);
  let frontMatterBreakCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---" && frontMatterBreakCount < 2) {
      frontMatterBreakCount++;
      continue;
    }

    if (frontMatterBreakCount < 2) {
      yield* parseLineEffect(i, lines[i]);
      continue;
    }

    // FlatMatter ends, Markdown begins
    yield* Ref.update(yield* ConfigState, (config) => {
      config.content = lines.slice(i).join(EOL).trim();
      return config;
    });

    break;
  }
});

/**
 *
 */
const composeConfigEffect = Effect.gen(function* () {
  yield* parseContentEffect;

  return yield* Ref.get(yield* ConfigState);
});

const config = (
  content: string,
  functions: Function[] = [],
): Record<string, unknown> => {
  return Effect.runSync(
    composeConfigEffect.pipe(
      Effect.provideServiceEffect(ContentState, Ref.make(content)),
      Effect.provideServiceEffect(ConfigState, Ref.make({})),
      Effect.provideServiceEffect(FunctionsState, Ref.make(functions)),
    ),
  );
};

export default {
  config,
};
