import * as Blockly from "blockly";

export function unregisterProcedureBlocks() {
  delete Blockly.Blocks["procedures_defnoreturn"];
  delete Blockly.Blocks["procedures_callnoreturn"];
  delete Blockly.Blocks["procedures_defreturn"];
  delete Blockly.Blocks["procedures_callreturn"];
}
