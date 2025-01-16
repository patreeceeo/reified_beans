import * as Blockly from 'blockly';
import {WorkspaceAnalyzer} from 'src/workspace_analyzer';

const analyzers = new Map<Blockly.Workspace, WorkspaceAnalyzer>();

export function ScopeItemDropdownExtension() {
  /** @ts-ignore-next-line */
  const block = this as Blockly.Block;
  const analyzer = analyzers.get(block.workspace) || new WorkspaceAnalyzer(block.workspace);
  analyzers.set(block.workspace, analyzer);
  analyzer.analyze();
  if(analyzer.has(block.id)) {
    block.getInput('SCOPE_ITEM')!
    .appendField(new Blockly.FieldDropdown(
      function() {
        const options = [] as Array<[string, string]>;
        analyzer.analyze();
        const vars = analyzer.getVariablesForBlockOrWorkspace(block.id)
        for(const name of vars) {
          options.push([name, name]);
        }
        return options;
      }), 'SCOPE_ITEM_DROPDOWN');
  }
}
