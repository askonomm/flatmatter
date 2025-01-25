import FlatMatter from "./flatmatter";
import {assert} from "vitest";

test('Line has no value separator', () => {
    expect(() => new FlatMatter('test'))
        .toThrowError("Line on index 0 doesn't have a value separator.");
})

test('Line can only have one value separator', () => {
    expect(() => new FlatMatter('test: this: that'))
        .toThrowError("Line on index 0 has multiple value separators.")
})

test('String values can have colon characters', () => {
    assert.doesNotThrow(() => new FlatMatter('test: "this : that"'), Error)
})