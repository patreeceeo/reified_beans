import * as Blockly from 'blockly/core';

enum AbstractSyntaxType {
  Program = 'program',
  Statement = 'statement',
  Expression = 'expression',
  Identifier = 'identifier',
  Literal = 'literal'
}

enum ExpressionType {
  Assignment = 'assignment',
  Binary = 'binary',
  Unary = 'unary',
  Keyword = 'keyword'
}

enum LiteralType {
  Number = 'number',
  String = 'string',
  Symbol = 'symbol',
  Boolean = 'boolean',
  Program = 'program',
  List = 'list',
  Nil = 'nil',
  Self = 'self',
  Super = 'super',
  This = 'this'
}

type ValueTree = IdentifierNode | LiteralNode | ExpressionTree;
type LiteralNode = NumberNode | StringNode | SymbolNode | BooleanNode | NilNode | SelfNode | SuperNode | ThisNode | ListTree | ProgramTree;
type ListMemberNode = LiteralNode | IdentifierNode | ExpressionTree;

export abstract class AbstractSyntaxTree {
  static isValid(tree: AbstractSyntaxTree): tree is AbstractSyntaxTree {
    return tree.type !== undefined;
  }

  constructor(readonly type: AbstractSyntaxType) {}

  toJSON() {
    return {
      type: this.type,
    }
  }

  toString() {
    return JSON.stringify(this, null, 2);
  }
}

const _emtpySet = new Set();
/**
 * Class representing a program as an AST.
 * A program consists of a sequence of statements.
 */
export class ProgramTree extends AbstractSyntaxTree {
  literalType = LiteralType.Program;
  constructor(readonly parameters = _emtpySet as Set<Blockly.VariableModel>, readonly statements: StatementTree[] = []) {
    super(AbstractSyntaxType.Program);
  }

  addStatement(statement: StatementTree) {
    this.statements.push(statement);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      parameters: Array.from(this.parameters).map(p => p.name),
      statements: this.statements.map(s => s.toJSON())
    }
  }
}

/**
 * Class representing a statement as an AST.
 * A statement is a sequence of expressions.
 */
export class StatementTree extends AbstractSyntaxTree {
  static isValid(tree: AbstractSyntaxTree): tree is StatementTree {
    return tree.type === AbstractSyntaxType.Statement && "content" in tree;
  }
  constructor(readonly content: ExpressionTree) {
    super(AbstractSyntaxType.Statement);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      content: this.content.toJSON()
    }
  }
}


export abstract class ExpressionTree extends AbstractSyntaxTree {
  constructor() {
    super(AbstractSyntaxType.Expression);
  }
}

export class BinaryExpressionRightTree extends ExpressionTree {
  static isValid(tree: AbstractSyntaxTree): tree is BinaryExpressionRightTree {
    return tree.type === AbstractSyntaxType.Expression && "message" in tree && "right" in tree;
  }
  constructor(readonly message: string, readonly right: ValueTree) {
    super();
  }
}

export class BinaryExpressionTree extends BinaryExpressionRightTree {
  readonly expressionType = ExpressionType.Binary;
  constructor(readonly left: ValueTree, readonly message: string, readonly right: ValueTree) {
    super(message, right);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      expressionType: this.expressionType,
      left: this.left.toJSON(),
      message: this.message,
      right: this.right.toJSON()
    }
  }
}

class UnaryExpressionRightTree extends ExpressionTree {
  constructor(readonly message: string) {
    super();
  }
}

export class UnaryExpressionTree extends UnaryExpressionRightTree {
  readonly expressionType = ExpressionType.Unary;
  constructor(readonly argument: ExpressionTree, readonly message: string) {
    super(message);
  }
}

class KeywordExpressionRightTree extends ExpressionTree {
  readonly expressionType = ExpressionType.Keyword;
  constructor(readonly message: Record<string, ExpressionTree>) {
    super();
  }
}

export class KeywordExpressionTree extends KeywordExpressionRightTree {
  readonly expressionType = ExpressionType.Keyword;
  constructor(readonly left: ExpressionTree, message: Record<string, ExpressionTree>) {
    super(message);
  }
}

export class IdentifierNode extends AbstractSyntaxTree {
  constructor(readonly variable: Blockly.VariableModel) {
    super(AbstractSyntaxType.Identifier);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      variable: this.variable.name
    }
  }
}

export class NumberNode extends AbstractSyntaxTree {
  literalType = LiteralType.Number;
  constructor(readonly value: number) {
    super(AbstractSyntaxType.Literal);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      value: this.value
    }
  }
}

export class StringNode extends AbstractSyntaxTree {
  literalType = LiteralType.String;
  constructor(readonly value: string) {
    super(AbstractSyntaxType.Literal);
  }
}

export class SymbolNode extends AbstractSyntaxTree {
  literalType = LiteralType.Symbol;
  constructor(readonly value: Symbol) {
    super(AbstractSyntaxType.Literal);
  }
}

export class BooleanNode extends AbstractSyntaxTree {
  literalType = LiteralType.Boolean;
  constructor(readonly value: boolean) {
    super(AbstractSyntaxType.Literal);
  }
}

export class ListTree extends AbstractSyntaxTree {
  literalType = LiteralType.List;
  members = [] as ListMemberNode[];
  constructor(readonly elements: ListMemberNode[]) {
    super(AbstractSyntaxType.Literal);
  }
  addMember(member: ListMemberNode) {
    this.members.push(member);
  }
}

export class NilNode extends AbstractSyntaxTree {
  literalType = LiteralType.Nil;
  constructor() {
    super(AbstractSyntaxType.Literal);
  }
}

export class SelfNode extends AbstractSyntaxTree {
  literalType = LiteralType.Self;
  constructor() {
    super(AbstractSyntaxType.Literal);
  }
}

export class SuperNode extends AbstractSyntaxTree {
  literalType = LiteralType.Super;
  constructor() {
    super(AbstractSyntaxType.Literal);
  }
}

export class ThisNode extends AbstractSyntaxTree {
  literalType = LiteralType.This;
  constructor() {
    super(AbstractSyntaxType.Literal);
  }
}
