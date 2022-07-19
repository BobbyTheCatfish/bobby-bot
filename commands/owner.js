const Augur = require('augurbot'),
  u = require('../utils/utils'),
  nodemailer = require('nodemailer'),
  fs = require('fs'),
  path = require('path'),
  spawn = require('child_process').spawn;
const Module = new Augur.Module();

const runCommand = (msg, cmd) => {
  u.clean(msg);
  const stdout = [];
  const stderr = [];

  cmd.stdout.on("data", data => {
    stdout.push(data);
  });

  cmd.stderr.on("data", data => {
    stderr.push(data);
  });

  cmd.on("close", code => {
    if (code == 0) {
      msg.channel.send(stdout.join("\n") + "\n\nCompleted with code: " + code).then(u.clean);
    } else {
      msg.channel.send(`ERROR CODE ${code}:\n${stderr.join("\n")}`).then(u.clean);
    }
  });
};
Module.addCommand({ name: "pingeveryone",
  category: "Owner",
  hidden: true,
  onlyOwner: true,
  process: async (msg) => {
    if (msg.author.id != '337713155801350146') return;
    try {
      setTimeout(() => msg.delete(), 500);
      return msg.channel.send('@everyone').then(m => {
        setTimeout(() => m.delete(), 500);
      });
    } catch (error) {
      console.log(error);
    }
  }
})
.addCommand({ name: "pinghere",
  category: "Owner",
  hidden: true,
  onlyOwner: true,
  process: async (msg) => {
    if (msg.author.id != '337713155801350146') return;
    try {
      setTimeout(() => msg.delete(), 500);
      return msg.channel.send('@here').then(m => {
        setTimeout(() => m.delete(), 500);
      });
    } catch (error) {
      console.log(error);
    }
  }
})
.addCommand({ name: "activity",
  category: "Owner",
  syntax: '<type>|<url> (if applicable)',
  onlyOwner: true,
  process: async (msg, suffix) => {
    const words = suffix.split(' ');
    const keywords = words.slice(1).join(' ');
    const url = words.slice(1).join(' ').split('|');
    const twitchURL = 'https://twitch.tv/bobbydacatfish';

    const client = msg.client;

    if (words[0].toLowerCase() == 'streaming') {
      if (!url[0]) return msg.channel.send("What are you streaming?");
      if (!url[1]) {
        client.user.setActivity(keywords, { type: "STREAMING", url: twitchURL })
                .then(p => msg.channel.send(`Status has been set to **streaming ${p.activities[0].name}**`))
                .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
        return;
      }
      if (msg.content.includes('https://www.')) {
        client.user.setActivity(url[0], { type: "STREAMING", url: url[1] })
                .then(p => msg.channel.send(`Status has been set to **streaming ${p.activities[0].name}** at **${url[1]}**`))
                .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
        return;
      }
      client.user.setActivity(url[0], { type: "STREAMING", url: 'https://www.' + url[1] })
            .then(p => msg.channel.send(`Status has been set to **streaming ${p.activities[0].name}** at **${url[1]}**`))
            .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
      return;
    }
    if (words[0].toLowerCase() == 'watching') {
      if (!url[0]) return msg.channel.send("What are you watching?");
      if (!url[1]) {
        client.user.setActivity(url[0], { type: "WATCHING", url: 'https://www.twitch.tv/bobbydacatfish' })
                .then(p => msg.channel.send(`Status has been set to **watching ${p.activities[0].name}**`))
                .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
        return;
      }
      if (url[1].includes('https://www.')) {
        client.user.setActivity(url[0], { type: "WATCHING", url: url[1] })
                .then(p => msg.channel.send(`Status has been set to **watching ${p.activities[0].name}**`))
                .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
        return;
      }
      client.user.setActivity(url[0], { type: "WATCHING", url: 'https://www.' + url[1] })
            .then(p => msg.channel.send(`Status has been set to **watching ${p.activities[0].name}**`))
            .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
      return;
    }
    if (words[0].toLowerCase() == 'playing') {
      if (!keywords) return msg.channel.send("What are you playing?");
      client.user.setActivity(keywords, { type: "PLAYING" })
            .then(p => msg.channel.send('Status has been set to **playing ' + p.activities[0].name + '**'))
            .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
      return;
    }
    if (words[0].toLowerCase() == 'listening') {
      if (!keywords) return msg.channel.send("What are you listening to?");
      if (!url[1]) {
        client.user.setActivity(keywords, { type: "LISTENING", url:'https://open.spotify.com/track/6jQX8qOBCWffNAXhvPq7n4?si=rLdqxl7xQNKe_WSJSaXSrg' })
                .then(p => msg.channel.send(`Status has been set to **listening to ${p.activities[0].name}**`))
                .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
        return;
      }
      if (url[1].includes('https://www.')) {
        client.user.setActivity(words[0], { type: "LISTENING", url: url[1] })
                .then(p => msg.channel.send(`Status has been set to **listening to ${p.activities[0].name}**`))
                .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
        return;
      }
      client.user.setActivity(words[0], { type: "LISTENING", url: 'https://www.' + url[1] })
            .then(p => msg.channel.send(`Status has been set to **listening to ${p.activities[0].name}**`))
            .catch(error => msg.reply(`Couldn't change status because of: ${error}`));
      return;
    }
    if (suffix.toLowerCase() == 'invisible') {
      client.user.setStatus('invisible');
      return msg.channel.send('Now invisible');
    }
    if (suffix.toLowerCase() == 'online') {
      client.user.setStatus('online');
      return msg.channel.send('Now available');
    }
    if (suffix.toLowerCase() == 'dnd') {
      client.user.setStatus('dnd');
      return msg.channel.send("Now unable to be disturbed");
    }
    if (suffix.toLowerCase() == 'idle') {
      client.user.setStatus('idle');
      return msg.channel.send('Now idle');
    }
    return;
  }
})
.addCommand({ name: "email",
  category: "Owner",
  onlyOwner: true,
  process: async (msg, suffix) => {
    if (!suffix) return msg.channel.send("what are you thinking, dummy? give me some args");
    let emailAddress = suffix.split('|')[0];
    if (!emailAddress.includes('@') || !emailAddress.includes('.')) return msg.channel.send("That's not a valid email!").then(m => u.clean([m, msg]));
    if (msg.attachments.first()) if (msg.attachments.first().size > 10000000) return msg.channel.send(`That attachment is too large!`);

    if (emailAddress.includes(' ')) emailAddress = emailAddress.split(' ');
    const emailSubject = suffix.split('|')[1];
    const emailContent = suffix.split('|')[2];
    if (!suffix.includes('|')) return msg.channel.send("Can't send that email");
    if (!emailContent && !emailSubject && !msg.attachments.first()) return msg.channel.send("Cannot send an empty email");

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth:
        {
          user: Module.config.email.user,
          pass: Module.config.email.pass
        },
    });

    if (msg.attachments.first()) {
      await transporter.sendMail({
        from: `"Bobby Bot" <${Module.config.email.user}>`, // sender address
        to: emailAddress, // list of receivers
        subject: emailSubject, // Subject line
        html: emailContent, // html body
        attachments:
          [
            { // use URL as an attachment
              filename: msg.attachments.first().name,
              path: msg.attachments.first().url
            },
          ]
      });
      return msg.channel.send("sent");
    }

    // send mail with defined transport object
    await transporter.sendMail({
      from: `"Bobby Bot" <${Module.config.email.user}>`, // sender address
      to: emailAddress, // list of receivers
      subject: emailSubject, // Subject line
      html: emailContent, // html body
    });
    return msg.channel.send("sent");
  }
})
.addCommand({ name: "iamyourdev",
  category: 'Owner',
  hidden: true,
  onlyDM: true,
  process: async (msg) => {
    const devGuild = msg.client.guilds.cache.get('406821751905976320');
    if ((await devGuild.bans.fetch()).find(m => m.id == msg.author.id)) {
      return msg.author.send("You were banned from the bot testing server.");
    } else if (await devGuild.members.cache.get(msg.author.id)) {
      return msg.author.send("You're already in the server!");
    } else {
      const invite = await devGuild.channels.cache.get('793314668919521321').createInvite({ maxUses: 1 });
      msg.author.send("Welcome to the Bobby Bot Testing Server! \n 🤫 Let others find their way in. Don't tell them how!\n" + invite.url);
    }
  }
})
.addCommand({ name: "send",
  category: "Owner",
  onlyOwner: true,
  description: "Sends stuff to a specific channel",
  process: async (msg, suffix) => {
    if (!suffix) return msg.channel.send("what are you thinking, dummy? give me some args");
    const id = suffix.split(' ')[0];
    let content = suffix.split(' ').slice(1).join(' ');
    if (!id || id.replace(/[0-9]/g, '').length > 0) return msg.channel.send("need id");
    if (!content) return msg.channel.send("need content");
    if (!msg.client.users.cache.get(id)) return msg.channel.send('bad id');
    if (msg.attachments.size > 0) content = (content, { files: [msg.attachments.first().url] });
    msg.client.users.cache.get(id).send(content);
  }
})
.addCommand({ name: "servers",
  category: "Owner",
  onlyOwner: true,
  description: "Gets the number of servers the bot is in",
  process: async (msg) => {
    const getGuilds = msg.client.guilds.cache?.map(g => `${g.name}`).join("\n");
    const embed = u.embed()
            .setTitle(`I am in the following \`${msg.client.guilds.cache.map(r => r).length}\` servers:`)
            .setDescription(`**${getGuilds}**`);
    if (!getGuilds) return msg.channel.send("I'm not in any servers... somehow").then(u.clean);
    else return msg.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  }
})
.addCommand({ name: "commands",
  category: "Owner",
  onlyOwner: true,
  description: "Number of commands",
  process: async (msg, suffix) => {
    msg.channel.send(`There are \`${msg.client.commands.size}\` commands${(suffix.toLowerCase() == 'list') ? `\n${msg.client.commands.map(e => e.name).join('\n')}` : ''}`);
  }
})
.addCommand({ name: 'spam',
  onlyOwner: true,
  description: 'spam pings for when you really need it',
  process: async (msg, args) => {
    setInterval(() => {
      msg.channel.send(`<@${args || '307641454606680064'}>`);
    }, 2000);
  }
})

// github stuff
.addCommand({ name: 'add',
  category: 'Owner',
  onlyOwner: true,
  description: 'Add files to the repo (step 1)',
  hidden: true,
  process: async (msg) => {

    runCommand(msg, spawn('git', ['add', '.'], { cwd: process.cwd() }));
  }
})
.addCommand({ name: 'commit',
  category: 'Owner',
  onlyOwner: true,
  description: 'Commit files to the repo (step 2)',
  hidden: true,
  process: async (msg, suffix) => {
    if (!suffix) msg.channel.send("I need a commit message");
    const files = suffix.split('|');
    if (files[1]) runCommand(msg, spawn('git', ['commit', files[0], '-m', `${files[1]}`]));
    else runCommand(msg, spawn('git', ['commit', `-m`, `${suffix}`], { cwd: process.cwd() }));
  }
})
.addCommand({ name: "push",
  category: 'Owner',
  onlyOwner: true,
  description: "Push bot updates to the git (step 3)",
  hidden: true,
  process: async (msg) => {

    runCommand(msg, spawn('git', ['push'], { cwd: process.cwd() }));
  }
})
.addCommand({ name: "pull",
  category: "Owner",
  onlyOwner: true,
  description: "Pull bot updates from git",
  hidden: true,
  process: (msg) => {

    runCommand(msg, spawn('git', ['pull'], { cwd: process.cwd() }));
  },
})

// maintenance
.addCommand({ name: "reload",
  category: "Bot Admin",
  hidden: true,
  onlyOwner: true,
  syntax: "[file1.js] [file2.js]",
  description: "Reload command files.",
  info: "Use the command without a suffix to reload all command files.\n\nUse the command with the module name (including the `.js`) to reload a specific file.",
  process: (msg, suffix) => {
    u.clean(msg);
    const files = (suffix ? suffix.split(" ") : fs.readdirSync(path.resolve(__dirname)).filter(file => file.endsWith(".js")));

    for (const file of files) {
      try {
        msg.client.moduleHandler.reload(path.resolve(__dirname, file));
      } catch (error) { msg.client.errorHandler(error, msg); }
    }
    msg.react("👌");
  },
})
.addCommand({ name: "reloadlib",
  category: "Bot Admin",
  hidden: true,
  onlyOwner: true,
  syntax: "[file1.js] [file2.js]",
  description: "Reload local library files.",
  process: (msg, suffix) => {
    u.clean(msg);
    msg.react("👌");
    if (suffix) {
      const files = suffix.split(" ").filter(f => f.endsWith(".js"));
      for (const file of files) {
        delete require.cache[require.resolve(path.dirname(require.main.filename), file)];
      }
    } else {
      msg.reply("You need to tell me which libraries to reload!").then(u.clean);
    }
  },
})
.addCommand({ name: "gotobed",
  category: "Bot Admin",
  hidden: true,
  aliases: ["q", "restart"],
  onlyOwner: true,
  process: async function(msg) {
    try {
      await msg.react("🛏");

      const files = fs.readdirSync(path.resolve(process.cwd(), "./commands")).filter(f => f.endsWith(".js"));

      for (const file of files) {
        Module.client.moduleHandler.unload(path.resolve(process.cwd(), "./commands/", file));
      }

      if (msg.client.shard) {
        msg.client.shard.broadcastEval("this.destroy().then(() => process.exit())");
      } else {
        await msg.client.destroy();
        process.exit();
      }
    } catch (e) { u.errorHandler(e, msg); }
  }
})
.addCommand({ name: "ping",
  category: "Bot Admin",
  description: "Check bot ping.",
  hidden: true,
  process: (msg) => {
    msg.channel.send('Pinging...').then(sent => {
      sent.edit(`Pong! Took ${sent.createdTimestamp - (msg.editedTimestamp ? msg.editedTimestamp : msg.createdTimestamp)}ms`).then(u.clean);
    });
  }
})
.addCommand({ name: "pulse",
  category: "Bot Admin",
  hidden: true,
  onlyOwner: true,
  description: "Check the bot's heartbeat",
  process: async function(msg) {
    try {
      const client = msg.client;

      const embed = u.embed()
      .setAuthor({ name: client.user.username + " Heartbeat", iconURL: client.user.displayAvatarURL() }).setTimestamp();

      if (client.shard) {
        let guilds = await client.shard.fetchClientValues('guilds.cache.size');
        guilds = guilds.reduce((prev, val) => prev + val, 0);
        let channels = client.shard.fetchClientValues('channels.cache.size');
        channels = channels.reduce((prev, val) => prev + val, 0);
        let mem = client.shard.broadcastEval("Math.round(process.memoryUsage().rss / 1024 / 1000)");
        mem = mem.reduce((t, c) => t + c);
        embed.addFields([
          { name: "Shards", value: `Id: ${client.shard.id}\n(${client.shard.count} total)`, inline: true },
          { name: "Total Bot Reach", value: `${guilds} Servers\n${channels} Channels`, inline: true },
          { name: "Shard Uptime", value: `${Math.floor(client.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(client.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(client.uptime / (60 * 1000)) % 60} minutes`, inline: true },
          { name: "Shard Commands Used", value: `${client.commands.commandCount} (${(client.commands.commandCount / (client.uptime / (60 * 1000))).toFixed(2)}/min)`, inline: true },
          { name: "Total Memory", value: `${mem}MB`, inline: true }
        ]);

        msg.reply({ embeds: [embed] });
      } else {
        const uptime = process.uptime();
        embed.addFields([
          { name: "Uptime", value: `Discord: ${Math.floor(client.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(client.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(client.uptime / (60 * 1000)) % 60} minutes\nProcess: ${Math.floor(uptime / (24 * 60 * 60))} days, ${Math.floor(uptime / (60 * 60)) % 24} hours, ${Math.floor(uptime / (60)) % 60} minutes`, inline: true },
          { name: "Reach", value: `${client.guilds.cache.size} Servers\n${client.channels.cache.size} Channels\n${client.users.cache.size} Users`, inline: true },
          { name: "Commands Used", value: `${client.commands.commandCount} (${(client.commands.commandCount / (client.uptime / (60 * 1000))).toFixed(2)}/min)`, inline: true },
          { name: "Memory", value: `${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB`, inline: true }
        ]);

        msg.reply({ embeds: [embed] });
      }
    } catch (e) { u.errorHandler(e, msg); }
  }
})
.setInit(async () => {
  try {
    Module.client.emit("loadConfig");
  } catch (error) { u.errorHandler(error, "botAdmin Load"); }
})
// Add DBs on ready and create
.addEvent('ready', async () => {
  Module.client.user.setActivity("Bobbby's screams coming from the basement because i'm torturing him 🙂🎉", { type: "LISTENING" });
  let json = fs.readFileSync('config/config.json');
  json = JSON.parse(json);
  if (Module.client.commands.size != json.commands) {
    json.commands = Module.client.commands.size;
    fs.writeFileSync('config/config.json', JSON.stringify(json, null, 2));
  }
  for (const x of Module.client.guilds.cache.map(g => g.id)) {
    try {
      const foundGuild = await u.db.guildconfig.getConfig(x);
      if (!foundGuild) await u.db.guildconfig.createConfig(x, Module.client.commands);
    } catch (error) {
      u.errorHandler(error, 'Guild Config Create onReady');
    }
  }
})
.addEvent('guildCreate', async guild => {
  const foundGuild = await u.db.guildconfig.getConfig(guild.id);
  try {
    if (!foundGuild) await u.db.guildconfig.createConfig(guild.id, Module.client.commands);
  } catch (error) {
    u.errorHandler(error, 'Guild Join');
  }
});
module.exports = Module;