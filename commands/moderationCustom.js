const Augur = require('augurbot'),
  u = require('../utils/utils'),
  lang = require('../jsons/badwords.json'),
  sites = require('../jsons/blockedsites.json'),
  mU = require('../utils/modUtils');
const Module = new Augur.Module();
const r = {
  guild: '408747484710436877',
  logChannel: '987892109145169970',
  modCategory: '728723188682457088',
  muteChannel: '959875038423695491',
  muted: '713820156844834836',
  trusted: '988546556632399912',
  trustPlus: '988549111957585950',
  untrusted: '990387440017608704',
  mods: '425039849540812800'
};
// testing server
// const t = {
//   guild: '406821751905976320',
//   logChannel: '993929866451894333',
//   muteChannel: '993929904892686436',
//   muted: '989330053265522740',
//   trusted: '990452331210506280',
//   trustPlus: '990452365217906784',
//   untrusted: '990452401821614120',
//   mods: '470368495771844639'
// };
const modal = u.modal().addComponents([
  u.actionRow().addComponents(u.textInput({ customId: 'reason', label: 'Reason', style: 'SHORT' })),
  u.actionRow().addComponents(u.textInput({ customId: 'info', label: 'Additional Info', style: 'PARAGRAPH' }))
]);
function harshFilter(str) {
  return lang.find(l => str.includes(l));
}
function siteFilter(str) {
  for (const category in sites) {
    const site = sites[category].find(c => str.includes(c));
    if (site) return { category, site };
  }
}
const { logChannel, muteChannel, muted, trusted, trustPlus, untrusted, mods, guild, modCategory } = r;
Module.addInteractionCommand({ name: 'mod',
  commandId: '998632048057139304',
  process: async (int) => {
    const command = int.options.getSubcommand();
    const logs = int.client.channels.cache.get(logChannel);
    const mutes = int.client.channels.cache.get(muteChannel);
    const modUtil = new mU(int, logs);
    switch (command) {
    case "ban": return modUtil.ban(untrusted);
    case "clear": return modUtil.clear();
    case "disconnect-vc": return modUtil.dcAll();
    case "kick": return modUtil.kick(untrusted);
    case "mute": return modUtil.mute(muted, mutes);
    case "mute-vc": return modUtil.muteVC();
    case "nick": return modUtil.rename();
    case "note": return modUtil.note();
    case "unmute": return modUtil.mute(muted, mutes, true);
    case "unmute-vc": return modUtil.muteVC(true);
    case "untrust": return modUtil.trust(trusted, untrusted, true);
    case "untrust-plus": return modUtil.trustPlus(trusted, untrusted, true);
    case "slowmode": return modUtil.slowmode();
    case "timeout": return modUtil.timeout();
    case "trust": return modUtil.trust(trusted, untrusted);
    case "trust-plus": return modUtil.trustPlus(trusted, trustPlus);
    case "user-info": return modUtil.info(muted, trusted, trustPlus, untrusted);
    case "warn": return modUtil.warn();
    case "watch": return modUtil.watch(untrusted);
    }
  }
})
.addInteractionCommand({ name: "userMod",
  commandId: "998632048057139303",
  process: async (int) => {
    if (!int.isApplicationCommand()) return;
    const target = int.targetMember;
    const logs = int.guild.channels.cache.get(logChannel);
    const mute = int.guild.channels.cache.get(muteChannel);
    const options = [
      { label: "Mute", value: "mute", description: "Give the user the muted role", emoji: "🔇" },
      { label: "Unmute", value: "unmute", description: "Remove the user from the muted role", emoji: "🔊" },
      { label: "Timeout", value: "timeout", description: "Time out the user for 10 minutes", emoji: "⏰" },
      { label: "Trust", value: "trust", description: "Give the user the trusted role", emoji: "✅" },
      { label: "Untrust", value: "untrust", description: "Remove the user from the trusted role", emoji: "❌" },
      { label: "Trust+", value: "trustplus", description: "Give the user the trusted+ role", emoji: "🎥" },
      { label: "Untrust+", value: "untrustplus", description: "Remove the user from the trusted+ role", emoji: "🎙️" },
      { label: "Watch", value: "watch", description: "Give the user the untrusted role", emoji: "👀" },
      { label: "Unwatch", value: "unwatch", description: "Remove the user from the untrusted role", emoji: "🙈" },
      { label: "Warn", value: "warn", description: "Send the user a warning", emoji: "⚠️" },
      { label: "Info", value: "info", description: "Get info about the user", emoji: "ℹ️" }
    ];
    const menu = u.selectMenu().setCustomId(int.id).addOptions(options).setPlaceholder("What do you want to do?").setMaxValues(1).setMinValues(1);
    const prompt = u.actionRow().addComponents(menu);
    await int.reply({ components: [prompt], ephemeral: true });
    const intFilter = i => i.customId == int.id;
    const response = await int.channel.awaitMessageComponent({ time: 5 * 60 * 1000, componentType: 'SELECT_MENU', filter: intFilter }).catch(() => u.noop());
    const modUtils = new mU(int, logs);
    if (response) {
      await int.editReply({ content: "Hang on a second...", components: [] });
      switch (response.values[0]) {
      case 'mute': return await modUtils.mute(muted, mute, false, target);
      case 'timeout': return await modUtils.timeout(target);
      case 'trust': return await modUtils.trust(trusted, untrusted, false, target);
      case 'trustplus': return await modUtils.trustPlus(trusted, trustPlus, false, target);
      case 'watch': return await modUtils.watch(trusted, untrusted, target, false, false);
      case 'unwatch': return await modUtils.watch(trusted, untrusted, target, true, false);
      case 'untrust': return await modUtils.trust(trusted, untrusted, true, target);
      case 'untrustplus': return await modUtils.trustPlus(trusted, trustPlus, true, target);
      case 'unmute': return await modUtils.mute(muted, mute, true, target);
      case 'warn': return await modUtils.warn(5, target);
      case 'info': return await modUtils.info(muted, trusted, trustPlus, untrusted, target);
      }
    }
  }
})
.addInteractionCommand({ name: "report",
  commandId: "998632048057139301",
  process: async (int) => {
    const msg = int.targetMessage;
    const logs = msg.guild.channels.cache.get(logChannel);
    const mute = msg.guild.roles.cache.get(muted);
    const mode = modal.setCustomId('report').setTitle("Report (Won't delete or mute)");
    await int.showModal(mode);
    const result = await int.awaitModalSubmit({ time: 5 * 60 * 1000 });
    let reason, info;
    if (result) {
      reason = result.fields.getTextInputValue('reason');
      info = result.fields.getTextInputValue('info');
    }
    const flag = {
      msg,
      pingMods: false,
      snitch: int.member,
      flagReason: reason ?? null,
      furtherInfo: info ?? null,
      muted: mute,
      logs,
      mods: msg.guild.roles.cache.get(mods),
      muteChannel: msg.guild.channels.cache.get(muteChannel),
      member: msg.member
    };
    await result.reply({ content: `Message flagged. Check ${logs} to see the flag`, ephemeral: true });
    return await new mU().createFlag(flag);
  }
})
.addInteractionCommand({ name: "harshReport",
  commandId: "998632048057139302",
  process: async (int) => {
    if (!int.isMessageContextMenu()) return;
    const msg = int.targetMessage;
    const logs = msg.guild.channels.cache.get(logChannel);
    const mute = msg.guild.roles.cache.get(muted);
    const mode = modal.setCustomId('harshReport').setTitle("Harsh Report (Deletes and mutes)");
    await int.showModal(mode);
    const result = await int.awaitModalSubmit({ time: 5 * 60 * 1000 });
    let reason, info;
    if (result) {
      reason = result.fields.getTextInputValue('reason');
      info = result.fields.getTextInputValue('info');
    }
    const flag = {
      msg,
      pingMods: true,
      snitch: int.member,
      flagReason: reason ?? null,
      furtherInfo: info ?? null,
      muted: mute,
      logs,
      mods: msg.guild.roles.cache.get(mods),
      muteChannel: msg.guild.channels.cache.get(muteChannel),
      member: msg.member
    };
    await result.reply({ content: `Message flagged. Check ${logs} to see the flag`, ephemeral: true });
    return await new mU().createFlag(flag);
  }
})
// Card buttons
.addEvent('interactionCreate', async int => {
  const ids = int.customId?.split('.') ?? [];
  const cmd = ids[0];
  const userId = ids[1];
  if (!int.user.bot && int.isButton() && int.message.author.id == int.client.user.id && int.message.channel.id == logChannel) {
    const user = int.guild.members.cache.get(int.customId.replace(/[^0-9]/g, ''));
    const logs = int.client.channels.cache.get(logChannel);
    const modUtil = new mU(int, logs);
    switch (cmd) {
    case 'mCClear': return await clear();
    case 'mCVerbal': return await verbal(0);
    case 'mCMinor': return await verbal(10);
    case 'mCMajor': return await verbal(20);
    case 'mCMute': return await mute();
    case 'mCTimeout': return await timeout();
    case 'mCInfo': return await modUtil.info(muted, trusted, trustPlus, untrusted, user, int);
    case 'mCLink': return await discuss();
    }
  }
  // p much the same as the regular functions in modUtils but it doesn't log the action
  async function clear() {
    const card = await int.channel.messages.fetch(int.message.id);
    const logs = int.guild.channels.cache.get(logChannel);
    const user = int.guild.members.cache.get(userId);
    const modUtil = new mU(int, logs);
    if (userId == int.user.id) return int.reply({ content: "You can't clear your own flag!", ephemeral: true });

    const additionalFields = [{ name: "Mute Status", value: "Now Unmuted", inline: true }];
    let content = await modUtil.resolveFlag(user, user.id, int.member, card, "Cleared", int.label == "Unmute" ? additionalFields : []);
    if (card.hasThread) await card.thread.setArchived(true, 'Resolved').catch(() => u.noop());
    if (int.label == 'Unmute') {
      if (!user.roles.cache.has(muted)) content += "\nThey weren't muted, but I've resolved it anyways.";
      else await user.roles.remove(muted).catch(() => content += "\nI wasn't able to unmute them, but I've resolved it anyways. You'll have to unmute them manually");
    }
    await int.reply({ content, ephemeral: true });
  }
  async function verbal(points) {
    const card = await int.channel.messages.fetch(int.message.id);
    const infraction = await u.db.infraction.getByFlag(int.guild.id, int.message.id);
    const logs = int.guild.channels.cache.get(logChannel);
    const user = int.guild.members.cache.get(userId);
    let msg = '';
    switch (points) {
    case 10: msg = "‼️ The following message was found to be a minor violation of the rules of this server. It may be deleted at the discretion of the moderators.\nThis is only a warning, but further behavior like this may result in more strict punishments. Please contact a mod if you have any questions"; break;
    case 20: msg = "🛑 The following message was found to be a severe violation of the rules of this server and was deleted.\nIf you keep failing to follow the rules, you may end up muted, kicked, or banned. Please contact a mod if you have any questions"; break;
    default: msg = "⚠️ The following message was found to be a slight violation of the rules of this server. It may be deleted at the discretion of the moderators.\nThis isn't anything serious, but please be a bit more careful. Please contact a mod if you have any questions"; break;
    }
    const modUtil = new mU(int, logs);
    const ogMessage = await int.guild.channels.cache.get(infraction.channel)?.messages.fetch(infraction.message);
    const additionalFields = [{ name: "Infraction Value", value: `${points} Points` }];
    const embed = u.embed().setTitle(`Warning from ${int.guild.name}`)
      .setDescription(msg)
      .addField("Message", ogMessage.content ?? "No Message Content")
      .setImage(ogMessage.attachments.first()?.url);
    await ogMessage.author.send({ embeds: [embed] }).catch(() => u.blocked(user, logs, `They were too busy getting an infraction for ${points} points (someone might want to tell them about that)`));
    await modUtil.resolveFlag(user, user.id, int.member, card, "Warned", additionalFields);
  }
  async function mute() {
    const card = await int.channel.messages.fetch(int.message.id);
    const logs = int.guild.channels.cache.get(logChannel);
    const user = int.guild.members.cache.get(userId);
    const modUtil = new mU(int, logs);
    const muteC = int.client.channels.cache.get(muteChannel);
    let content = await modUtil.resolveFlag(user, user.id, int.member, card, "Muted", int.label == "Unmute");
    if (card.hasThread) await card.thread.setArchived(true, 'Resolved').catch(() => u.noop());
    if (user.roles.cache.has(muted)) content += "\nThey were already muted, but I've resolved it anyways.";
    else await user.roles.add(muted).catch(() => content += "\nI wasn't able to mute them, but I've resolved it anyways. You'll have to mute them manually");
    if (user.roles.cache.has(muted)) {
      await muteC.send(
        `${user}, you have been muted in ${int.guild.name}. `
      + 'Please review the rules channel. '
      + 'A member of the mod team will be available soon to discuss more details.'
      );
    }
  }
  async function timeout() {
    const card = await int.channel.messages.fetch(int.message.id);
    const logs = int.guild.channels.cache.get(logChannel);
    const user = int.guild.members.cache.get(userId);
    const modUtil = new mU(int, logs);

    let content = await modUtil.resolveFlag(user, user.id, int.member, card, "Timed Out");
    if (card.hasThread) await card.thread.setArchived(true, 'Resolved').catch(() => u.noop());
    await user.timeout(5 * 60 * 1000).catch(() => content += "\nThey weren't timed out, but I've resolved it anyways. You'll have to do it manually.");
    await int.reply({ content, ephemeral: true });
  }
  async function discuss() {
    const card = await int.channel.messages.fetch(int.message.id);
    const savedCard = await u.db.infraction.getByFlag(int.guild.id, card.id);
    const content = `Thread ${!card.hasThread ? "Created" : card.thread.archived ? 'Unarchived' : 'Archived'}`;
    if (card.hasThread) await card.thread.setArchived(!card.thread.archived);
    else await card.startThread({ name: `${savedCard.message ?? card.id}`, reason: `Thread for card ${card.id}` });
    return await int.reply({ content, ephemeral: true });
  }
})

// AUTO MOD
.addEvent('messageCreate', async (msg) => {
  // links
  if (msg.content && msg.guild?.id == guild && !msg.author.bot && msg.channel.parent?.id != modCategory) {
    const site = siteFilter(msg.content);
    if (site) {
      const matches = site.site;
      const ruleName = site.category;
      const logs = msg.guild.channels.cache.get(logChannel);
      const mute = msg.guild.roles.cache.get(muted);
      const flag = {
        msg,
        pingMods: false,
        snitch: null,
        flagReason: `Language Category \`${ruleName}\``,
        muted: mute,
        logs,
        mods: msg.guild.roles.cache.get(mods),
        muteChannel: msg.guild.channels.cache.get(muteChannel),
        member: msg.member,
        matches
      };
      await new mU().createFlag(flag);
      if (msg.deletable) return await msg.delete().catch(() => u.noop());
    }
  }

  if (msg.channel.id == logChannel && msg.embeds.length > 0 && !msg.author.bot && !msg.author.system) {
    const modMsg = msg.embeds[0];
    if (modMsg.type == 'auto_moderation_message') {
      msg.content = modMsg.description;
      msg.url = modMsg.fields.find(f => f.name == 'flagged_message_id');
      const matches = modMsg.fields.find(f => f.name == 'keyword_matched_content')?.value;
      const ruleName = modMsg.fields.find(f => f.name == 'rule_name')?.value;
      const harsh = harshFilter(msg.content);
      const logs = msg.guild.channels.cache.get(logChannel);
      const mute = msg.guild.roles.cache.get(muted);
      const flag = {
        msg,
        pingMods: harsh,
        snitch: null,
        flagReason: `AutoMod Rule \`${ruleName}\``,
        furtherInfo: `Rule: \`${modMsg.fields.find(f => f.name == 'keyword')?.value}\``,
        muted: mute,
        logs,
        mods: msg.guild.roles.cache.get(mods),
        muteChannel: msg.guild.channels.cache.get(muteChannel),
        member: msg.member,
        matches
      };
      await new mU().createFlag(flag);
      if (msg.deletable) return await msg.delete().catch(() => u.noop());
    }
  }
})

// Nick/activity filtering
.addEvent('userUpdate', async (oldUser, newUser) => {
  if (!oldUser.bot && !oldUser.system && oldUser.guild.id == guild) {
    if (oldUser.username != newUser.username) {
      if (harshFilter(newUser.username)) {
        const g = oldUser.client.guilds.cache.get(guild);
        const logs = oldUser.client.channels.cache.get(logChannel);
        await new mU(null, logs).sendLog("Language In Username",
          `${oldUser} (${newUser.username}) has possible language in their username.`,
          [{ name: "Old Username", value: oldUser.username, inline: true }, { name: "New Username", value: newUser.username, inline: true }],
          await g.members.fetch(newUser.id),
          newUser.username
        );
      }
    }
  }
})
.addEvent('guildMemberUpdate', async (oldMember, newMember) => {
  if (!oldMember.user.bot && !oldMember.user.system && newMember.guild.id == guild) {
    if (oldMember.nickname != newMember.nickname) {
      if (harshFilter(newMember.nickname)) {
        const logs = oldMember.client.channels.cache.get(logChannel);
        await new mU(null, logs).sendLog("Language In Nickname",
          `${oldMember} (${newMember.nickname}) has possible language in their nickname.`,
          [{ name: "Old Nick", value: oldMember.nickname, inline: true }, { name: "New Nick", value: newMember.nickname, inline: true }],
          newMember,
          newMember.nickname
        );
      }
    }
  }
})
.addEvent('presenceUpdate', async (oldPresence, newPresence) => {
  if (!oldPresence || !newPresence) return;
  if (!oldPresence?.user?.bot && !oldPresence?.user?.system && newPresence?.guild?.id == guild) {
    if (newPresence.activities.map(a => a.name).toString() != oldPresence.activities.map(a => a.name).toString()) {
      const mapped = newPresence?.activities.map(a => a.name).join(' ') ?? '';
      const oldMapped = oldPresence?.activities.map(a => a.name).join(' ') ?? '';
      if (harshFilter(mapped)) {
        const logs = oldPresence.client.channels.cache.get(logChannel);
        const g = oldPresence.client.guilds.cache.get(guild);
        await new mU(null, logs).sendLog("Language In Activity",
          `${oldPresence} (${oldPresence.nickname}) has possible language in their nickname.`,
          [{ name: "Old Activities ", value: oldMapped, inline: true }, { name: "New Nick", value: mapped, inline: true }],
          await g.members.fetch(newPresence.user.id),
          "See flag"
        );
      }
    }
  }
});

module.exports = Module;