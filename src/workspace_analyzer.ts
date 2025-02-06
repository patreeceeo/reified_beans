/**
 * @fileoverview This file contains a class which is used to analyze a Blockly workspace and provide information about it, such as:
 * - What scopes it contains
 * - What variables it uses/defines, and in which scopes
 */
import * as Blockly from "blockly/core";
import { Dict, Stack } from "./generics";
import { invariant } from "./errors";

class ScopeTemplate {
  variables = new Set<string>();
  inherit(parent: ScopeTemplate) {
    for (const variable of parent.variables) {
      this.variables.add(variable);
    }
  }
}

export class WorkspaceAnalyzer {
  private blockTypesThatCreateScope = new Set<string>(["procedures_defreturn"]);
  private blockTypesThatDeclareVariables = new Set<string>(["variables_set"]);
  // TODO maybe extend VariableMap?
  private uuidToScopeTemplate = Dict<ScopeTemplate>();
  private scopeTemplateStack = Stack<ScopeTemplate>();

  constructor(readonly workspace: Blockly.Workspace) {}

  analyze() {
    this.uuidToScopeTemplate = Dict<ScopeTemplate>();
    this.scopeTemplateStack.length = 0;
    const rootScopeTemplate = new ScopeTemplate();
    this.scopeTemplateStack.push(rootScopeTemplate);

    // for (const classDef of stdlib) {
    //   rootScopeTemplate.variables.add(classDef.className);
    // }

    const topBlocks = this.workspace.getTopBlocks(true);
    for (const block of topBlocks) {
      this.analyzeBlock(block);
    }
  }

  /** Analyze a block and its children.
   * If the block creates a new scope, create a new ScopeTemplate for it.
   * Otherwise, add the block's variables to the current scope.
   */
  analyzeBlock(block: Blockly.Block) {
    const blockCreatesScope = this.blockTypesThatCreateScope.has(block.type);

    if (blockCreatesScope) {
      const parentScopeTemplate = this.scopeTemplateStack.peek();
      invariant(
        parentScopeTemplate,
        Error,
        "There should always be a scope template on the stack",
      );
      const scopeTemplate = new ScopeTemplate();
      scopeTemplate.inherit(parentScopeTemplate!);
      this.scopeTemplateStack.push(scopeTemplate);
    }

    const scopeTemplate = this.scopeTemplateStack.peek();
    invariant(
      scopeTemplate,
      Error,
      "There should always be a scope template on the stack",
    );
    this.uuidToScopeTemplate[block.id] = scopeTemplate;

    if (this.blockTypesThatDeclareVariables.has(block.type)) {
      const variableName = block.getFieldValue("NAME");
      scopeTemplate.variables.add(variableName);
    }

    // Recurse into nested blocks
    const nestedBlocks = block.getChildren(true);
    for (const nestedBlock of nestedBlocks) {
      this.analyzeBlock(nestedBlock);
    }

    if (blockCreatesScope) {
      this.scopeTemplateStack.pop();
    }

    // Move on to the next non-nested block, if there is one
    const nextBlock = block.getNextBlock();
    if (nextBlock) {
      console.log("analyzing next block");
      this.analyzeBlock(nextBlock);
    }
  }

  has(uuid: string): boolean {
    return uuid in this.uuidToScopeTemplate;
  }

  /** Get the set of variables that are available for a given block or workspace, given by it's `id` property. */
  getVariablesForBlockOrWorkspace(uuid: string): Set<string> {
    const scopeTemplate = this.uuidToScopeTemplate[uuid];
    invariant(scopeTemplate, Error, "Block should have a scope template");
    return scopeTemplate.variables;
  }
}
