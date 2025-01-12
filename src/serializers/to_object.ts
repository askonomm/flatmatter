import type { Matter, Serializer } from "../flatmatter.ts";

export default class ToObject implements Serializer {
  serialize(parsedConfig: Matter): Matter {
    return parsedConfig;
  }
}
