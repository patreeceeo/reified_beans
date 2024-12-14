import * as Blockly from 'blockly/core';
import type {ASTGenerator} from './ast_generator';
import {BinaryExpressionRightTree, BinaryExpressionTree, IdentifierNode, NumberNode, ProgramTree, StatementTree, type AbstractSyntaxTree} from 'src/ast';

export const forBlock: Record<
    string,
    (block: Blockly.Block, generator: ASTGenerator) => AbstractSyntaxTree | null
  > = Object.create(null);

forBlock['variables_get'] = (block: Blockly.Block, generator: ASTGenerator): IdentifierNode | BinaryExpressionTree => {
  const varName = block.getFieldValue('VAR');
  const variable = generator.getVariable(varName);
  const idNode = new IdentifierNode(variable);
  const right = generator.valueToTree(block, 'MESSAGE', false);
  if(right !== null && BinaryExpressionRightTree.isValid(right)) {
    return new BinaryExpressionTree(idNode, right.message, right.right);
  }
  return idNode;
}


// If I had my way, I'd call it 'functions_new' but using this name to be compatible with existing Blockly code
forBlock['procedures_defreturn'] = (block: Blockly.Block, generator: ASTGenerator): ProgramTree | null => {
  const body = generator.statementsToForest(block, 'STACK');
  const parameters = new Set(block.getVarModels());
  if(body !== null) {
    return new ProgramTree(parameters, body);
  } else {
    return null;
  }
}

forBlock['math_number'] = (block: Blockly.Block, generator: ASTGenerator): BinaryExpressionTree | NumberNode => {
  const numberNode = new NumberNode(Number(block.getFieldValue('NUM') ?? '0'));
  const right = generator.valueToTree(block, 'MESSAGE');
  if(right !== null && BinaryExpressionRightTree.isValid(right)) {
    return new BinaryExpressionTree(numberNode, right.message, right.right);
  }
  return numberNode;
}

forBlock['messages_send_binary'] = (block: Blockly.Block, generator: ASTGenerator): BinaryExpressionRightTree | null => {
  const message = block.getFieldValue('MESSAGE');
  const right = generator.valueToTree(block, 'RIGHT');
  if(right !== null) {
    return new BinaryExpressionRightTree(message, right);
  }
  return null;
}

forBlock['statements_delimiter'] = (block: Blockly.Block, generator: ASTGenerator): StatementTree | null => {
  const valueBlock = generator.valueToTree(block, 'STATEMENT');
  if(valueBlock !== null) {
    return new StatementTree(valueBlock);
  }
  return null;
}

