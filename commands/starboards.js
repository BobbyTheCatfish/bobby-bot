const Augur = require('augurbot'),
  u = require('../utils/utils');

const Module = new Augur.Module();

const starboards = async (msg) => await u.db.guildconfig.getStarBoards(msg.guild.id);

const postToBoard = async (reaction, user, force = false) => {
  const msg = reaction.message;
  const guildBoards = await starboards(msg);
  if (guildBoards?.length > 0) {
    if (!guildBoards.includes({ channel: msg.channel.id })) {
      for (const x of guildBoards) {
        if (!x.reactions.includes(reaction.emoji.name) && !x.reactions.includes(reaction.emoji.id) && !(x.main && force)) continue;
        else if (x.singleChannel && msg.channel.id != x.singleChannel && !force) continue;
        if (reaction.count == x.toStar || force) {
          const channel = msg.guild.channels.cache.get(x.channel);
          const embed = u.embed().setDescription(msg.content);
          if (msg.attachments.first()) embed.setImage(msg.attachments.first().url);
          embed.addField('Channel', msg.channel).addField('Jump to post', msg.url).setTimestamp(msg.createdAt).setAuthor(msg.member.displayName, msg.author.avatarURL()).setFooter(reaction.emoji.name);
          if (channel) {
            channel.send({ embeds: [embed] });
            // u.db.guildconfig.saveSBMessage(msg)
          } else {u.errorHandler(`Starboard Send Error`, `Couldn't send to channel *${x.channel}* in guild *${msg.guild.name}*`);}
        }
      }
    }
  }
};

Module.addEvent('messageReactionAdd', async (reaction, user) => {
  if (!reaction.message?.author.bot) {
    if (!user.bot) {
      if (reaction.message.guild) {
        if (reaction.message.createdTimestamp > (Date.now() - 3 * 24 * 60 * 60000)) {
          const member = reaction.message.guild.members.cache.get(user.id);
          if (member.permissions.has('MANAGE_GUILD') && reaction.emoji.name == '🌟') return await postToBoard(reaction, member, true);
          else await postToBoard(reaction, user);
        }
      }
    }
  }
});

module.exports = Module;