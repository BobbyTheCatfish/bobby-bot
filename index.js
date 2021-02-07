//requiring the different libraries
const {AugurClient} = require('augurbot'),
  config = require('./config/config.json'),
  u = require('./utils/utils'),
  mongoose = require('mongoose')
  client = new AugurClient(config,{
    clientOptions:{
      disableMentions: "everyone",
      partials: ["REACTION"],
    },
    commands: "./commands",
    errorHandler: u.errorHandler
  })



  client.login();

  // LAST DITCH ERROR HANDLING
  process.on("unhandledRejection", (error, p) => p.catch(e => u.errorHandler(e, "Unhandled Rejection")));
  process.on("uncaughtException", (error) => u.errorHandler(error, "Uncaught Exception"));




module.exports = client