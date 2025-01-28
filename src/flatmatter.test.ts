import FlatMatter from "./flatmatter.ts";
import { assert } from "vitest";
import ToObject from "./serializers/to_object.ts";

test("Line has no value separator", () => {
  assert.throws(
    () => new FlatMatter("test"),
    "Line on index 0 doesn't have a value separator."
  );
});

test("Line can only have one value separator", () => {
  assert.throws(
    () => new FlatMatter("test: this: that"),
    "Line on index 0 has multiple value separators."
  );
});

test("String values can have colon characters", () => {
  assert.doesNotThrow(() => new FlatMatter('test: "this : that"'), Error);
});

test("FrontMatter creates a new content entry", () => {
  const fm = new FlatMatter(
    `---\nthis: true\n---\n\nMarkdown goes here.\n\nAnd here.`
  );
  const result = fm.serialize(new ToObject());

  assert.deepEqual(result, {
    this: true,
    content: "Markdown goes here.\n\nAnd here.",
  });
});
