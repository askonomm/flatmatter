import type { Serializer } from "../flatmatter.ts";

const ToJson: Serializer<string> = (
  config: Record<string, unknown>,
): string => {
  return JSON.stringify(config);
};

export default ToJson;
