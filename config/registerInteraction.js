const {AugurClient} = require("augurbot");
const config = require("./config.json");

const client = new AugurClient(config);

const TYPES = {
  SUB_COMMAND: 1,
  SUB_COMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8
};
const target = {
    "name": "target",
    "description": "Avatar to manipulate",
    "type": TYPES.USER,
    "required": true
}
const data = {
  "name": "",
  "description": "",
  "options": [
    {
      "name": "",
      "description": "",
      "type": TYPES.SUB_COMMAND,
      "options": [
        target,
        {
          "name": "",
          "description": "",
          "type": TYPES.STRING,
          "required": false,
          "choices": [
            { "name": "", "value": "" }
          ]
        }
      ]
    }
  ]
};
module.exports = {target, data}