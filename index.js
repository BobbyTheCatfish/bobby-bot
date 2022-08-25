const { AugurClient } = require('augurbot'),
  config = require('./config/config.json'),
  { Partials } = require('discord.js'),
  u = require('./utils/utils');
const client = new AugurClient(config, {
  clientOptions: {
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    partials: [Partials.Reaction, Partials.Channel, Partials.Message],
    failIfNotExists: false,
    presence: { activities: [{ name: "How many clothespins can I stick on the back of Bobby's shirt before he notices", type: 0 }] }
  },
  parse: u.parse,
  commands: "./commands",
  errorHandler: u.errorHandler,
  utils: u
});

client.login();
// LAST DITCH ERROR HANDLING
process.on("unhandledRejection", (error, p) => p.catch(e => u.errorHandler(e, "Unhandled Rejection")));
process.on("uncaughtException", (error) => {
  if (error.message != 'read ECONNRESET') u.errorHandler(error, "Uncaught Exception");
});

module.exports = client;