import { describe, expect, test } from "vitest";
import { isBlockEvaluated } from "src/test_helpers";

describe("Standard Class Library", () => {
  describe("False", () => {
    test("ifFalse:", () => {
      expect(isBlockEvaluated(false, "ifFalse:")).toBe(true);
    });
  });
});
