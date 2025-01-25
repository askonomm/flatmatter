import type {Serializer} from "../flatmatter.ts";

export default class ToObject implements Serializer {
  serialize(parsedConfig: Record<string, unknown>): Record<string, unknown> {
    return parsedConfig;
  }
}
