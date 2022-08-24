const Augur = require('augurbot'),
  u = require('../utils/utils');

const Module = new Augur.Module();
Module.addEvent('messageCreate', async (msg) => {
  if (!msg.author.bot && !msg.author.system) {
    const { tags } = u.db;
    const parsed = await u.parse(msg);
    if (parsed && msg.guild) {
      const read = await tags.getTag(msg.guildId, parsed.command.toLowerCase());
      const localTag = read ?? false;
      if (read && !(!localTag && msg.client.commands.has(read.name))) {
        let replaceContent = read.text;
        if (replaceContent) {
          const regex = /<@rand ?\[(.*?)\]>/gm;
          if (regex.test(replaceContent)) {
            const replace = (str) => u.rand(str.replace(regex, '$1').split('|'));
            replaceContent = replaceContent.replace(regex, replace);
          }
          replaceContent = replaceContent.replace(/<@author>/ig, msg.author).replace(/<@authorname>/ig, msg.member.displayName);
          if ((/(<@target>)|(<@targetname>)/i).test(read.text)) {
            if (msg.mentions.members.first()) replaceContent = replaceContent.replace(/<@target>/ig, msg.mentions.members.first()).replace(/<@targetname>/ig, msg.mentions.members.first().displayName);
            else return msg.reply("You need to `@mention` a user with that tag!").then(u.clean);
          }
          if ((/<content>/i).test(read.text)) {
            const args = parsed.suffix;
            if (args) replaceContent = replaceContent.replace(/<content>/ig, args);
            else return msg.reply("You need to give me some text to work with").then(u.clean);
          }
        }
        if (read.file && read.text) return msg.channel.send({ content: replaceContent, files: [read.file] });
        else if (read.text) return msg.channel.send(replaceContent);
        else return msg.reply({ files: [read.file] });
      }
    }
  }
})
.addCommand({ name: 'tag',
  onlyGuild: true,
  memberPermissions: ['ADMINISTRATOR'],
  process: async (msg, args) => {
    if (!(msg.member.permissions.has('ADMINISTRATOR') || msg.author.id == Module.config.ownerId)) return;
    if (!args) return msg.channel.send("What tag do you want to create/modify?");
    const cmd = args.toLowerCase().split(' ')[0];
    if (!await u.db.tags.globalStatus(msg.guild.id) && ['tag', 'tags'].includes(cmd)) return msg.reply("You can't replace the tag command.").then(u.clean);
    if (!args.split(' ')[1] && msg.attachments.size == 0) {
      if (await u.db.tags.getTag(msg.guildId, cmd)) {
        await u.db.tags.removeTag(msg.guildId, cmd);
        return await msg.react('🗑️');
      } else {return msg.reply("That tag doesn't exist.").then(u.clean);}
    }
    if (msg.attachments.first()?.size >= 8000000) return msg.channel.send("That file is too large.").then(u.clean);
    await u.db.tags.saveTag(msg.guildId, cmd, args.split(' ').slice(1).join(' '), msg.attachments.first() ? msg.attachments.first().url : null);
    return await msg.react('👍');
  }
})
.addCommand({ name: 'tags',
  onlyGuild: true,
  process: async (msg, args) => {
    const tags = await u.db.tags.getAllTags(msg.guild.id);
    if (args.toLowerCase() == 'global' && ((msg.member && msg.member.permissions.has('ADMINISTRATOR') || msg.author.id == Module.config.ownerId))) {
      if (!await u.db.tags.globalStatus(msg.guild.id)) {
        const promptEmbed = u.embed().setTitle('Are you sure you want to go global?').setDescription("You'll still have access to all your current tags, but other servers will have them too");
        const confirmEmbed = u.embed().setTitle("You've gone global!").setDescription("You now have access to all the other global server's tags!");
        const cancelEmbed = u.embed().setTitle("Global tags left disabled");
        const decision = await u.confirmEmbed(msg, promptEmbed, confirmEmbed, cancelEmbed);
        if (decision == true) return await u.db.tags.setGlobal(msg.guild.id, true);
        else return;
      } else {
        const promptEmbed = u.embed().setTitle("Are you sure you want to disable global tags?"),
          confirmEmbed = u.embed().setTitle("Global tags disabled"),
          cancelEmbed = u.embed().setTitle("Global tags left enabled"),
          decision = await u.confirmEmbed(msg, promptEmbed, confirmEmbed, cancelEmbed);
        if (decision == true) return await u.db.tags.setLocal(msg.guild.id, false);
        else return;
      }
    } else if (await u.db.tags.globalStatus(msg.guild.id)) {
      const gtags = await u.db.tags.getAllGlobalTags(msg.guild.id);
      if (gtags?.length < 1) return msg.reply("Looks like there aren't any global tags");
      const map = gtags.map(t => t.name);
      msg.author.send(`The following are all the global tags:\n${map.join('\n')}`);
      return await msg.react('👌');
    } else if (!tags) {return msg.channel.send('Looks like this server doesn\'t have any tags.');}
    return msg.channel.send(tags.map(t => t.name).join('\n'));
  }
});

module.exports = Module;