const Augur = require('augurbot'),
  u = require('../utils/utils'),
  discord = require('discord.js'),
  mU = require('../utils/modUtils');

/*
* 0: No filter
* 1: Messages only
* 2: Usernames & Nicks only
* 3: Statuses only
* 4: Messages & Usernames
* 5: Messages & Statuses
* 6: Usernames & Statuses
* 7: All
*/

const Module = new Augur.Module();
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
/** @param {discord.Message} msg*/
async function filter(msg, auto = true) {
  if (msg.guild) {
    const server = await getVars(msg);
    const logs = msg.guild.channels.cache.get(server.modLogs);
    const mute = msg.guild.roles.cache.get(server.muted);
    if (msg.content && await u.db.guildConfig.filter.get(msg.guild?.id) && !msg.author.bot && msg.channel.parent?.id != server.modCategory) {
      const site = u.siteFilter(msg.content);
      if (site) {
        const matches = site.site;
        const ruleName = site.category;
        const flag = {
          msg,
          pingMods: false,
          snitch: null,
          flagReason: `Site Category \`${ruleName}\``,
          muted: mute,
          logs,
          mods: msg.guild.roles.cache.get(server.mods),
          muteChannel: msg.guild.channels.cache.get(server.muteChannel),
          member: msg.member,
          matches
        };
        await new mU().createFlag(flag);
        if (msg.deletable) return await msg.delete().catch(() => u.noop());
      }
    }

    if (auto && msg.channel.id == server.modLogs && msg.embeds.length > 0 && !msg.author.bot && !msg.author.system) {
      const modMsg = msg.embeds[0];
      if (modMsg.type == 'auto_moderation_message') {
        msg.content = modMsg.description;
        msg.url = modMsg.fields.find(f => f.name == 'flagged_message_id');
        const matches = modMsg.fields.find(f => f.name == 'keyword_matched_content')?.value;
        const ruleName = modMsg.fields.find(f => f.name == 'rule_name')?.value;
        const harsh = u.harshFilter(msg.content);
        const flag = {
          msg,
          pingMods: harsh,
          snitch: null,
          flagReason: `AutoMod Rule \`${ruleName}\``,
          furtherInfo: `Rule: \`${modMsg.fields.find(f => f.name == 'keyword')?.value}\``,
          muted: mute,
          logs,
          mods: msg.guild.roles.cache.get(server.mods),
          muteChannel: msg.guild.channels.cache.get(server.muteChannel),
          member: msg.member,
          matches
        };
        await new mU().createFlag(flag);
        if (msg.deletable) return await msg.delete().catch(() => u.noop());
      }
      if (!msg.author.bot && !msg.author.system && msg.embeds.length > 0) {
        const plainText = msg.embeds.map(e => `${e.title ?? ""} ${e.description ?? ""} ${e.fields.map(f => `${f.name ?? ""} ${f.value ?? ""}`).join(' ')} ${e.author?.name ?? ""} ${e.footer?.text ?? ""}`).join(' ');
        const harsh = u.harshFilter(plainText);
        const links = u.siteFilter(plainText);
        if (harsh || links) {
          await msg.suppressEmbeds();
          return await msg.reply({ content: "Looks like that link embed might have some language in it. Please be careful!" });
        }
      }
    }
  }
}
async function getVars(int) {
  const guild = int.guild.id;
  const channels = await u.db.guildConfig.snowflakes.getChannels(guild);
  const roles = await u.db.guildConfig.snowflakes.getRoles(guild);
  return { ...channels, ...roles };
}
Module.addInteractionCommand({ name: 'mod',
  commandId: '998632048057139304',
  process: async (int) => {
    const command = int.options.getSubcommand();
    const server = await getVars(int);
    const logs = int.client.channels.cache.get(server.modLogs);
    const mutes = int.client.channels.cache.get(server.muteChannel);
    const modUtil = new mU(int, logs);
    switch (command) {
    case "ban": return modUtil.ban(server.untrusted);
    case "clear": return modUtil.clear();
    case "disconnect-vc": return modUtil.dcAll();
    case "kick": return modUtil.kick(server.untrusted);
    case "mute": return modUtil.mute(server.muted, mutes);
    case "mute-vc": return modUtil.muteVC();
    case "nick": return modUtil.rename();
    case "note": return modUtil.note();
    case "unmute": return modUtil.mute(server.muted, mutes, true);
    case "unmute-vc": return modUtil.muteVC(true);
    case "untrust": return modUtil.trust(server.trusted, server.untrusted, true);
    case "untrust-plus": return modUtil.trustPlus(server.trusted, server.untrusted, true);
    case "slowmode": return modUtil.slowmode();
    case "timeout": return modUtil.timeout();
    case "trust": return modUtil.trust(server.trusted, server.untrusted);
    case "trust-plus": return modUtil.trustPlus(server.trusted, server.trustPlus);
    case "user-info": return modUtil.info(server.muted, server.trusted, server.trustPlus, server.untrusted);
    case "warn": return modUtil.warn();
    case "watch": return modUtil.watch(server.untrusted);
    }
  }
})
.addInteractionCommand({ name: "userMod",
  commandId: "998632048057139303",
  process: async (int) => {
    if (!int.isUserContextMenuCommand()) return;
    const server = await getVars(int);
    const target = int.targetMember;
    const logs = int.guild.channels.cache.get(server.modLogs);
    const mute = int.guild.channels.cache.get(server.muteChannel);
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
    const response = await int.channel.awaitMessageComponent({ time: 5 * 60 * 1000, componentType: 3, filter: intFilter }).catch(() => u.noop());
    const modUtils = new mU(int, logs);
    if (response) {
      await int.editReply({ content: "Hang on a second...", components: [] });
      switch (response.values[0]) {
      case 'mute': return await modUtils.mute(server.muted, mute, false, target);
      case 'timeout': return await modUtils.timeout(target);
      case 'trust': return await modUtils.trust(server.trusted, server.untrusted, false, target);
      case 'trustplus': return await modUtils.trustPlus(server.trusted, server.trustPlus, false, target);
      case 'watch': return await modUtils.watch(server.trusted, server.untrusted, target, false, false);
      case 'unwatch': return await modUtils.watch(server.trusted, server.untrusted, target, true, false);
      case 'untrust': return await modUtils.trust(server.trusted, server.untrusted, true, target);
      case 'untrustplus': return await modUtils.trustPlus(server.trusted, server.trustPlus, true, target);
      case 'unmute': return await modUtils.mute(server.muted, mute, true, target);
      case 'warn': return await modUtils.warn(5, target);
      case 'info': return await modUtils.info(server.muted, server.trusted, server.trustPlus, server.untrusted, target);
      }
    }
  }
})
.addInteractionCommand({ name: "report",
  commandId: "998632048057139301",
  process: async (int) => {
    const msg = int.targetMessage;
    const server = await getVars(int);
    const logs = msg.guild.channels.cache.get(server.modLogs);
    const mute = msg.guild.roles.cache.get(server.muted);
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
      mods: msg.guild.roles.cache.get(server.mods),
      muteChannel: msg.guild.channels.cache.get(server.muteChannel),
      member: msg.member
    };
    await result.reply({ content: `Message flagged. Check ${logs} to see the flag`, ephemeral: true });
    return await new mU().createFlag(flag);
  }
})
.addInteractionCommand({ name: "harshReport",
  commandId: "998632048057139302",
  process: async (int) => {
    if (!int.isMessageContextMenuCommand()) return;
    const msg = int.targetMessage;
    const server = await getVars(int);
    const logs = msg.guild.channels.cache.get(server.modLogs);
    const mute = msg.guild.roles.cache.get(server.muted);
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
      mods: msg.guild.roles.cache.get(server.mods),
      muteChannel: msg.guild.channels.cache.get(server.muteChannel),
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
  const server = await getVars(int);
  const logs = int.client.channels.cache.get(server.modLogs);
  const user = int.guild.members.cache.get(userId);
  if (!int.user.bot && int.isButton() && int.message.author.id == int.client.user.id && int.message.channel.id == server.modLogs) {
    const modUtil = new mU(int, logs);
    switch (cmd) {
    case 'mCClear': return await clear();
    case 'mCVerbal': return await verbal(0);
    case 'mCMinor': return await verbal(10);
    case 'mCMajor': return await verbal(20);
    case 'mCMute': return await mute();
    case 'mCTimeout': return await timeout();
    case 'mCInfo': return await modUtil.info(server.muted, server.trusted, server.trustPlus, server.untrusted, user, int);
    case 'mCLink': return await discuss();
    }
  }
  // p much the same as the regular functions in modUtils but it doesn't log the action
  async function clear() {
    const card = await int.channel.messages.fetch(int.message.id);
    const modUtil = new mU(int, logs);
    if (userId == int.user.id) return int.reply({ content: "You can't clear your own flag!", ephemeral: true });

    const additionalFields = [{ name: "Mute Status", value: "Now Unmuted", inline: true }];
    let content = await modUtil.resolveFlag(user, user.id, int.member, card, "Cleared", int.label == "Unmute" ? additionalFields : []);
    if (card.hasThread) await card.thread.setArchived(true, 'Resolved').catch(() => u.noop());
    if (int.label == 'Unmute') {
      if (!user.roles.cache.has(server.muted)) content += "\nThey weren't muted, but I've resolved it anyways.";
      else await user.roles.remove(server.muted).catch(() => content += "\nI wasn't able to unmute them, but I've resolved it anyways. You'll have to unmute them manually");
    }
    await int.reply({ content, ephemeral: true });
  }
  async function verbal(points) {
    const card = await int.channel.messages.fetch(int.message.id);
    const infraction = await u.db.infraction.getByFlag(int.guild.id, int.message.id);
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
      .addFields([{ name: "Message", value: ogMessage.content ?? "No Message Content" }])
      .setImage(ogMessage.attachments.first()?.url);
    await ogMessage.author.send({ embeds: [embed] }).catch(() => u.blocked(user, logs, `They were too busy getting an infraction for ${points} points (someone might want to tell them about that)`));
    await modUtil.resolveFlag(user, user.id, int.member, card, "Warned", additionalFields);
  }
  async function mute() {
    const card = await int.channel.messages.fetch(int.message.id);
    const modUtil = new mU(int, logs);
    const muteC = int.client.channels.cache.get(server.muteChannel);
    let content = await modUtil.resolveFlag(user, user.id, int.member, card, "Muted", int.label == "Unmute");
    if (card.hasThread) await card.thread.setArchived(true, 'Resolved').catch(() => u.noop());
    if (user.roles.cache.has(server.muted)) content += "\nThey were already muted, but I've resolved it anyways.";
    else await user.roles.add(server.muted).catch(() => content += "\nI wasn't able to mute them, but I've resolved it anyways. You'll have to mute them manually");
    if (user.roles.cache.has(server.muted)) {
      await muteC.send(
        `${user}, you have been muted in ${int.guild.name}. `
      + 'Please review the rules channel. '
      + 'A member of the mod team will be available soon to discuss more details.'
      );
    }
  }
  async function timeout() {
    const card = await int.channel.messages.fetch(int.message.id);
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
  await filter(msg);
})
.addEvent('messageEdit', async (old, msg) => {
  await filter(msg, false);
})

// Nick/activity filtering
.addEvent('userUpdate', async (oldUser, newUser) => {
  if (!oldUser.bot && !oldUser.system) {
    if (oldUser.username != newUser.username) {
      if (u.harshFilter(newUser.username)) {
        const userGuilds = newUser.client.guilds.cache.filter(g => g.members.cache.get(newUser.id));
        for (const [id, guild] of userGuilds) {
          const langFilter = u.db.guildConfig.filter.get(id);
          if ([2, 4, 6, 7].includes(langFilter)) {
            const g = oldUser.client.guilds.cache.get(guild);
            const server = await getVars({ guild });
            const logs = oldUser.client.channels.cache.get(server.modLogs);
            await new mU(null, logs).sendLog("Language In Username",
              `${oldUser} (${newUser.username}) has possible language in their username.`,
              [{ name: "Old Username", value: oldUser.username, inline: true }, { name: "New Username", value: newUser.username, inline: true }],
              await g.members.fetch(newUser.id),
              newUser.username
            );
          }
        }
      }
    }
  }
})
.addEvent('guildMemberUpdate', async (oldMember, newMember) => {
  if (!oldMember.user.bot && !oldMember.user.system) {
    const langFilter = await u.db.guildConfig.filter.get(newMember.guild.id);
    if ([2, 4, 6, 7].includes(langFilter) && oldMember.nickname != newMember.nickname) {
      if (u.harshFilter(newMember.nickname)) {
        const server = await getVars({ guild: oldMember.guild });
        const logs = oldMember.client.channels.cache.get(server.modLogs);
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
  if (!newPresence?.activities || (!newPresence?.activities && !oldPresence?.activities)) return;
  if (!oldPresence?.user?.bot && !oldPresence?.user?.system) {
    if (newPresence?.activities?.map(a => a.name).toString() != oldPresence?.activities?.map(a => a.name).toString()) {
      const mapped = newPresence?.activities.map(a => a.name).join(' ') ?? '';
      const oldMapped = oldPresence?.activities.map(a => a.name).join(' ') ?? '';
      if (u.harshFilter(mapped)) {
        const userGuilds = newPresence.client.guilds.cache.filter(g => g.members.cache.get(newPresence.user.id));
        for (const [id, guild] of userGuilds) {
          const langFilter = await u.db.guildConfig.filter.get(id);
          if ([3, 5, 6, 7].includes(langFilter)) {
            const server = await getVars({ guild });
            const logs = oldPresence.client.channels.cache.get(server.modLogs);
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
    }
  }
});

module.exports = Module;