/**
 * Trims char(s) from both sides of the given input string.

 * @param {string} input
 * @param {string | string[]} char
 * @returns {string}
 */
export function trimChar(input: string, char: string | string[]): string {
  if (typeof char === "string") {
    char = [char];
  }

  for (const c of char) {
    if (input.charAt(0) === c) {
      input = input.substring(1);
    }

    if (input.charAt(input.length - 1) === c) {
      input = input.substring(0, input.length - 1);
    }
  }

  return input;
}
