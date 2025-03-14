import { isBlockEvaluated, sendMessageToLiteral } from "src/test_helpers";
import { describe, expect, test } from "vitest";

describe("Standard Class Library", () => {
  describe("True", () => {
    test("ifTrue:", () => {
      expect(isBlockEvaluated(true, "ifTrue:")).toBe(true);
    });

    test("ifFalse:", () => {
      expect(isBlockEvaluated(true, "ifFalse:")).toBe(false);
    });

    test("not", () => {
      const vm = sendMessageToLiteral(true, "not");
      expect(vm.evalStack.stackTop!.primitiveValue).toBe(false);
    });
  });
});
