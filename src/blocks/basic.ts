import * as Blockly from 'blockly/core';
export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  // Block for an identifier (variable). TODO change the type?
  {
    'type': 'variables_get',
    'message0': '%1 %2',
    'args0': [
      {
        'type': 'field_variable',
        'name': 'VAR',
        'variable': '%{BKY_VARIABLES_DEFAULT_NAME}',
      },
      {
        'type': 'input_value',
        'name': 'MESSAGE',
      },
    ],
    'output': null,
    'style': 'variable_blocks',
    'helpUrl': '%{BKY_VARIABLES_GET_HELPURL}',
    'tooltip': '%{BKY_VARIABLES_GET_TOOLTIP}',
    'extensions': ['contextMenu_variableSetterGetter'],
  },
  // Block for numeric value.
  {
    'type': 'math_number',
    'message0': '%1 %2',
    'args0': [
      {
        'type': 'field_number',
        'name': 'NUM',
        'value': 0,
      },
      {
        'type': 'input_value',
        'name': 'MESSAGE',
      },
    ],
    'output': null,
    'helpUrl': '%{BKY_MATH_NUMBER_HELPURL}',
    'style': 'math_blocks',
    'tooltip': '%{BKY_MATH_NUMBER_TOOLTIP}',
    'extensions': ['parent_tooltip_when_inline'],
  },
  {
    'type': 'messages_send_binary',
    'message0': '%1 %2',
    'output': 'String',
    'args0': [
      {
        'type': 'field_input',
        'name': 'MESSAGE',
      },
      {
        'type': 'input_value',
        'name': 'RIGHT',
      },
    ],
  },
  {
    'type': 'statements_delimiter',
    'message0': '%1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'STATEMENT',
      },
    ],
    'previousStatement': null,
    'nextStatement': null,
  }
])
