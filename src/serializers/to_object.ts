import type { Serializer } from "../flatmatter.ts";

export default class ToObject implements Serializer<Record<string, unknown>> {
  serialize(config: Record<string, unknown>): Record<string, unknown> {
    return config;
  }
}
