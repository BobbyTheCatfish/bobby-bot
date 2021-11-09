const {AugurClient} = require('augurbot'),
  config = require('./config/config.json'),
  u = require('./utils/utils')
  
  let client = new AugurClient(config,{
    clientOptions:{
      allowedMentions: {parse: ['users',  'roles'], repliedUser: true},
      partials: ["REACTION", "CHANNEL"],
      parse: u.parse,
    },
    commands: "./commands",
    errorHandler: u.errorHandler,
    utils: u
  })

  client.login();
  // LAST DITCH ERROR HANDLING
  process.on("unhandledRejection", (error, p) => p.catch(e => u.errorHandler(e, "Unhandled Rejection")));
  process.on("uncaughtException", (error) => {
    if(error.message != 'read ECONNRESET') u.errorHandler(error, "Uncaught Exception")
  });
  
  


module.exports = client