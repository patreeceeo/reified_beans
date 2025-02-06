/**
 * Based on Google's procedure blocks
 */

import * as Blockly from "blockly/core";

/** Type of a block using the PROCEDURE_DEF_COMMON mixin. */
type FunctionBlock = Blockly.Block & FunctionMixin;
interface FunctionMixin extends FunctionMixinType {
  arguments_: string[];
  argumentVarModels_: Blockly.VariableModel[];
  callType_: string;
  paramIds_: string[];
  statementConnection_: Blockly.Connection | null;
}
type FunctionMixinType = typeof FUNCTION_DEF_COMMON;

/** Extra state for serialising procedure blocks. */
type ProcedureExtraState = {
  params?: Array<{ name: string; id: string }>;
};

const xmlUtils = Blockly.utils.xml;

/**
 * Common properties for the procedure_defnoreturn and
 * procedure_defreturn blocks.
 */
const FUNCTION_DEF_COMMON = {
  /**
   * Update the display of parameters for this procedure definition block.
   *
   * @internal
   */
  updateParams_: function (this: FunctionBlock) {
    // Merge the arguments into a human-readable list.
    let paramString = "";
    if (this.arguments_.length) {
      paramString = this.arguments_.join(", ");
    }
    // The params field is deterministic based on the mutation,
    // no need to fire a change event.
    Blockly.Events.disable();
    try {
      this.setFieldValue(paramString, "PARAMS");
      if (paramString) {
        this.setFieldValue("with", "PREFIX");
      }
    } finally {
      Blockly.Events.enable();
    }
  },
  /**
   * Create XML to represent the argument inputs.
   * Backwards compatible serialization implementation.
   *
   * @param opt_paramIds If true include the IDs of the parameter
   *     quarks.  Used by Procedures.mutateCallers for reconnection.
   * @returns  XML storage element.
   */
  mutationToDom: function (
    this: FunctionBlock,
    opt_paramIds: boolean,
  ): Element {
    const container = xmlUtils.createElement("mutation");
    if (opt_paramIds) {
      container.setAttribute("name", this.getFieldValue("NAME"));
    }
    for (let i = 0; i < this.argumentVarModels_.length; i++) {
      const parameter = xmlUtils.createElement("arg");
      const argModel = this.argumentVarModels_[i];
      parameter.setAttribute("name", argModel.name);
      parameter.setAttribute("varid", argModel.getId());
      if (opt_paramIds && this.paramIds_) {
        parameter.setAttribute("paramId", this.paramIds_[i]);
      }
      container.appendChild(parameter);
    }

    return container;
  },
  /**
   * Parse XML to restore the argument inputs.
   * Backwards compatible serialization implementation.
   *
   * @param xmlElement XML storage element.
   */
  domToMutation: function (this: FunctionBlock, xmlElement: Element) {
    this.arguments_ = [];
    this.argumentVarModels_ = [];
    for (let i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "arg") {
        const childElement = childNode as Element;
        const varName = childElement.getAttribute("name")!;
        const varId =
          childElement.getAttribute("varid") ||
          childElement.getAttribute("varId");
        this.arguments_.push(varName);
        const variable = Blockly.Variables.getOrCreateVariablePackage(
          this.workspace,
          varId,
          varName,
          "",
        );
        if (variable !== null) {
          this.argumentVarModels_.push(variable);
        } else {
          console.log(
            `Failed to create a variable named "${varName}", ignoring.`,
          );
        }
      }
    }
    this.updateParams_();
    Blockly.Procedures.mutateCallers(this);
  },
  /**
   * Returns the state of this block as a JSON serializable object.
   *
   * @returns The state of this block, eg the parameters and statements.
   */
  saveExtraState: function (this: FunctionBlock): ProcedureExtraState | null {
    const state = Object.create(null);
    if (this.argumentVarModels_.length) {
      state["params"] = [];
      for (let i = 0; i < this.argumentVarModels_.length; i++) {
        state["params"].push({
          // We don't need to serialize the name, but just in case we decide
          // to separate params from variables.
          name: this.argumentVarModels_[i].name,
          id: this.argumentVarModels_[i].getId(),
        });
      }
    }
    return state;
  },
  /**
   * Applies the given state to this block.
   *
   * @param state The state to apply to this block, eg the parameters
   *     and statements.
   */
  loadExtraState: function (this: FunctionBlock, state: ProcedureExtraState) {
    this.arguments_ = [];
    this.argumentVarModels_ = [];
    if (state["params"]) {
      for (let i = 0; i < state["params"].length; i++) {
        const param = state["params"][i];
        const variable = Blockly.Variables.getOrCreateVariablePackage(
          this.workspace,
          param["id"],
          param["name"],
          "",
        );
        this.arguments_.push(variable.name);
        this.argumentVarModels_.push(variable);
      }
    }
    this.updateParams_();
    Blockly.Procedures.mutateCallers(this);
  },
  /**
   * Populate the mutator's dialog with this block's components.
   *
   * @param  workspace Mutator's workspace.
   * @returns Root block in mutator.
   */
  decompose: function (
    this: FunctionBlock,
    workspace: Blockly.Workspace,
  ): ContainerBlock {
    /*
     * Creates the following XML:
     * <block type="procedures_mutatorcontainer">
     *   <statement name="STACK">
     *     <block type="procedures_mutatorarg">
     *       <field name="NAME">arg1_name</field>
     *       <next>etc...</next>
     *     </block>
     *   </statement>
     * </block>
     */

    const containerBlockNode = xmlUtils.createElement("block");
    containerBlockNode.setAttribute("type", "procedures_mutatorcontainer");
    const statementNode = xmlUtils.createElement("statement");
    statementNode.setAttribute("name", "STACK");
    containerBlockNode.appendChild(statementNode);

    let node = statementNode;
    for (let i = 0; i < this.arguments_.length; i++) {
      const argBlockNode = xmlUtils.createElement("block");
      argBlockNode.setAttribute("type", "procedures_mutatorarg");
      const fieldNode = xmlUtils.createElement("field");
      fieldNode.setAttribute("name", "NAME");
      const argumentName = xmlUtils.createTextNode(this.arguments_[i]);
      fieldNode.appendChild(argumentName);
      argBlockNode.appendChild(fieldNode);
      const nextNode = xmlUtils.createElement("next");
      argBlockNode.appendChild(nextNode);

      node.appendChild(argBlockNode);
      node = nextNode;
    }

    const containerBlock = Blockly.Xml.domToBlock(
      containerBlockNode,
      workspace,
    ) as ContainerBlock;

    // Initialize procedure's callers with blank IDs.
    Blockly.Procedures.mutateCallers(this);
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   *
   * @param containerBlock Root block in mutator.
   */
  compose: function (this: FunctionBlock, containerBlock: ContainerBlock) {
    // Parameter list.
    this.arguments_ = [];
    this.paramIds_ = [];
    this.argumentVarModels_ = [];
    let paramBlock = containerBlock.getInputTargetBlock("STACK");
    while (paramBlock && !paramBlock.isInsertionMarker()) {
      const varName = paramBlock.getFieldValue("NAME");
      this.arguments_.push(varName);
      const variable = this.workspace.getVariable(varName, "")!;
      this.argumentVarModels_.push(variable);

      this.paramIds_.push(paramBlock.id);
      paramBlock =
        paramBlock.nextConnection && paramBlock.nextConnection.targetBlock();
    }
    this.updateParams_();
    Blockly.Procedures.mutateCallers(this);
  },
  /**
   * Return all variables referenced by this block.
   *
   * @returns List of variable names.
   */
  getVars: function (this: FunctionBlock): string[] {
    return this.arguments_;
  },
  /**
   * Return all variables referenced by this block.
   *
   * @returns List of variable models.
   */
  getVarModels: function (this: FunctionBlock): Blockly.VariableModel[] {
    return this.argumentVarModels_;
  },
  /**
   * Notification that a variable is renaming.
   * If the ID matches one of this block's variables, rename it.
   *
   * @param oldId ID of variable to rename.
   * @param newId ID of new variable.  May be the same as oldId, but
   *     with an updated name.  Guaranteed to be the same type as the
   *     old variable.
   */
  renameVarById: function (
    this: FunctionBlock & Blockly.BlockSvg,
    oldId: string,
    newId: string,
  ) {
    const oldVariable = this.workspace.getVariableById(oldId)!;
    if (oldVariable.type !== "") {
      // Procedure arguments always have the empty type.
      return;
    }
    const oldName = oldVariable.name;
    const newVar = this.workspace.getVariableById(newId)!;

    let change = false;
    for (let i = 0; i < this.argumentVarModels_.length; i++) {
      if (this.argumentVarModels_[i].getId() === oldId) {
        this.arguments_[i] = newVar.name;
        this.argumentVarModels_[i] = newVar;
        change = true;
      }
    }
    if (change) {
      this.displayRenamedVar_(oldName, newVar.name);
      Blockly.Procedures.mutateCallers(this);
    }
  },
  /**
   * Notification that a variable is renaming but keeping the same ID.  If the
   * variable is in use on this block, rerender to show the new name.
   *
   * @param variable The variable being renamed.
   */
  updateVarName: function (
    this: FunctionBlock & Blockly.BlockSvg,
    variable: Blockly.VariableModel,
  ) {
    const newName = variable.name;
    let change = false;
    let oldName;
    for (let i = 0; i < this.argumentVarModels_.length; i++) {
      if (this.argumentVarModels_[i].getId() === variable.getId()) {
        oldName = this.arguments_[i];
        this.arguments_[i] = newName;
        change = true;
      }
    }
    if (change) {
      this.displayRenamedVar_(oldName as string, newName);
      Blockly.Procedures.mutateCallers(this);
    }
  },
  /**
   * Update the display to reflect a newly renamed argument.
   *
   * @internal
   * @param oldName The old display name of the argument.
   * @param newName The new display name of the argument.
   */
  displayRenamedVar_: function (
    this: FunctionBlock & Blockly.BlockSvg,
    oldName: string,
    newName: string,
  ) {
    this.updateParams_();
    // Update the mutator's variables if the mutator is open.
    const mutator = this.getIcon(Blockly.icons.MutatorIcon.TYPE);
    if (mutator && mutator.bubbleIsVisible()) {
      const blocks = mutator.getWorkspace()!.getAllBlocks(false);
      for (let i = 0, block; (block = blocks[i]); i++) {
        if (
          block.type === "procedures_mutatorarg" &&
          Blockly.Names.equals(oldName, block.getFieldValue("NAME"))
        ) {
          block.setFieldValue(newName, "NAME");
        }
      }
    }
  },
  /**
   * Add custom menu options to this block's context menu.
   *
   * @param options List of menu options to add to.
   */
  customContextMenu: function (
    this: FunctionBlock,
    options: Array<
      | Blockly.ContextMenuRegistry.ContextMenuOption
      | Blockly.ContextMenuRegistry.LegacyContextMenuOption
    >,
  ) {
    if (this.isInFlyout) {
      return;
    }
    // Add option to create caller.
    const name = this.getFieldValue("NAME");
    const callProcedureBlockState = {
      type: (this as AnyDuringMigration).callType_,
      extraState: { name: name, params: this.arguments_ },
    };
    options.push({
      enabled: true,
      text: `Create "${name}"`,
      callback: Blockly.ContextMenu.callbackFactory(
        this,
        callProcedureBlockState,
      ),
    });

    // Add options to create getters for each parameter.
    if (!this.isCollapsed()) {
      for (let i = 0; i < this.argumentVarModels_.length; i++) {
        const argVar = this.argumentVarModels_[i];
        const getVarBlockState = {
          type: "variables_get",
          fields: {
            VAR: { name: argVar.name, id: argVar.getId(), type: argVar.type },
          },
        };
        options.push({
          enabled: true,
          text: `Create get "${argVar.name}"`,
          callback: Blockly.ContextMenu.callbackFactory(this, getVarBlockState),
        });
      }
    }
  },
};

const procedures_defreturn: BlockDefinition = {
  ...FUNCTION_DEF_COMMON,
  /**
   * Block for defining a procedure with a return value.
   */
  init: function (this: FunctionBlock & Blockly.BlockSvg) {
    this.appendDummyInput().appendField("", "PREFIX").appendField("", "PARAMS");
    this.setMutator(
      new Blockly.icons.MutatorIcon(["procedures_mutatorarg"], this),
    );
    if (
      (this.workspace.options.comments ||
        (this.workspace.options.parentWorkspace &&
          this.workspace.options.parentWorkspace.options.comments)) &&
      Blockly.Msg["PROCEDURES_DEFRETURN_COMMENT"]
    ) {
      this.setCommentText(Blockly.Msg["PROCEDURES_DEFRETURN_COMMENT"]);
    }
    this.setStyle("procedure_blocks");
    this.setTooltip(Blockly.Msg["PROCEDURES_DEFRETURN_TOOLTIP"]);
    this.setHelpUrl(Blockly.Msg["PROCEDURES_DEFRETURN_HELPURL"]);
    this.arguments_ = [];
    this.argumentVarModels_ = [];
    this.statementConnection_ = null;
    this.setOutput(true);
    this.appendStatementInput("STACK").appendField("do");
  },
  /**
   * Return the signature of this procedure definition.
   *
   * @returns Tuple containing three elements:
   *     - the name of the defined procedure,
   *     - a list of all its arguments,
   *     - that it DOES have a return value.
   */
  getProcedureDef: function (this: FunctionBlock): [string, string[], true] {
    return [this.getFieldValue("NAME"), this.arguments_, true];
  },
  callType_: "procedures_callreturn",
} as BlockDefinition;

/** Type of a procedures_mutatorcontainer block. */
type ContainerBlock = Blockly.Block & ContainerMixin;
interface ContainerMixin extends ContainerMixinType {}
type ContainerMixinType = typeof PROCEDURES_MUTATORCONTAINER;

const PROCEDURES_MUTATORCONTAINER = {
  /**
   * Mutator block for procedure container.
   */
  init: function (this: ContainerBlock) {
    this.appendDummyInput().appendField(
      Blockly.Msg["PROCEDURES_MUTATORCONTAINER_TITLE"],
    );
    this.appendStatementInput("STACK");
    this.setStyle("procedure_blocks");
    this.setTooltip(Blockly.Msg["PROCEDURES_MUTATORCONTAINER_TOOLTIP"]);
    this.contextMenu = false;
  },
};

/** Type of a procedures_mutatorarg block. */
type ArgumentBlock = Blockly.Block & ArgumentMixin;
interface ArgumentMixin extends ArgumentMixinType {}
type ArgumentMixinType = typeof PROCEDURES_MUTATORARGUMENT;

// TODO(#6920): This is kludgy.
type FieldTextInputForArgument = Blockly.FieldTextInput & {
  oldShowEditorFn_(_e?: Event, quietInput?: boolean): void;
  createdVariables_: Blockly.VariableModel[];
};

const PROCEDURES_MUTATORARGUMENT = {
  /**
   * Mutator block for procedure argument.
   */
  init: function (this: ArgumentBlock) {
    const field = Blockly.fieldRegistry.fromJson({
      type: "field_input",
      text: Blockly.Procedures.DEFAULT_ARG,
    }) as FieldTextInputForArgument;
    field.setValidator(this.validator_);
    // Hack: override showEditor to do just a little bit more work.
    // We don't have a good place to hook into the start of a text edit.
    field.oldShowEditorFn_ = (field as AnyDuringMigration).showEditor_;
    const newShowEditorFn = function (this: typeof field) {
      this.createdVariables_ = [];
      this.oldShowEditorFn_();
    };
    (field as AnyDuringMigration).showEditor_ = newShowEditorFn;

    this.appendDummyInput()
      .appendField(Blockly.Msg["PROCEDURES_MUTATORARG_TITLE"])
      .appendField(field, "NAME");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setStyle("procedure_blocks");
    this.setTooltip(Blockly.Msg["PROCEDURES_MUTATORARG_TOOLTIP"]);
    this.contextMenu = false;

    // Create the default variable when we drag the block in from the flyout.
    // Have to do this after installing the field on the block.
    field.onFinishEditing_ = this.deleteIntermediateVars_;
    // Create an empty list so onFinishEditing_ has something to look at, even
    // though the editor was never opened.
    field.createdVariables_ = [];
    field.onFinishEditing_("x");
  },

  /**
   * Obtain a valid name for the procedure argument. Create a variable if
   * necessary.
   * Merge runs of whitespace.  Strip leading and trailing whitespace.
   * Beyond this, all names are legal.
   *
   * @internal
   * @param varName User-supplied name.
   * @returns Valid name, or null if a name was not specified.
   */
  validator_: function (
    this: FieldTextInputForArgument,
    varName: string,
  ): string | null {
    const sourceBlock = this.getSourceBlock()!;
    const outerWs = sourceBlock!.workspace.getRootWorkspace()!;
    varName = varName.replace(/[\s\xa0]+/g, " ").replace(/^ | $/g, "");
    if (!varName) {
      return null;
    }

    // Prevents duplicate parameter names in functions
    const workspace =
      (sourceBlock.workspace as Blockly.WorkspaceSvg).targetWorkspace ||
      sourceBlock.workspace;
    const blocks = workspace.getAllBlocks(false);
    const caselessName = varName.toLowerCase();
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].id === this.getSourceBlock()!.id) {
        continue;
      }
      // Other blocks values may not be set yet when this is loaded.
      const otherVar = blocks[i].getFieldValue("NAME");
      if (otherVar && otherVar.toLowerCase() === caselessName) {
        return null;
      }
    }

    // Don't create variables for arg blocks that
    // only exist in the mutator's flyout.
    if (sourceBlock.isInFlyout) {
      return varName;
    }

    let model = outerWs.getVariable(varName, "");
    if (model && model.name !== varName) {
      // Rename the variable (case change)
      outerWs.renameVariableById(model.getId(), varName);
    }
    if (!model) {
      model = outerWs.createVariable(varName, "");
      if (model && this.createdVariables_) {
        this.createdVariables_.push(model);
      }
    }
    return varName;
  },

  /**
   * Called when focusing away from the text field.
   * Deletes all variables that were created as the user typed their intended
   * variable name.
   *
   * @internal
   * @param  newText The new variable name.
   */
  deleteIntermediateVars_: function (
    this: FieldTextInputForArgument,
    newText: string,
  ) {
    const outerWs = this.getSourceBlock()!.workspace.getRootWorkspace();
    if (!outerWs) {
      return;
    }
    for (let i = 0; i < this.createdVariables_.length; i++) {
      const model = this.createdVariables_[i];
      if (model.name !== newText) {
        outerWs.deleteVariableById(model.getId());
      }
    }
  },
};

/** Type of a block using the PROCEDURE_CALL_COMMON mixin. */
type CallBlock = Blockly.Block & CallMixin;
interface CallMixin extends CallMixinType {
  argumentVarModels_: Blockly.VariableModel[];
  arguments_: string[];
  defType_: string;
  quarkIds_: string[] | null;
  quarkConnections_: { [id: string]: Blockly.Connection };
}
type CallMixinType = typeof PROCEDURE_CALL_COMMON;

/** Extra state for serialising call blocks. */
type CallExtraState = {
  name: string;
  params?: string[];
};

/**
 * The language-neutral ID for when the reason why a block is disabled is
 * because the block's corresponding procedure definition is disabled.
 */
const DISABLED_PROCEDURE_DEFINITION_DISABLED_REASON =
  "DISABLED_PROCEDURE_DEFINITION";

/**
 * Common properties for the procedure_callnoreturn and
 * procedure_callreturn blocks.
 */
const PROCEDURE_CALL_COMMON = {
  /**
   * Returns the name of the procedure this block calls.
   *
   * @returns Procedure name.
   */
  getProcedureCall: function (this: CallBlock): string {
    // The NAME field is guaranteed to exist, null will never be returned.
    return this.getFieldValue("NAME");
  },
  /**
   * Notification that a procedure is renaming.
   * If the name matches this block's procedure, rename it.
   *
   * @param oldName Previous name of procedure.
   * @param newName Renamed procedure.
   */
  renameProcedure: function (
    this: CallBlock,
    oldName: string,
    newName: string,
  ) {
    if (Blockly.Names.equals(oldName, this.getProcedureCall())) {
      this.setFieldValue(newName, "NAME");
      const baseMsg = this.outputConnection
        ? Blockly.Msg["PROCEDURES_CALLRETURN_TOOLTIP"]
        : Blockly.Msg["PROCEDURES_CALLNORETURN_TOOLTIP"];
      this.setTooltip(baseMsg.replace("%1", newName));
    }
  },
  /**
   * Notification that the procedure's parameters have changed.
   *
   * @internal
   * @param paramNames New param names, e.g. ['x', 'y', 'z'].
   * @param paramIds IDs of params (consistent for each parameter
   *     through the life of a mutator, regardless of param renaming),
   *     e.g. ['piua', 'f8b_', 'oi.o'].
   */
  setProcedureParameters_: function (
    this: CallBlock,
    paramNames: string[],
    paramIds: string[],
  ) {
    // Data structures:
    // this.arguments = ['x', 'y']
    //     Existing param names.
    // this.quarkConnections_ {piua: null, f8b_: Connection}
    //     Look-up of paramIds to connections plugged into the call block.
    // this.quarkIds_ = ['piua', 'f8b_']
    //     Existing param IDs.
    // Note that quarkConnections_ may include IDs that no longer exist, but
    // which might reappear if a param is reattached in the mutator.
    const defBlock = Blockly.Procedures.getDefinition(
      this.getProcedureCall(),
      this.workspace,
    );
    const mutatorIcon =
      defBlock && defBlock.getIcon(Blockly.icons.MutatorIcon.TYPE);
    const mutatorOpen = mutatorIcon && mutatorIcon.bubbleIsVisible();
    if (!mutatorOpen) {
      this.quarkConnections_ = {};
      this.quarkIds_ = null;
    } else {
      // fix #6091 - this call could cause an error when outside if-else
      // expanding block while mutating prevents another error (ancient fix)
      this.setCollapsed(false);
    }
    // Test arguments (arrays of strings) for changes. '\n' is not a valid
    // argument name character, so it is a valid delimiter here.
    if (paramNames.join("\n") === this.arguments_.join("\n")) {
      // No change.
      this.quarkIds_ = paramIds;
      return;
    }
    if (paramIds.length !== paramNames.length) {
      throw RangeError("paramNames and paramIds must be the same length.");
    }
    if (!this.quarkIds_) {
      // Initialize tracking for this block.
      this.quarkConnections_ = {};
      this.quarkIds_ = [];
    }
    // Update the quarkConnections_ with existing connections.
    for (let i = 0; i < this.arguments_.length; i++) {
      const input = this.getInput("ARG" + i);
      if (input) {
        const connection = input.connection!.targetConnection!;
        this.quarkConnections_[this.quarkIds_[i]] = connection;
        if (
          mutatorOpen &&
          connection &&
          !paramIds.includes(this.quarkIds_[i])
        ) {
          // This connection should no longer be attached to this block.
          connection.disconnect();
          connection.getSourceBlock().bumpNeighbours();
        }
      }
    }
    // Rebuild the block's arguments.
    this.arguments_ = ([] as string[]).concat(paramNames);
    // And rebuild the argument model list.
    this.argumentVarModels_ = [];
    for (let i = 0; i < this.arguments_.length; i++) {
      const variable = Blockly.Variables.getOrCreateVariablePackage(
        this.workspace,
        null,
        this.arguments_[i],
        "",
      );
      this.argumentVarModels_.push(variable);
    }

    this.updateShape_();
    this.quarkIds_ = paramIds;
    // Reconnect any child blocks.
    if (this.quarkIds_) {
      for (let i = 0; i < this.arguments_.length; i++) {
        const quarkId: string = this.quarkIds_[i]; // TODO(#6920)
        if (quarkId in this.quarkConnections_) {
          // TODO(#6920): investigate claimed circular initialisers.
          const connection: Blockly.Connection =
            this.quarkConnections_[quarkId];
          if (!connection?.reconnect(this, "ARG" + i)) {
            // Block no longer exists or has been attached elsewhere.
            delete this.quarkConnections_[quarkId];
          }
        }
      }
    }
  },
  /**
   * Modify this block to have the correct number of arguments.
   *
   * @internal
   */
  updateShape_: function (this: CallBlock) {
    for (let i = 0; i < this.arguments_.length; i++) {
      const argField = this.getField("ARGNAME" + i);
      if (argField) {
        // Ensure argument name is up to date.
        // The argument name field is deterministic based on the mutation,
        // no need to fire a change event.
        Blockly.Events.disable();
        try {
          argField.setValue(this.arguments_[i]);
        } finally {
          Blockly.Events.enable();
        }
      } else {
        // Add new input.
        const newField = Blockly.fieldRegistry.fromJson({
          type: "field_label",
          text: this.arguments_[i],
        }) as Blockly.FieldLabel;
        this.appendValueInput("ARG" + i)
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField(newField, "ARGNAME" + i);
      }
    }
    // Remove deleted inputs.
    for (let i = this.arguments_.length; this.getInput("ARG" + i); i++) {
      this.removeInput("ARG" + i);
    }
    // Add 'with:' if there are parameters, remove otherwise.
    const topRow = this.getInput("TOPROW");
    if (topRow) {
      if (this.arguments_.length) {
        if (!this.getField("WITH")) {
          topRow.appendField(
            Blockly.Msg["PROCEDURES_CALL_BEFORE_PARAMS"],
            "WITH",
          );
        }
      } else {
        if (this.getField("WITH")) {
          topRow.removeField("WITH");
        }
      }
    }
  },
  /**
   * Create XML to represent the (non-editable) name and arguments.
   * Backwards compatible serialization implementation.
   *
   * @returns XML storage element.
   */
  mutationToDom: function (this: CallBlock): Element {
    const container = xmlUtils.createElement("mutation");
    container.setAttribute("name", this.getProcedureCall());
    for (let i = 0; i < this.arguments_.length; i++) {
      const parameter = xmlUtils.createElement("arg");
      parameter.setAttribute("name", this.arguments_[i]);
      container.appendChild(parameter);
    }
    return container;
  },
  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * Backwards compatible serialization implementation.
   *
   * @param xmlElement XML storage element.
   */
  domToMutation: function (this: CallBlock, xmlElement: Element) {
    const name = xmlElement.getAttribute("name")!;
    this.renameProcedure(this.getProcedureCall(), name);
    const args: string[] = [];
    const paramIds = [];
    for (let i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "arg") {
        args.push((childNode as Element).getAttribute("name")!);
        paramIds.push((childNode as Element).getAttribute("paramId")!);
      }
    }
    this.setProcedureParameters_(args, paramIds);
  },
  /**
   * Returns the state of this block as a JSON serializable object.
   *
   * @returns The state of this block, ie the params and procedure name.
   */
  saveExtraState: function (this: CallBlock): CallExtraState {
    const state = Object.create(null);
    state["name"] = this.getProcedureCall();
    if (this.arguments_.length) {
      state["params"] = this.arguments_;
    }
    return state;
  },
  /**
   * Applies the given state to this block.
   *
   * @param state The state to apply to this block, ie the params and
   *     procedure name.
   */
  loadExtraState: function (this: CallBlock, state: CallExtraState) {
    this.renameProcedure(this.getProcedureCall(), state["name"]);
    const params = state["params"];
    if (params) {
      const ids: string[] = [];
      ids.length = params.length;
      ids.fill(null as unknown as string); // TODO(#6920)
      this.setProcedureParameters_(params, ids);
    }
  },
  /**
   * Return all variables referenced by this block.
   *
   * @returns List of variable names.
   */
  getVars: function (this: CallBlock): string[] {
    return this.arguments_;
  },
  /**
   * Return all variables referenced by this block.
   *
   * @returns List of variable models.
   */
  getVarModels: function (this: CallBlock): Blockly.VariableModel[] {
    return this.argumentVarModels_;
  },
  /**
   * Procedure calls cannot exist without the corresponding procedure
   * definition.  Enforce this link whenever an event is fired.
   *
   * @param event Change event.
   */
  onchange: function (this: CallBlock, event: Blockly.Events.Abstract) {
    if (!this.workspace || this.workspace.isFlyout) {
      // Block is deleted or is in a flyout.
      return;
    }
    if (!event.recordUndo) {
      // Events not generated by user. Skip handling.
      return;
    }
    if (
      event.type === Blockly.Events.BLOCK_CREATE &&
      (event as Blockly.Events.BlockCreate).ids!.includes(this.id)
    ) {
      // Look for the case where a procedure call was created (usually through
      // paste) and there is no matching definition.  In this case, create
      // an empty definition block with the correct signature.
      const name = this.getProcedureCall();
      let def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (
        def &&
        (def.type !== this.defType_ ||
          JSON.stringify(def.getVars()) !== JSON.stringify(this.arguments_))
      ) {
        // The signatures don't match.
        def = null;
      }
      if (!def) {
        Blockly.Events.setGroup(event.group);
        /**
         * Create matching definition block.
         * <xml xmlns="https://developers.google.com/blockly/xml">
         *   <block type="procedures_defreturn" x="10" y="20">
         *     <mutation name="test">
         *       <arg name="x"></arg>
         *     </mutation>
         *     <field name="NAME">test</field>
         *   </block>
         * </xml>
         */
        const xml = xmlUtils.createElement("xml");
        const block = xmlUtils.createElement("block");
        block.setAttribute("type", this.defType_);
        const xy = this.getRelativeToSurfaceXY();
        const x = xy.x + Blockly.config.snapRadius * (this.RTL ? -1 : 1);
        const y = xy.y + Blockly.config.snapRadius * 2;
        block.setAttribute("x", `${x}`);
        block.setAttribute("y", `${y}`);
        const mutation = this.mutationToDom();
        block.appendChild(mutation);
        const field = xmlUtils.createElement("field");
        field.setAttribute("name", "NAME");
        const callName = this.getProcedureCall();
        const newName = Blockly.Procedures.findLegalName(callName, this);
        if (callName !== newName) {
          this.renameProcedure(callName, newName);
        }
        field.appendChild(xmlUtils.createTextNode(callName));
        block.appendChild(field);
        xml.appendChild(block);
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        Blockly.Events.setGroup(false);
      } else if (!def.isEnabled()) {
        this.setDisabledReason(
          true,
          DISABLED_PROCEDURE_DEFINITION_DISABLED_REASON,
        );
        this.setWarningText(
          Blockly.Msg["PROCEDURES_CALL_DISABLED_DEF_WARNING"].replace(
            "%1",
            name,
          ),
        );
      }
    } else if (event.type === Blockly.Events.BLOCK_DELETE) {
      // Look for the case where a procedure definition has been deleted,
      // leaving this block (a procedure call) orphaned.  In this case, delete
      // the orphan.
      const name = this.getProcedureCall();
      const def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (!def) {
        Blockly.Events.setGroup(event.group);
        this.dispose(true);
        Blockly.Events.setGroup(false);
      }
    } else if (
      event.type === Blockly.Events.BLOCK_CHANGE &&
      (event as Blockly.Events.BlockChange).element === "disabled"
    ) {
      const blockChangeEvent = event as Blockly.Events.BlockChange;
      const name = this.getProcedureCall();
      const def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (def && def.id === blockChangeEvent.blockId) {
        // in most cases the old group should be ''
        const oldGroup = Blockly.Events.getGroup();
        if (oldGroup) {
          // This should only be possible programmatically and may indicate a
          // problem with event grouping. If you see this message please
          // investigate. If the use ends up being valid we may need to reorder
          // events in the undo stack.
          console.log(
            "Saw an existing group while responding to a definition change",
          );
        }
        Blockly.Events.setGroup(event.group);
        const valid = def.isEnabled();
        this.setDisabledReason(
          !valid,
          DISABLED_PROCEDURE_DEFINITION_DISABLED_REASON,
        );
        this.setWarningText(
          valid
            ? null
            : Blockly.Msg["PROCEDURES_CALL_DISABLED_DEF_WARNING"].replace(
                "%1",
                name,
              ),
        );
        Blockly.Events.setGroup(oldGroup);
      }
    }
  },
  /**
   * Add menu option to find the definition block for this call.
   *
   * @param options List of menu options to add to.
   */
  customContextMenu: function (
    this: CallBlock,
    options: Array<
      | Blockly.ContextMenuRegistry.ContextMenuOption
      | Blockly.ContextMenuRegistry.LegacyContextMenuOption
    >,
  ) {
    if (!(this.workspace as Blockly.WorkspaceSvg).isMovable()) {
      // If we center on the block and the workspace isn't movable we could
      // loose blocks at the edges of the workspace.
      return;
    }

    const name = this.getProcedureCall();
    const workspace = this.workspace;
    options.push({
      enabled: true,
      text: Blockly.Msg["PROCEDURES_HIGHLIGHT_DEF"],
      callback: function () {
        const def = Blockly.Procedures.getDefinition(name, workspace);
        if (def) {
          (workspace as Blockly.WorkspaceSvg).centerOnBlock(def.id);
          Blockly.common.setSelected(def as Blockly.BlockSvg);
        }
      },
    });
  },
};

export default {
  procedures_defreturn,
};
