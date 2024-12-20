import * as Blockly from 'blockly/core';
export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  {
    type: 'math_number',
    message0: '%1 %2',
    args0: [
      {
        type: 'field_number',
        name: 'VALUE',
        value: 0,
      },
      {
        type: 'input_value',
        name: 'NEXT',
      },
    ],
    output: 'Number',
  },
  {
    type: 'controls_begin_statement',
    message0: '%1',
    args0: [
      {
        type: 'input_value',
        name: 'NEXT',
      },
    ],
    previousStatement: null,
    nextStatement: null,
  },
  {
    type: 'messages_binary',
    message0: '%1 %2',
    args0: [
      {
        type: 'field_input',
        name: 'OP',
      },
      {
        type: 'input_value',
        name: 'NEXT',
      },
    ],
    output: null,
  }
  // Block for an identifier.
  // {
  //   'type': 'variables_get',
  //   'message0': '%1 %2',
  //   'args0': [
  //     {
  //       'type': 'field_variable',
  //       'name': 'VAR',
  //       'variable': '%{BKY_VARIABLES_DEFAULT_NAME}',
  //     },
  //     {
  //       'type': 'input_value',
  //       'name': 'MESSAGE',
  //     },
  //   ],
  //   'output': null,
  //   'style': 'variable_blocks',
  //   'helpUrl': '%{BKY_VARIABLES_GET_HELPURL}',
  //   'tooltip': '%{BKY_VARIABLES_GET_TOOLTIP}',
  //   'extensions': ['contextMenu_variableSetterGetter'],
  // },
  // {
  //   'type': 'variables_set',
  //   'message0': '%{BKY_VARIABLES_SET}',
  //   'args0': [
  //     {
  //       'type': 'field_variable',
  //       'name': 'VAR',
  //       'variable': '%{BKY_VARIABLES_DEFAULT_NAME}',
  //     },
  //     {
  //       'type': 'input_value',
  //       'name': 'VALUE',
  //     },
  //   ],
  //   output: null,
  //   'style': 'variable_blocks',
  //   'helpUrl': '%{BKY_VARIABLES_SET_HELPURL}',
  //   'tooltip': '%{BKY_VARIABLES_SET_TOOLTIP}',
  //   'extensions': ['contextMenu_variableSetterGetter'],
  // },
  // // TODO: dynamically add/remove keywords. For now it's hardcoded to 2 for ifTrue/ifFalse.
  // {
  //   'type': 'messages_send_keyword',
  //   'message0': '%1 %2 %3 %4',
  //   'output': null,
  //   'args0': [
  //     {
  //       'type': 'field_input',
  //       'name': 'KW1',
  //     },
  //     {
  //       'type': 'input_value',
  //       'name': 'KW1_VALUE',
  //     },
  //     {
  //       'type': 'field_input',
  //       'name': 'KW2',
  //     },
  //     {
  //       'type': 'input_value',
  //       'name': 'KW2_VALUE',
  //     },
  //   ]
  // },
])
