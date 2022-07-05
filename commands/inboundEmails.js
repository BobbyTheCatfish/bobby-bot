const Augur = require('augurbot'),
  schedule = require('node-schedule'),
  u = require('../utils/utils'),
  imaps = require('imap-simple'),
  { simpleParser } = require('mailparser'),
  Module = new Augur.Module();


// THE FOLLOWING IS TEST CODE. I'M NOT PLANNING ON USING THIS, BUT IT GETS EMAILS AND SENDS THEM TO A CHANNEL. pretty simple stuf
// your email account needs to have IMAP turned on and allow less secure devices turned on. i'd reccomend gmail.
const emailArray = [{ id: '', email: 'example@mail.com' }]; // obviously, you'll want to replace this with a private json or a db
async function getEmails() {
  const config = {
    imap: {
      user: Module.config.email.username, // email@address.com
      password: Module.config.email.password, // [REDACTED]
      host: 'imap.gmail.com', // or whatever host you use
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 3000
    }
  };
  const searchCriteria = ['UNSEEN', '1:5'];
  const fetchOptions = {
    bodies: ['HEADER', 'TEXT', ''],
    markSeen: true,
    struct: true
  };
  const connection = await imaps.connect(config);
  const results = await connection.search(searchCriteria, fetchOptions);
  let i = 0;
  do {
    const item = results[i];
    const all = item.parts.find({ "which" : "" });
    const id = item.attributes.uid;
    const idHeader = `Imap-Id: ${id}\r\n`;
    const mail = await simpleParser(idHeader + all.body);
    const from = emailArray.find(email => email.email == mail.from.value[0].address);
    if (from) {
      const { subject, text, attachments, date } = mail;
      const author = Module.client.users.cache.get(from.id);
      const embed = u.embed().setTitle(subject).setDescription(text).setAuthor(author.username, author.displayAvatarURL()).setTimestamp(date);
      const channel = Module.client.channels.cache.get('');
      if (attachments.length > 0) {
        if (attachments.map(a => a.size).reduce((a, b) => a + b) < 94371840) {
          await channel.send({ embeds: [embed], files: attachments.map(a => ({ attachment: a.content, name: a.filename })) });
        } else {
          await channel.send({ embeds: [embed] });
          let i2 = 0;
          do {
            const att = attachments[i2];
            await channel.send({ files: [{ attachment: att.content, name: att.filename }] });
            i2++;
          } while (i2 < attachments.length);
        }
      }
    }
    i++;
  } while (i < results.length);
}

Module.addEvent('ready', async () => {
  const enabled = false;
  if (!enabled) return;
  const rule = new schedule.RecurrenceRule();
  rule.hour = 12;
  rule.minute = 0;
  schedule.scheduleJob(rule, async function() {
    await getEmails();
  });
});


module.exports = Module;