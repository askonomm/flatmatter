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

  const fm = new FlatMatter('a: (to-upper "value")', [new ToUpper]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE",
  });
});

test("Piped function by reference usage", () => {
  class ToUpper implements FlatMatterFn {
    name = "to-upper";

    compute(input: string): unknown {
      return input.toUpperCase();
    }
  }

  const fm = new FlatMatter('a: "value" / to-upper', [new ToUpper]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE",
  });
});

test("Piped function by call usage", () => {
  class ToUpper implements FlatMatterFn {
    name = "to-upper";

    compute(input: string, additional: number): unknown {
      return `${input.toUpperCase()}-${additional}`;
    }
  }

  const fm = new FlatMatter('a: "value" / (to-upper 123)', [new ToUpper]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE-123",
  });
});

test("Invalid value in pipe", () => {
  const fm = new FlatMatter('a: "value" / / asd');
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({});
})

test("Invalid value in pipe, 2", () => {
  const fm = new FlatMatter('a: "value" / asd');
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "value"
  });
})

test("Only piped functions", () => {
  class FirstFn implements FlatMatterFn {
    name = "first-fn";

    compute(input: string): unknown {
      return input.toUpperCase();
    }
  }

  class SecondFn implements FlatMatterFn {
    name = "second-fn";

    compute(input: string): unknown {
      return `${input}-passed-by-second`;
    }
  }

  const fm = new FlatMatter('a: (first-fn "value / here") / second-fn', [new FirstFn, new SecondFn]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE / HERE-passed-by-second"
  });
});

test("Function call without any args", () => {
  class ToUpper implements FlatMatterFn {
    name = "to-upper";

    compute(input: string): unknown {
      return input.toUpperCase();
    }
  }

  const fm = new FlatMatter('a: "value" / (to-upper)', [new ToUpper]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE",
  });
})

test("Function call using multiple strings with spaces as arg", () => {
  class ToUpper implements FlatMatterFn {
    name = "to-upper";

    compute(input: string): unknown {
      return input.toUpperCase();
    }
  }

  const fm = new FlatMatter('a: (to-upper "value goes here" "and here")', [new ToUpper]);
  const config = fm.serialize(new ToObject());

  expect(config).toStrictEqual({
    a: "VALUE GOES HERE",
  });
})