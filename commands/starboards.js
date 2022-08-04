const Augur = require('augurbot'),
  u = require('../utils/utils'),
  discord = require('discord.js'),
  schedule = require('node-schedule');

const Module = new Augur.Module();
/**
 * @param {discord.MessageReaction} reaction
 * @param {discord.Message} msg
 */
const time = 5 * 24 * 60 * 60 * 1000;
const postToBoard = async (reaction, msg) => {
  try {
    const emoji = reaction.emoji.id ?? reaction.emoji.name;
    if (!await u.db.guildConfig.starboards.getMsg(msg.guild.id, msg.id)) {
      const guildBoards = await u.db.guildConfig.starboards.get(msg.guild.id);
      if (guildBoards?.length > 0 && !guildBoards.find(b => b.channel == msg.channel.id)) {
        const correctBoard = guildBoards.find(b => b.reactions.includes(emoji) ?? b.whitelist == msg.channel.id);
        if (correctBoard && correctBoard.toPost <= reaction.users.cache.size) {
          const channel = msg.guild.channels.cache.get(correctBoard.channel);
          const embed = u.embed().setDescription(msg.content)
          .addFields([
            { name: 'Channel', value: `${msg.channel}` },
            { name: 'Jump to post', value: `[Original Message](${msg.url})` }
          ])
          .setTimestamp(msg.createdAt)
          .setAuthor({ name: msg.member.displayName, iconURL: msg.member.avatarURL() })
          .setFooter({ text: reaction.emoji.name });
          if (msg.attachments.first()) embed.setImage(msg.attachments.first().url);
          if (channel) {
            channel.send({ embeds: [embed] });
            u.db.guildConfig.starboards.saveMsg(msg.guild.id, msg);
          } else {u.errorHandler(new Error(`Starboard Send Error`), `Couldn't send to channel *${correctBoard.channel}* in guild *${msg.guild.name}*`);}
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};

Module.addEvent('messageReactionAdd', async (reaction, user) => {
  const msg = await reaction.message.fetch();
  if (!msg?.author.bot && !user.bot && msg.guild && msg.createdTimestamp > (Date.now() - time)) {
    await postToBoard(reaction, msg);
  }
})
.addEvent('ready', async () => {
  const rule = new schedule.RecurrenceRule();
  rule.hour = 0;
  rule.minute = 0;
  schedule.scheduleJob(rule, async function() {
    const msgs = await u.db.guildConfig.starboards.getAllMsgs();
    if (msgs.length > 0) {
      for (const x of msgs) {
        const remove = x.msgs.filter(m => m.createdTimestamp < Date.now() - time);
        await u.db.guildConfig.starboards.cullMsgs(x.guild, remove.map(r => r.id));
      }
    }
  });
});

module.exports = Module;