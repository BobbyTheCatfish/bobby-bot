const Augur = require('augurbot'),
  u = require('../utils/utils'),
  imaps = require('imap-simple'),
  _ = require('lodash'),
  {simpleParser} = require('mailparser'),
  Module = new Augur.Module()

/*
//THE FOLLOWING IS TEST CODE. I'M NOT PLANNING ON USING THIS, BUT IT GETS EMAILS AND SENDS THEM TO A CHANNEL. pretty simple stuf
//your email account needs to have IMAP turned on and allow less secure devices turned on. i'd reccomend gmail.
let emailArray = [{ id: '', email: 'example@mail.com'}] //obviously, you'll want to replace this with a private json or a db
async function getEmails () {
  let config = {
    imap: {
      user: Module.config.email.username, //email@address.com
      password: Module.config.email.password, //[REDACTED]
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 3000
    }
  }

  imaps.connect(config).then(async function (connection) {
    return connection.openBox('INBOX').then(async function () {
      var searchCriteria = ['UNSEEN', '1:5'];
      var fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: true,
        struct: true
      };

      return connection.search(searchCriteria, fetchOptions).then(async function (results) {
        for (item of results) {
          let all = _.find(item.parts, {"which": ""}),
            id = item.attributes.uid,
            idHeader = `Imap-Id: ${id}\r\n`;

          simpleParser(idHeader + all.body, (err, mail) => {
            if (err) u.errorHandler(err, 'Parse Mail Error');
            let from = emailArray.find(email => email.email == mail.from.value[0].address);
            if (!from) return;
            let {subject, text, attachments, date} = mail,
              author = Module.client.users.cache.get(from.id),
              embed = u.embed().setTitle(subject).setDescription(text).setAuthor(author.username, author.displayAvatarURL()).setTimestamp(date),
              channel = Module.client.channels.cache.get(''); //channel to send emails. could be dynamic
              channel.send({embed});
            for (atts of attachments) channel.send({
              files: [{
                attachment: atts.content,
                name: atts.filename
              }]
            });
          });
        };
      });
    });
  })
};

Module.setClockwork(() => {
  try{
    return setInterval(getEmails, 1000 * 60 *60 * 12);
  } catch(e){u.errorHandler(e, "Missionary Email Clockwork Error")}
})*/

module.exports = Module