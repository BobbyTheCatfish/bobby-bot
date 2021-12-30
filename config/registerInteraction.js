const {AugurClient} = require("augurbot");
const config = require("./config.json");
const discord = require('discord.js')
//const client = new AugurClient(config);

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
/**@type {discord.ApplicationCommandData}*/
const data = {
  defaultPermission: true,
  name: "welcome",
  type: 'CHAT_INPUT',
  description: "Sets up the welcome message",
  options: [
    {
      type: 7,
      name: "channel",
      description: "The channel to send the message in",
      required: true
    },
    {
      type: 3,
      name: "message",
      description: "Custom or randomized message (leave blank for randomized, and use <@member> to ping the new member)"
    },
    {
      type: 3,
      name: "emoji",
      description: "Emoji to use in randomized message"
    },
    {
      type: 8,
      name: "rule-channel",
      description: "Rule channel to mention in randomized message"
    },
    {
      type: 8,
      name: "role",
      description: "Role to give the new member"
    },
    {
      type: 8,
      name: "role2",
      description: "Optional second role"
    }
  ]
}
//const target = {
//    "name": "target",
//    "description": "Avatar to manipulate",
//    "type": TYPES.USER,
//    "required": true
//}
//const data = {
//  "name": "",
//  "description": "",
//  "options": [
//    {
//      "name": "",
//      "description": "",
//      "type": TYPES.SUB_COMMAND,
//      "options": [
//        target,
//        {
//          "name": "",
//          "description": "",
//          "type": TYPES.STRING,
//          "required": false,
//          "choices": [
//            { "name": "", "value": "" }
//          ]
//        }
//      ]
//    }
//  ]
//};
module.exports = {data}