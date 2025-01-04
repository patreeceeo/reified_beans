import * as Blockly from 'blockly/core';
export default Blockly.common.createBlockDefinitionsFromJsonArray([
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
    type: 'number_messages_binary',
    message0: '%1 %2',
    args0: [
      {
        "type": "field_dropdown",
        "name": "OP",
        "options": [
          [ ">", ">" ],
          [ "<", "<" ],
          [ "≤", "<=" ],
          [ "≥", ">=" ],
          [ "+", "+" ],
          [ "-", "-" ],
          [ "*", "*" ],
          [ "/", "/" ],
          [ "%", "%" ],
          [ "=", "==" ],
          [ "≠", "!=" ]
        ]
      },
      {
        type: 'input_value',
        name: 'NEXT',
      },
    ],
    output: null,
  },
  {
    type: 'boolean_messages_ifTrue_ifFalse',
    message0: 'ifTrue %1 ifFalse %2',
    args0: [
      {
        type: 'input_value',
        name: 'IF_TRUE',
      },
      {
        type: 'input_value',
        name: 'IF_FALSE',
      },
    ],
    output: 'Boolean',
  },
  {
    type: 'messages_any',
    message0: '%1 %2',
    args0: [
      {
        type: 'field_input',
        name: 'MESSAGE',
      },
      {
        type: 'input_value',
        name: 'NEXT',
      },
    ],
    output: null,
  },
  // TODO use different blocks for getting classes and local variables?
  {
    type: 'variables_get',
    message0: '%1 %2',
    args0: [
      {
        type: 'field_input',
        name: 'VAR',
        variable: 'item',
      },
      {
        type: 'input_value',
        name: 'NEXT',
      },
    ],
    output: null,
  }
])
