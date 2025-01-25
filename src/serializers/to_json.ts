import type { Serializer } from "../flatmatter.ts";

export default class ToJson implements Serializer {
  serialize(parsedConfig: Record<string, unknown>): string {
    return JSON.stringify(parsedConfig);
  }
}
