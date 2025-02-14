import FlatMatter from "./flatmatter.ts";
import { assert } from "vitest";

test("Single-level configuration", () => {
  const config = FlatMatter.config(
    'a: true\nb: false\nc: 1\nd: 12.5\nf: "some string"',
  );

  expect(config).toStrictEqual({
    a: true,
    b: false,
    c: 1,
    d: 12.5,
    f: "some string",
  });
});

test("Two-level configuration", () => {
  const config = FlatMatter.config(
    'a.a: true\nb.b: false\nc.c: 1\nd.d: 12.5\nf.f: "some string"',
  );

  expect(config).toStrictEqual({
    a: {
      a: true,
    },
    b: {
      b: false,
    },
    c: {
      c: 1,
    },
    d: {
      d: 12.5,
    },
    f: {
      f: "some string",
    },
  });
});

test("Simple function usage", () => {
  const toUpper = {
    name: "to-upper",
    compute: (input: string): unknown => {
      return input.toUpperCase();
    },
  };

  const config = FlatMatter.config('a: (to-upper "value")', [toUpper]);

  expect(config).toStrictEqual({
    a: "VALUE",
  });
});

test("Piped function by reference usage", () => {
  const toUpper = {
    name: "to-upper",
    compute: (input: string): unknown => {
      return input.toUpperCase();
    },
  };

  const config = FlatMatter.config('a: "value" / to-upper', [toUpper]);

  expect(config).toStrictEqual({
    a: "VALUE",
  });
});

test("Piped function by call usage", () => {
  const toUpper = {
    name: "to-upper",
    compute: (input: string, additional: number): unknown => {
      return `${input.toUpperCase()}-${additional}`;
    },
  };

  const config = FlatMatter.config('a: "value" / (to-upper 123)', [toUpper]);

  expect(config).toStrictEqual({
    a: "VALUE-123",
  });
});

test("Invalid value in pipe", () => {
  const config = FlatMatter.config('a: "value" / / asd');

  expect(config).toStrictEqual({
    a: "value",
  });
});

test("Invalid value in pipe, 2", () => {
  const config = FlatMatter.config('a: "value" / asd');

  expect(config).toStrictEqual({
    a: "value",
  });
});

test("Only piped functions", () => {
  const firstFn = {
    name: "first-fn",
    compute: (input: string): unknown => {
      return input.toUpperCase();
    },
  };

  const secondFn = {
    name: "second-fn",
    compute: (input: string): unknown => {
      return `${input}-passed-by-second`;
    },
  };

  const config = FlatMatter.config('a: (first-fn "value / here") / second-fn', [
    firstFn,
    secondFn,
  ]);

  expect(config).toStrictEqual({
    a: "VALUE / HERE-passed-by-second",
  });
});

test("Function call without any args", () => {
  const toUpper = {
    name: "to-upper",
    compute: (input: string): unknown => {
      return input.toUpperCase();
    },
  };

  const config = FlatMatter.config('a: "value" / (to-upper)', [toUpper]);

  expect(config).toStrictEqual({
    a: "VALUE",
  });
});

test("Function call using multiple strings with spaces as arg", () => {
  const toUpper = {
    name: "to-upper",
    compute: (input: string): unknown => {
      return input.toUpperCase();
    },
  };

  const config = FlatMatter.config(
    'a: (to-upper "value goes here" "and here")',
    [toUpper],
  );

  expect(config).toStrictEqual({
    a: "VALUE GOES HERE",
  });
});

test("Line has no value separator", () => {
  assert.throws(
    () => FlatMatter.config("test"),
    "Line on index 0 doesn't have a value separator.",
  );
});

test("Line can only have one value separator", () => {
  assert.throws(
    () => FlatMatter.config("test: this: that"),
    "Line on index 0 has multiple value separators.",
  );
});

test("String values can have colon characters", () => {
  assert.doesNotThrow(() => FlatMatter.config('test: "this : that"'), Error);
});

test("FrontMatter creates a new content entry", () => {
  const config = FlatMatter.config(
    `---\nthis: true\n---\n\nMarkdown goes here.\n\nAnd here.`,
  );

  assert.deepEqual(config, {
    this: true,
    content: "Markdown goes here.\n\nAnd here.",
  });
});
