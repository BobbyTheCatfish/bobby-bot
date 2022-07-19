const { AugurClient } = require('augurbot'),
  config = require('./config/config.json'),
  { Partials } = require('discord.js'),
  u = require('./utils/utils');
const client = new AugurClient(config, {
  clientOptions: {
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    partials: [Partials.Reaction, Partials.Channel],
  },
  parse: u.parse,
  commands: "./commands",
  errorHandler: u.errorHandler,
  utils: u
});
client.setMaxListeners(20);
client.login();
// LAST DITCH ERROR HANDLING
process.on("unhandledRejection", (error, p) => p.catch(e => u.errorHandler(e, "Unhandled Rejection")));
process.on("uncaughtException", (error) => {
  if (error.message != 'read ECONNRESET') u.errorHandler(error, "Uncaught Exception");
});

module.exports = client;