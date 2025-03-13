import { isBlockEvaluated } from "src/test_helpers";
import { describe, expect, test } from "vitest";

describe("Standard Class Library", () => {
  describe("True", () => {
    test("ifTrue:", () => {
      expect(isBlockEvaluated(true, "ifTrue:")).toBe(true);
    });
  });
});
