import type { Serializer } from "../flatmatter.ts";

export default class ToJson implements Serializer<string> {
  serialize(config: Record<string, unknown>): string {
    return JSON.stringify(config);
  }
}
