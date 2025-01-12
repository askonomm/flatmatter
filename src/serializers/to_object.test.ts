import FlatMatter, {type FlatMatterFn} from "../flatmatter.ts";
import ToObject from "./to_object.ts";

test("Single-level configuration", () => {
  const fm = new FlatMatter(
    'a: true\nb: false\nc: 1\nd: 12.5\nf: "some string"'
  );

  expect(fm.serialize(new ToObject())).toStrictEqual({
    a: true,
    b: false,
    c: 1,
    d: 12.5,
    f: "some string",
  });
});

test("Two-level configuration", () => {
  const fm = new FlatMatter(
    'a.a: true\nb.b: false\nc.c: 1\nd.d: 12.5\nf.f: "some string"'
  );

  expect(fm.serialize(new ToObject())).toStrictEqual({
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
  class ToUpper implements FlatMatterFn {
    name = "to-upper";

    compute(input: string): unknown {
      return input.toUpperCase();
    }
  }

  const fm = new FlatMatter('a: (to-upper "value")', [new ToUpper()]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE",
  });
});
