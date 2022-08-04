const Augur = require('augurbot'),
  u = require('../utils/utils'),
  // tesseract = require('node-tesseract-ocr'),
  // validUrl = require('valid-url'),
  // jimp = require('jimp'),
  // config = { oem: 0, psm: 3 },
  // Discord = require('discord.js'),
  { MessageReaction } = require('discord.js');

const Module = new Augur.Module();
const logChannel = null;
Module
.addCommand({ name: 'emoji',
  description: 'Tool for managing server emojis',
  category: 'Mod',
  memberPermissions: ['MANAGE_EMOJIS_AND_STICKERS'],
  onlyGuild: true,
  process: async (msg, suffix) => {
    const validName = 'You need to specify a valid name for the emoji';
    const validLink = 'You need to upload a picture or paste a valid link.';
    const words = suffix?.toLowerCase().split(' ');
    const cmd = words[0];

    if (['add', 'create'].includes(cmd)) {
      const image = msg.attachments.first()?.url ?? words[1];
      if (!image || !await u.validImage(image)) return msg.reply(validLink);
      let name = words[1];
      if (!msg.attachments.first()) name = words[2];
      if (!name) return msg.reply(validName);
      try {
        const emoji = await msg.guild.emojis.create(image, name);
        if (logChannel && msg.channel != logChannel) u.modEvent('emojiCreate', msg.member, emoji);
        return msg.reply(`\`:${emoji.name}:\` was successfully added!`);
      } catch {
        return msg.reply("I couldn't use that image (it was probably too big)").then(u.clean);
      }
    } else if (['remove', 'delete'].includes(cmd)) {
      const emoji = msg.guild.emojis.cache.find(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` == words[1]);
      if (!emoji) return msg.reply("I need a valid emoji from this server.");
      emoji.delete().catch(() => {
        return msg.reply("I wasn't able to delete that emoji. (Do I have the needed perms?)");
      });
      if (logChannel && msg.channel != logChannel) u.modEvent('emojiDelete', msg.member, emoji);
      return msg.reply(`\`${emoji.name}\` was successfully removed!`);
    } else if (['rename', 'edit'].includes(cmd)) {
      const emoji = msg.guild.emojis.cache.find(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` == words[1] || e.name == words[1]);
      if (!emoji) return msg.channel.send('You need to specify which emoji to rename');
      if (!words[2]) return msg.channel.send('You need to specify what you want to rename it to');
      emoji.setName(words[2]).catch(() => {
        return msg.reply("I wasn't able to rename that emoji. (Do I have the needed perms?)");
      });
      if (logChannel && msg.channel != logChannel) u.modEvent('emojiUpdate', msg.member, emoji, msg.guild.emojis.cache.get(emoji.id));
      return msg.reply(`\`:${emoji}:\` was successfully renamed to \`${msg.guild.emojis.cache.get(emoji.id)}\``);
    } else if (['steal', 'copy'].includes(cmd)) {
      let image = u.getEmoji(words[1]);
      const link = `https://cdn.discordapp.com/emojis/${words[1]}`;
      if (!image) {
        const extension = await u.validImage(`${link}.gif`) ? `${link}.gif` : await u.validImage(`${link}.png`) ? `${link}.png` : null;
        if (extension && !words[2]) return msg.reply("I need a name for the emoji");
        if (extension) image = { link: extension, name: words[2] };
      }
      if (!image || !await u.validImage(image.link)) return msg.reply("That's not a valid emoji!");
      try {
        const emoji = await msg.guild.emojis.create(image.link, image.name);
        if (logChannel && msg.channel != logChannel) u.modEvent('emojiCreate', msg.member, emoji);
        return msg.reply(`\`:${emoji.name}:\` was successfully added!`);
      } catch {
        return msg.reply("I had a problem creating the emoji").then(u.clean);
      }
    }
    return msg.reply("That's an invalid action. Valid actions are `create`, `remove`, `steal`, and `rename`.");
  }
})
.addCommand({ name: 'say',
  description: `Repeats after you`,
  category: 'Mod',
  onlyGuild: true,
  process: async (msg, suffix) => {
    if (msg.author.id == '337713155801350146' || (msg.member.permissions.has("ADMINISTRATOR"))) {
      if (!suffix && !msg.attachments.size > 0) {
        try {
          msg.author.send("You need to tell me what to say!");
        } catch (error) {
          msg.channel.send("I tried to send you a DM with information, but it looks like you have DMs turned off!").then(u.clean);
        }
      }
      let content = suffix;
      if (msg.attachments.size > 0) content = (suffix, { files: [msg.attachments.first().url] });
      try {
        msg.channel.send(content);
        return setTimeout(() => msg.delete(), 500);
      } catch (error) {msg.channel.send("I couldn't delete your message");}
    }
    if (msg.content.includes('no.')) return msg.channel.send('I refuse.');
    return msg.channel.send('no.');
  }
})
.addCommand({ name: 'prefix',
  description: `Changes the server prefix`,
  category: 'Mod',
  onlyGuild: true,
  permissions: (msg) => msg.author.id == '337713155801350146' || (msg.member && msg.member.permissions.has("ADMINISTRATOR")),
  process: async (msg, suffix) => {
    const read = await u.db.guildConfig.prefix.get(msg.guild.id);
    if (suffix == read) return msg.channel.send(`The prefix is already \`${suffix}\``);
    if (!suffix) return msg.channel.send(`The prefix is \`${read}\``).then(u.clean);
    if (suffix.length > 3) return msg.reply("you cannot have a prefix of more than 3 characters.").then(u.clean);
    const newPrefix = await u.db.guildConfig.prefix.save(msg.guild.id, suffix);
    return msg.channel.send(`Changed the prefix to \`${newPrefix.prefix}\``).then(u.clean);
  }
})
.addEvent('messageReactionAdd', /** @param {MessageReaction} reaction @param {User} user*/ async (reaction, user) => {
  try {
    if (!reaction.message.guild) return;
    const member = reaction.message.guild.members.cache.get(user.id);
    if (['📌', '📍', '🧷'].includes(reaction.emoji.name) && member.permissions.has('MANAGE_MESSAGES') && reaction.message.pinnable) {
      const messages = await reaction.message.channel.messages.fetchPinned().catch(u.noop);
      if (messages.size == 50) return reaction.message.channel.send("You've reached the max number of pins for this channel. Please unpin something else if you want to pin this.");
      else await reaction.message.pin();
      u.emit('messagePin', reaction.message, member);
    }
  } catch (error) {
    reaction.message.channel.send(`Coudln't pin that post because: ${error}`);
    u.errorHandler(error, reaction.message.content);
  }
});
module.exports = Module;