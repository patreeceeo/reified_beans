import { describe, expect, test } from "vitest";
import { isBlockEvaluated, sendMessageToLiteral } from "src/test_helpers";

describe("Standard Class Library", () => {
  describe("False", () => {
    test("ifTrue:", () => {
      expect(isBlockEvaluated(false, "ifTrue:")).toBe(false);
    });

    test("ifFalse:", () => {
      expect(isBlockEvaluated(false, "ifFalse:")).toBe(true);
    });

    test("not", () => {
      const vm = sendMessageToLiteral(false, "not");
      expect(vm.evalStack.stackTop!.primitiveValue).toBe(true);
    });
  });
});
