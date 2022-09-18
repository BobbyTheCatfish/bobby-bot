const Augur = require('augurbot'),
  u = require('../utils/utils'),
  nodemailer = require('nodemailer'),
  fs = require('fs'),
  path = require('path');

const Module = new Augur.Module();

async function owner(int) {
  switch (int.options.getSubcommand()) {
  case "activity": return activity();
  case "email": return email();
  case "send": return send();
  case "servers": return servers();
  case "reload": return reload();
  case "reload-lib": return reloadLib();
  case "gotobed": return gotobed();
  case "pulse": return pulse();
  case "commands": return int.reply({ content: `There are \`${int.client.commands.size}\` commands \n${int.client.commands.map(e => e.name).join('\n')}`, ephemeral: true });
  }
  async function activity() {
    const type = int.options.getString('type'); // [STREAMING, WATCHING, PLAYING, LISTENING, COMPETING]
    const name = int.options.getString('name');
    const status = int.options.getString('status');
    const url = int.options.getString('url') ?? type == '1' ? "https://twitch.tv/bobbydacatfish" : null;

    if (!type && !status) return int.reply({ content: "Nothing was changed...", ephemeral: true });
    if (type && !name) return int.reply({ content: "I need the name of the activity", ephemeral: true });
    if (type) int.client.user.setActivity({ name, type: Number.parseInt(type), url });
    if (status) int.client.user.setStatus(status);
    return int.reply({ content: "Changed", ephemeral: true });
  }
  async function email() {
    if (int.user.id != Module.config.ownerId) return int.reply({ content: "That's only usable by the owner", ephemeral: true });
    const addresses = [
      int.options.getString('address'),
      int.options.getString('cc1'),
      int.options.getString('cc2'),
      int.options.getString('cc3')
    ].filter(a => a != null && a.includes('@') && a.includes('.'));
    const attachment = int.options.getAttachment('file');

    if (addresses.length == 0) return int.reply({ content: "You need to give me at least one valid email address" });
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: Module.config.email.user,
        pass: Module.config.email.pass
      }
    });
    transporter.sendMail({
      from: `"Bobby Bot" <bobbybot@zohomail.com>`,
      to: addresses,
      subject: int.options.getString('subject'),
      html: int.options.getString('content'),
      attachments: attachment ? [{ filename: attachment.name, path: attachment.url }] : null
    });
    return int.reply({ content: "sent", ephemeral: true });
  }
  async function send() {
    const channel = int.options.getChannel('channel');
    const user = int.options.getUser('user');
    const content = int.options.getString('content');
    const file = int.options.getAttachment('file');
    if (!channel && !user) return int.reply({ content: "I need a channel or user" });
    if (!content && !file) return int.reply({ content: "nothing was sent...", ephemeral: true });
    if (!channel.isTextBased()) return int.reply({ content: "I need a text channel", ephemeral: true });
    await (user ?? channel).send({ content, files: file ? [file] : null });
    int.reply({ content: "Sent", ephemeral: true });
  }
  async function servers() {
    const guilds = int.client.guilds.cache.map(g => g.name);
    return int.reply({ embeds: [u.embed().setTitle(`I am in the following \`${guilds.length}\` servers:`).setDescription(guilds.join('\n'))], ephemeral: true });
  }
  async function reload() {
    const suffix = int.options.getString('file');
    const files = (suffix ? suffix.split(" ") : fs.readdirSync(path.resolve(__dirname)).filter(file => file.endsWith(".js")));

    for (const file of files) {
      try {
        int.client.moduleHandler.reload(path.resolve(__dirname, file));
      } catch (error) { u.errorHandler(error, int); }
    }
    int[int.replied ? 'followUp' : 'reply']({ content: "Reloaded", ephemeral: true });
  }
  async function reloadLib() {
    const suffix = int.options.getString('file-path');
    const files = suffix.split(" ").filter(f => f.endsWith(".js"));
    for (const file of files) {
      delete require.cache[require.resolve(path.dirname(require.main.filename), file)];
    }
    return int.reply({ content: "Reloaded", ephemeral: true });
  }
  async function gotobed() {
    try {
      await int.reply({ content: "🛏", ephemeral: true });

      const files = fs.readdirSync(path.resolve(process.cwd(), "./commands")).filter(f => f.endsWith(".js"));

      for (const file of files) {
        Module.client.moduleHandler.unload(path.resolve(process.cwd(), "./commands/", file));
      }

      if (int.client.shard) {
        int.client.shard.broadcastEval("this.destroy().then(() => process.exit())");
      } else {
        await int.client.destroy();
        process.exit();
      }
    } catch (e) { u.errorHandler(e, int); }
  }
  async function pulse() {
    try {
      const client = int.client;

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

        int.reply({ embeds: [embed] });
      } else {
        const uptime = process.uptime();
        embed.addFields([
          { name: "Uptime", value: `Discord: ${Math.floor(client.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(client.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(client.uptime / (60 * 1000)) % 60} minutes\nProcess: ${Math.floor(uptime / (24 * 60 * 60))} days, ${Math.floor(uptime / (60 * 60)) % 24} hours, ${Math.floor(uptime / (60)) % 60} minutes`, inline: true },
          { name: "Reach", value: `${client.guilds.cache.size} Servers\n${client.channels.cache.size} Channels\n${client.users.cache.size} Users`, inline: true },
          { name: "Commands Used", value: `${client.commands.commandCount} (${(client.commands.commandCount / (client.uptime / (60 * 1000))).toFixed(2)}/min)`, inline: true },
          { name: "Memory", value: `${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB`, inline: true }
        ]);

        int.reply({ embeds: [embed] });
      }
    } catch (e) { u.errorHandler(e, int); }
  }
}

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
.addCommand({ name: 'spam',
  onlyOwner: true,
  description: 'spam pings for when you really need it',
  process: async (msg, args) => {
    setInterval(() => {
      msg.channel.send(`<@${args || '307641454606680064'}>`);
    }, 2000);
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
.addInteractionCommand({ name: "devServerOwner",
  commandId: "1012186949513121844",
  permissions: (int) => Module.config.adminIds.includes(int.user.id),
  process: async (int) => {
    owner(int);
  }
})
.addInteractionCommand({ name: "mainServerOwner",
  commandId: "1014258053312413806",
  permissions: (int) => Module.config.adminIds.includes(int.user.id),
  process: async (int) => {
    owner(int);
  }
})
// Add DBs on ready and create
.addEvent('ready', async () => {
  const json = JSON.parse(fs.readFileSync('config/config.json'));
  if (Module.client.commands.size != json.commands) {
    json.commands = Module.client.commands.size;
    fs.writeFileSync('config/config.json', JSON.stringify(json, null, 2));
  }
  for (const x of Module.client.guilds.cache.map(g => g.id)) {
    try {
      const foundGuild = await u.db.guildConfig.config.get(x);
      if (!foundGuild) await u.db.guildConfig.config.create(x);
    } catch (error) {
      u.errorHandler(error, 'Guild Config Create onReady');
    }
  }
})
.addEvent('guildCreate', async guild => {
  try {
    await u.db.guildConfig.config.create(guild.id);
  } catch (error) {
    u.errorHandler(error, 'Guild Join DB Creation');
  }
});
module.exports = Module;