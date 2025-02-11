import FlatMatter from "../flatmatter.ts";
import ToJson from "./to_json.ts";

test("Single-level configuration", () => {
  const config = FlatMatter.config(
    'a: true\nb: false\nc: 1\nd: 12.5\nf: "some string"',
  );

  const equal = '{"a":true,"b":false,"c":1,"d":12.5,"f":"some string"}';

  expect(FlatMatter.serialize(config, ToJson)).toStrictEqual(equal);
});
