const Discord = require("discord.js"),
  u = require("../utils/utils"),
  { MessageActionRow, MessageButton } = require("discord.js");
const slowmodes = new Map();
const modActions = (id, mute) => [
  new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`mCClear${id}`).setEmoji("✅").setLabel(mute ? "Unmute" : "False Alarm").setStyle("SUCCESS"),
    new MessageButton().setCustomId(`mCVerbal${id}`).setEmoji("🗣").setLabel("Light Warning").setStyle("PRIMARY"),
    new MessageButton().setCustomId(`mCMinor${id}`).setEmoji("⚠").setLabel("Minor Infraction").setStyle("DANGER"),
    new MessageButton().setCustomId(`mCMajor${id}`).setEmoji("⛔").setLabel("Major Infraction").setStyle("DANGER"),
    new MessageButton().setCustomId(`mCMute${id}`).setEmoji("🔇").setLabel("Mute").setStyle("DANGER")
  ),
  new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`mCTimeout${id}`).setEmoji("⏰").setLabel("Timeout").setStyle("DANGER"),
    new MessageButton().setCustomId(`mCInfo${id}`).setEmoji("👤").setLabel("User Info").setStyle("SECONDARY"),
    new MessageButton().setCustomId(`mCLink${id}`).setEmoji("🔗").setLabel("Thread to Discuss").setStyle("SECONDARY")
  )
];

function compareRoles(mod, target) {
  const modHigh = mod.roles.cache.sort((a, b) => b.comparePositionTo(a)).first();
  const targetHigh = target.roles.cache.sort((a, b) => b.comparePositionTo(a)).first();
  return (modHigh.comparePositionTo(targetHigh) > 0);
}
const colors = { low: '0x00ff00', med: '0x#ffff00', high: '0xff0000' };
const logEmbed = (int, target, color) => u.embed().addField("User", `${target}\n(${target.user.tag})`, true).addField("Mod", int?.member?.toString() ?? "Auto", true).setColor(colors[color]).setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() });
const infractionField = (embed, summary) => embed.addField(`Infraction Summary (${summary.time} Day(s))`, `Infractions: ${summary.count}\nPoints: ${summary.points}`);
class ModCommon {
  /**
   * @param {Discord.CommandInteraction} interaction
   * @param {Discord.TextChannel} logs
   */
  constructor(interaction, logs) {
    /** @type {Discord.CommandInteraction} */
    this.interaction = interaction;
    /** @type {Discord.TextChannel} */
    this.logs = logs;
  }
  /**
   * @param {string} title
   * @param {string} description
   * @param {Discord.EmbedField[]} fields
   * @param {*} infraction
   * @param {Discord.GuildMember} target
   */
  async sendLog(title, description, fields, target, deets) {
    u.db.infraction.save(target.guild.id, {
      discordId: target.id,
      description: `[${title}]: ${deets}`,
      value: 0,
    });

    // Log it
    const embed = logEmbed(null, target, 'med').setTitle(title)
      .setDescription(description)
      .addFields(fields ?? []);
    this.logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
  }
  async ban(untrusted, target) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      const reason = interaction.options?.getString('reason') ?? "Infraction related";
      const proof = interaction.options?.getAttachment('screenshot');
      const days = interaction.options?.getInteger('delete') ?? 0;
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (!compareRoles(interaction.member, target)) return await interaction.editReply(`You don't have insufficient permissions to ban ${target}!`);
      else if (!target.bannable) return await interaction.editReply(`I don't have insufficient permissions to ban ${target}!`);
      if (days > 7 || (days && days < 0)) return interaction.editReply("I can only delete up to 7 days");
      const confirm = await u.confirmInt(interaction, `Ban ${target} for:\n${reason}?`, `Confirm Ban on ${u.escapeText(target.displayName)}`);
      if (confirm) {
        await target.send({ embeds: [
          u.embed().setTitle("User Ban").setDescription(`You have been banned from **${interaction.guild.name}** for:\n${reason}`)
        ] }).catch(() => u.blocked(target, logs, "They were too busy being banned"));
        if (untrusted) await target.roles.add(untrusted);
        await target.ban({ days, reason });

        // Edit interaction
        await interaction.followUp({ embeds: [
          u.embed({ author: target }).setColor(colors.high).setDescription(`${target} banned for:\n${reason}`)
        ], ephemeral: true });

        // Save infraction
        u.db.infraction.save(interaction.guild.id, {
          discordId: target.id,
          description: `[User Ban]: ${reason}`,
          value: 30,
          mod: interaction.member.id
        });

        // Log it
        const banEmbed = logEmbed(interaction, target, 'high').setTitle('Member Banned')
          .addField('Messages Deleted', `${days ?? 0} Days`, true)
          .addField('Reason', reason);
        if (proof) banEmbed.setImage(proof.url);
        logs.send({ embeds: [banEmbed], allowedMentions: { parse: [] } });
      }
    } catch (error) { u.errorHandler(error, interaction); }
  }
  async clear(deleteCount) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      deleteCount ??= interaction.options?.getInteger('amount');
      if (deleteCount < 1 || deleteCount > 200) return interaction.editReply("Please provide a number between 1 and 200 for the number of messages to delete");
      let deleted = await interaction.channel.bulkDelete(deleteCount, true).catch(e => { return u.errorHandler(e, interaction); });
      interaction.editReply(`${deleted.size} messages deleted`);
      if (deleted.size > deleteCount) deleted += `\n(note that I couldn't delete ${deleteCount - deleted.size} messages since they were older than 2 weeks)`;
      const embed = u.embed({ author: interaction.member }).setTitle("Bulk Delete")
        .addField("Channel", interaction.channel.toString(), true)
        .addField('Mod', interaction.member.toString(), true)
        .addField("Messages", `${deleteCount} messages deleted`)
        .setColor(colors.med)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });
      logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  /**
   * Generate and send a warning card in #mod-logs
   * @typedef flagInfo
   * @prop {Discord.Message} msg The message for the warning.
   * @prop {Discord.GuildMember} member The member for the warning.
   * @prop {String|[String]} matches If automatic, the reason for the flag.
   * @prop {Boolean} pingMods Whether to ping the mods.
   * @prop {Discord.GuildMember} snitch The user bringing up the message.
   * @prop {String} flagReason The reason the user is bringing it up.
   * @prop {String} furtherInfo Where required, further information.
   * @prop {Discord.Role} muted The muted role
   * @prop {Discord.Role} mods The mod role
   * @prop {Discord.Channel} logs The mod logs channel
   * @prop {Discord.Channel} muteChannel The channel for muted people
   * @param {flagInfo} flagInfo
   */
  async createFlag(flagInfo) {
    const { msg, pingMods, snitch, flagReason, furtherInfo, muted, logs, mods, muteChannel } = flagInfo;
    let { member, matches } = flagInfo;
    member = member ?? msg?.member;

    const client = msg.client ?? member?.client;

    const infractionSummary = await u.db.infraction.getSummary(logs.guild.id, member.id);
    const embed = u.embed().setColor(colors.med).setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() });

    if (Array.isArray(matches)) matches = matches.join(", ");
    if (matches) embed.addField("Match", matches);
    embed.addField("User", member.toString());

    if (msg) {
      embed.setTimestamp(msg.editedAt ?? msg.createdAt)
        .setDescription((msg.editedAt ? "[Edited]\n" : "") + msg.cleanContent)
        .addField("Channel", msg.channel?.toString(), true)
        .addField("Jump to Post", `[Original Message](${msg.url})`, true);
    }
    if (snitch) embed.addField("Flagged By", snitch.toString(), true);
    if (flagReason) embed.addField("Reason", flagReason, true);
    if (furtherInfo) embed.addField("Further Information", furtherInfo, true);
    infractionField(embed, infractionSummary);

    if (member.user?.bot) embed.setFooter({ text: "The user is a bot and the flag likely originated elsewhere. No action will be processed." });

    let content;
    if (pingMods) {
      u.clean(msg, 0);
      content = [];
      embed.setColor(colors.high);
      const isMuted = member.roles.cache.has(muted);
      if (!isMuted && pingMods) content.push(mods.toString());
      if (member.bot) {
        content.push("The message has been deleted. The member was *not* muted, on account of being a bot.");
      } else {
        if (!member.roles?.cache.has(muted)) {
          await member.roles?.add(muted);
          if (member.voice?.channel) member.voice.disconnect("Auto-mute");
          muteChannel.send({
            content: `${member}, you have been auto-muted in ${msg.guild.name}. Please review our rules. A member of the mod team will be available to discuss more details.`,
            allowedMentions: { users: [member.id] }
          });
        }
        content.push(`${isMuted ? 'Muted User' : 'User'} ${member} sent something bad. Their message has been deleted ${isMuted ? "" : " and they have been auto-muted."}`);
      }
      content = content.join("\n");
    }

    const card = await logs.send({
      content,
      embeds: [embed],
      components: (member.bot || !msg ? undefined : modActions(`.${member.id}`, pingMods)),
      allowedMentions: { roles: [mods.id] }
    });

    if (!member.bot && msg) {
      const infraction = {
        discordId: member.id,
        channel: msg?.channel.id,
        message: msg?.id,
        flag: card.id,
        description: msg?.cleanContent,
        mod: client.user.id,
        value: 0
      };
      await u.db.infraction.save(logs.guild.id, infraction);
    }
  }
  async resolveFlag(user, userId, mod, msg, action, additionalFields = []) {
    const embed = u.embed().setAuthor({ name: mod.displayName, iconURL: mod.displayAvatarURL() })
      .setTitle("Mod Card Resolved")
      .addField("Action", action, true)
      .addField("User", `${user} (${userId})`, true)
      .addField("Mod", mod.toString(), true);
    const component = new MessageActionRow().addComponents(
      new MessageButton().setCustomId(`mCLink`).setEmoji("🔗").setLabel("Thread to Discuss").setStyle("SECONDARY")
    );
    if (additionalFields.length > 0) embed.addFields(additionalFields);
    await msg.edit({ components: [component], content: `Resolved by ${mod} (${action})` }).catch(e => {
      u.errorHandler(e, msg);
      return "I wasn't able to clear the flag.";
    });
    if (new Date().getTime() - msg.createdTimestamp > 60 * 60 * 1000) await this.logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
    return `Flag ${action}`;
  }
  async dcAll(mod, manager) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel('channel') ?? interaction.member.voice?.channel;
      if (channel?.type != 'GUILD_VOICE') return interaction.editReply("I need a VC");
      const failed = [];
      const mods = [];
      const members = channel.members.toJSON();
      if (members.length == 0) return interaction.editReply("There isn't anyone to disconnect.");
      let i = 0;
      do {
        const m = members[i];
        if (m.roles.cache.hasAny(mod, manager) || m.permissions.has("ADMINISTRATOR")) {
          mods.push(m.id);
        } else {
          await m.voice.setChannel(null).catch(() => {
            failed.push(m.id);
          });
        }
        i++;
      } while (i < members.length);
      interaction.editReply(`Disconnected ${members.length - failed.length} user(s) from ${channel}. ${failed.length > 0 ? `There was an issue, and I wasn't able to disconnect ${failed.length} user(s)` : ""}`);
      const embed = u.embed().setTitle("Disconnected All Users")
        .addField("Channel", channel.toString(), true)
        .addField("Mod", interaction.member.toString(), true)
        .addField("User Count", `${members.length - failed.length - mods.length}/${members.length}`)
        .setColor(colors.med)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });
      logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  /**
   * @param {Discord.GuildMember} member
   * @param {number} time days
   * @param {Discord.Guild} guild
   */
  async getSummaryEmbed(member, time) {
    const data = await u.db.infraction.getSummary(member.guild.id, member.id, time);
    const response = [`**${member}** has had **${data.count}** infraction(s) in the last **${data.time}** day(s), totaling **${data.points}** points.`];
    if ((data.count > 0) && (data.detail.length > 0)) {
      data.detail = data.detail.reverse(); // Newest to oldest is what we want
      for (const record of data.detail) {
        const mod = member.guild.members.cache.get(record.mod) || `Unknown Mod (<@${record.mod}>)`;
        const pointsPart = record.value === 0 && mod.id !== member.client.user.id ? "Note" : `${record.value} pts`;
        response.push(`\`${record.timestamp.toLocaleDateString()}\` (${pointsPart}, modded by ${mod}): ${record.description}`);
      }
    }
    let text = response.join("\n");
    text = text.length > 4090 ? text.substring(0, 4090) + "..." : text;
    return u.embed().setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
      .setTitle("Infraction Summary")
      .setDescription(text)
      .setColor(0x00ff00);
  }
  async kick(untrusted, target, reason) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      reason ??= interaction.options?.getString('reason') ?? "Infraction related";
      const proof = interaction.options?.getAttachment('screenshot');
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (!compareRoles(interaction.member, target)) return await interaction.editReply({ content: `You have insufficient permissions to kick ${target}!` });
      else if (!target.kickable) return await interaction.editReply({ content: `I have insufficient permissions to kick ${target}!` });

      const confirm = await u.confirmInt(interaction, `Kick ${target} for:\n${reason}?`, `Confirm Kick on ${u.escapeText(target.displayName)}`);
      if (confirm) {
        await target.send({ embeds: [
          u.embed().setTitle("User Kick").setDescription(`You have been kicked in ${interaction.guild.name} for:\n${reason}`)
        ] }).catch(() => u.blocked(target, logs, "They were too busy getting kicked"));
        if (untrusted) await target.roles.add(untrusted);
        // await target.kick(reason);

        // Edit interaction
        await interaction.followUp({ embeds: [
          u.embed({ author: target })
          .setColor(colors.high)
          .setDescription(`${target.toString()} kicked for:\n${reason}`)
        ], ephemeral: true });

        // Save infraction
        u.db.infraction.save(interaction.guild.id, {
          discordId: target.id,
          description: `[User Kick]: ${reason}`,
          value: 30,
          mod: interaction.member.id
        });

        // Log it
        const embed = logEmbed(interaction, target, 'high').setTitle("User Kick")
          .addField('Reason', reason)
          .setColor(0x0000ff);
        if (proof) embed.setImage(proof.url);
        logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
      }
    } catch (error) { u.errorHandler(error, interaction); }
  }
  /**
   * @param {string} muted
   * @param {Discord.TextChannel} muteChannel
   * @param {boolean} unmute
   */
  async mute(muted, muteChannel, unmute = false, target) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      const reason = interaction.options?.getString('reason') ?? "No reason provided";
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });

      if (!compareRoles(interaction.member, target)) return await interaction.editReply({ content: `You have insufficient permissions to ${unmute ? 'un' : ''}mute ${target}!` });
      if (!target.manageable) return await interaction.editReply({ content: `I have insufficient permissions to ${unmute ? 'un' : ''}mute ${target}!` });
      if (!unmute && target.roles.cache.has(muted)) return await interaction.editReply(`${target} is already muted.`);
      if (unmute && !target.roles.cache.has(muted)) return await interaction.editReply(`${target} isn't muted.`);

      const action = unmute ? "remove" : "add";
      await target.roles[action](muted);
      if (target.voice?.channel) {
        await target.voice.disconnect(reason);
        await target.voice.setMute(!unmute, reason);
      }
      const embed = logEmbed(interaction, target, 'med')
        .setTitle(`Member ${unmute ? 'Unm' : 'M'}uted`)
        .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() });
      if (reason && !unmute) embed.addField('Reason', reason);
      await logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
      let thread = muteChannel.threads.cache.find(f => f.name == `${target.id} Mute Session`);
      if (thread) await thread.setArchived(unmute);
      if (!unmute) {
        if (!thread) thread = await muteChannel.threads.create({ name: `${target.id} Mute Session` });
        await thread.send(
          `${target}, you have been muted in ${interaction.guild.name}. `
        + 'Please review the rules channel. '
        + 'A member of the mod team will be available soon to discuss more details.'
        );
      }
      await interaction.editReply({ content: `${unmute ? 'Unm' : 'M'}uted ${target}.` });
    } catch (error) { u.errorHandler(error, interaction); }
  }
  async muteVC(unmute = false) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel('channel') ?? interaction.member.voice?.channel;
      if (channel?.type != 'GUILD_VOICE') return interaction.editReply("I need a VC");
      const status = channel.permissionOverwrites.cache.get(interaction.guild.id).deny?.has('SPEAK');
      if (status && !unmute) return interaction.editReply("That VC is already muted!");
      if (!status && unmute) return interaction.editReply("That VC isn't muted!");
      channel.permissionOverwrites.edit(interaction.guild.id, { SPEAK: unmute ? null : false });
      interaction.editReply(`Everyone without permissions will now be ${unmute ? 'able to talk' : 'muted'} in ${channel}`);
      const embed = u.embed().setTitle(`${unmute ? 'Unm' : 'M'}uted All Users`)
        .addField("Channel", channel.toString(), true)
        .addField("Mod", interaction.member.toString(), true)
        .addField("User Count", `${channel.members.size} User(s)`)
        .setColor(colors.med)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });
      logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  async note(target, note) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      note ??= interaction.options?.getString('note');
      await u.db.infraction.save(interaction.guild.id, {
        discordId: target.id,
        value: 0,
        description: note,
        mod: interaction.user.id
      });
      const summary = await u.db.infraction.getSummary(interaction.guild.id, target.id);

      await logs.send({ embeds: [
        logEmbed(interaction, target, 'low')
          .setTitle("New note").setDescription(note)
          .addField(`Infraction Summary (${summary.time} Days)`, `Infractions: ${summary.count ?? 0}\nPoints: ${summary.points ?? 0}`)
      ], allowedMentions: { parse: [] } });

      await interaction.reply({ content: `Note added for user ${target}.`, ephemeral: true });
    } catch (error) { u.errorHandler(error, interaction); }
  }
  async rename(target, name) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      name ??= interaction.options?.getString("name") ?? null;
      const oldNick = target.displayName;
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (!compareRoles(interaction.member, target)) return await interaction.editReply({ content: `You have insufficient permissions to rename ${target}!` });
      if (!target.manageable) return await interaction.editReply(`I have insufficient permissions to rename ${target}!`);
      if (name == oldNick || (!name && !target.nick)) return interaction.editReply(`There isn't anything to change.`);

      await target.setNickname(name, `Changed from ${oldNick} to ${name}`);
      const comment = `Set nickname to ${u.escapeText(name)} from ${u.escapeText(oldNick)}.`;
      await u.db.infraction.save(interaction.guild.id, {
        discordId: target.id,
        value: 0,
        description: comment,
        message: interaction.id,
        channel: interaction.channel.id,
        mod: interaction.member.id
      });
      const summary = await u.db.infraction.getSummary(interaction.guild.id, target.id);
      logs.send({ embeds: [
        logEmbed(interaction, target, 'med').setTitle("User Renamed")
        .addField("Change", `**${oldNick}** >>> **${name}**`)
        .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count ?? 0}\nPoints: ${summary.points ?? 0}`)
      ], allowedMentions: { parse: [] } });
      await interaction.editReply({ content: comment });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  async slowmode() {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      const channel = interaction.channel;
      const delay = interaction.options.getInteger("delay") ?? 15;
      const duration = Math.floor(interaction.options.getInteger("duration") ?? 30);
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (duration >= 300) return interaction.editReply("Thats a bit too long. If you want to have it go on indefinitely, change the channel settings manually");
      if (duration < 0) return interaction.editReply("I need a time of at least 1 minute");
      try {
        if (duration == 0 || delay == 0) {
          const slow = slowmodes.get(channel.id);
          const old = channel.rateLimitPerUser;
          if (old == 0) return interaction.editReply("This channel isn't in slowmode right now");
          channel.setRateLimitPerUser(0).catch(e => u.errorHandler(e, interaction));
          if (slow) {
            clearTimeout(slow);
            slowmodes.delete(channel.id);
          }
          await interaction.editReply("Slowmode was disabled");
          const embed = u.embed().setTitle("Slowmode Disabled")
            .addField("Channel", channel.toString())
            .addField("Old Message Delay", `${old} seconds`)
            .setColor(colors.med)
            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });
          if (slow) embed.addField("Would Have Expired At", `${u.toEpoch(new Date(slow.started.getTime() + (duration * 60000)), 'f')}`);
          embed.addField("Mod", interaction.member.toString());
          return logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
        }
        const prev = slowmodes.get(channel.id);
        if (prev) clearTimeout(prev.timeout);
        const limit = prev ? prev.limit : channel.rateLimitPerUser;
        await channel.edit({ rateLimitPerUser: delay });
        interaction.editReply(`This channel has been put in a ${delay} second slowmode for ${duration} minutes. `);
        slowmodes.set(channel.id, {
          timeout: setTimeout((c, rateLimitPerUser) => {
            c.edit({ rateLimitPerUser }).catch(error => u.errorHandler(error, "Reset rate limit after slowmode"));
            slowmodes.delete(c.id);
            const embed = u.embed().setTitle("Slowmode Done")
              .addField("Channel", channel.toString())
              .addField("Started By", interaction.member.toString())
              .addField("Delay", `${rateLimitPerUser} seconds`)
              .addField("Duration", `${duration} minutes`)
              .setColor(colors.med)
              .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });
            logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
          }, duration * 60000, channel, limit),
          limit, duration, started: new Date()
        });
        const embed = u.embed().setTitle("Slowmode Activated")
          .addField("Channel", channel.toString(), true)
          .addField("Mod", interaction.member.toString(), true)
          .addField("Duration", `${duration} minutes\n${prev ? `(Was ${prev.duration} minutes)` : ""}`)
          .addField("Message Delay", `${delay} seconds\n${prev ? `(Was ${prev.limit} seconds)` : ""}`)
          .setColor(colors.med)
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });
        logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
      } catch (error) {
        u.errorHandler(error);
      }
    } catch (error) { u.errorHandler(error, interaction); }
  }
  async timeout(target) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      target ??= interaction?.options.getMember('user');
      const reason = interaction.options?.getString('reason') ?? "No reason provided";
      const length = interaction.options?.getInteger('length') ?? 10;
      if (!compareRoles(interaction.member, target)) return await interaction.editReply({ content: `You have insufficient permissions to timeout ${target}!` });
      if (!target.manageable || !target.moderatable) return interaction.editReply({ content: `I have insufficient permissions to timeout ${target}!` });
      const previous = target.communicationDisabledUntil;
      if (Math.floor(length) == 0 && !previous) return interaction.editReply({ content: `${target} isn't timed out` });

      await target.timeout(Math.floor(length) * 60 * 1000, reason);
      interaction.editReply(`Timed out ${target} for ${length} minutes`);
      const time = previous ? `Was until ${u.toEpoch(previous, 'T')}${length != 0 ? `, and is now for ${length} minutes` : ''}` : `${length} minutes`;
      await logs.send({ embeds: [
        logEmbed(interaction, target, 'med').setTitle("User Timeout" + length == 0 ? " Removed" : "")
        .addField("Length", time, true)
        .addField('Reason', reason)
      ], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  /**
   * @param {string} trusted
   * @param {string} untrusted
   */
  async trust(trusted, untrusted, untrust = false, target) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (!untrust && target.roles.cache.has(trusted)) return interaction.editReply({ content: `${target} is already trusted.` });
      if (untrust && !target.roles.cache.has(trusted)) return interaction.editReply({ content: `${target} isn't trusted.` });

      target.send(
        `You have been ${untrust ? `removed from the "Trusted" role` : `marked as "Trusted"`}  in ${interaction.guild.name} . `
        + `This means you are ${untrust ? 'no longer' : 'now'} permitted to post images and links in chat. `
        + `${untrust ? "Talk to a mod to see why." : "Please remember to follow the rules when doing so."}`
      ).catch(() => u.blocked(target, logs, `They were too busy getting ${untrust ? 'removed from' : ''} the Trusted role`));

      const embed = logEmbed(interaction, target, 'low').setTitle(`User ${untrust ? 'Removed From' : 'Given'} Trusted`)
        .addField("Joined At", u.toEpoch(target.joinedAt, 'f'));
      if (!untrust && target.roles.cache.has(untrusted)) {
        await target.roles.remove(untrusted);
        embed.addField("Untrusted", "User was previously untrusted");
      }
      if (untrust) await target.roles.remove(trusted);
      else await target.roles.add(trusted);
      await interaction.editReply({ content: `${target} has been ${untrust ? "removed from" : "given"} the <@&${trusted}> role!` });
      await logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  /**
   * @param {string} trusted
   * @param {string} trustplus
   */
  async trustPlus(trusted, trustplus, untrust = false, target) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (!untrust && target.roles.cache.has(trustplus)) return await interaction.editReply({ content: `${target} is already trusted+.` });
      if (!untrust && !target.roles.cache.has(trusted)) return await interaction.editReply({ content: `${target} needs <@&${trusted}> before they can be given <@&${trustplus}>!` });
      if (untrust && !target.roles.cache.has(trustplus)) return await interaction.editReply({ content: `${target} isn't trusted+.` });
      await target.send(
        `You've been ${untrust ? "removed from" : "added to"} the Trusted+ list in ${interaction.guild.name}, ${untrust ? "removing your ability" : "allowing you"} to stream to voice channels.\n\n`
        + !untrust ? "While streaming, please remember the server rules. " : "Contact a moderator if you have any questions."
        + !untrust ? `Also, please be aware that ${interaction.guild.name} may make changes to the Trusted+ list from time to time at its discretion.` : ''
      ).catch(() => u.blocked(target, logs, "They were too busy getting the trusted+ role" + untrust ? " removed" : ""));

      if (untrust) await target.roles.remove(trustplus);
      else await target.roles.add(trustplus);
      await interaction.editReply({ content: `${target} has been ${untrust ? "removed from" : "given"} the <@&${trustplus}> role!` });
      await logs.send({ embeds: [logEmbed(interaction, target, 'low').setTitle(`User ${untrust ? "Removed From" : "Given"} Trusted+`)], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  async info(muted, trusted, trustPlus, untrusted, target, int) {
    const interaction = int ?? this.interaction;
    try {
      if (!interaction?.replied) await interaction?.deferReply({ ephemeral: true });
      target ??= interaction?.options?.getMember('user');
      const time = interaction?.options?.getInteger('days') ?? 90;
      const infractions = await this.getSummaryEmbed(target, time);
      const userdoc = await u.db.ranks.getRank(interaction?.guild.id, target.id);
      const trustStatus = target.roles.cache.has(untrusted) ? "Untrusted" : target.roles.cache.has(trusted) ? "Trusted" : target.roles.cache.has(trustPlus) ? "Trusted+" : "Not Trusted";
      const userEmbed = u.embed({ author: target }).setColor(target.displayColor)
        .setTitle(`User Info for ${target.displayName}`)
        .addField("Name", `${target.user.username} ${target.nickname ? `(${target.nickname})` : ''}`, true)
        .addField("Joined", u.toEpoch(target.joinedAt, 'f'), true)
        .addField("Account Created", u.toEpoch(target.user.createdAt, 'f'), true)
        .addField("Trusted Status", trustStatus, true)
        .addField("Posts", `${userdoc?.posts ?? 0} tracked posts`, true)
        .addField("Roles", target.roles.cache.map(r => r.toString()).join('\n'));
      if (target.premiumSince) userEmbed.addField("Boosting Since", u.toEpoch(target.premiumSince), true);
      if (target.roles.cache.has(muted)) userEmbed.addField("Muted", "User is currently muted", true);
      if (target.user.bot) userEmbed.addField("Bot", "Yup", true);
      if (target.user.flags.toArray().length > 0) userEmbed.addField("Flags", target.user.flags.toArray().join('\n'));
      await interaction?.editReply({ embeds: [userEmbed, infractions] });
      return [userEmbed, infractions];
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
  async warn(points, target) {
    return (points, target);
  }
  async watch(trusted, untrusted, target, undo, remove) {
    const interaction = this.interaction;
    const logs = this.logs;
    try {
      target ??= interaction.options?.getMember('user');
      undo ??= interaction.options?.getBoolean('retrust') ?? false;
      remove ??= interaction.options?.getBoolean('remove-trusted') ?? false;
      if (!interaction.replied) await interaction.deferReply({ ephemeral: true });
      if (!undo && target.roles.cache.has(untrusted)) return interaction.editReply({ content: `${target} is already untrusted.` });
      if (undo && !target.roles.cache.has(untrusted)) return interaction.editReply({ content: `${target} isn't untrusted.` });
      if (remove && !target.roles.cache.has(trusted)) return interaction.editReply({ content: `${target} isn't trusted.` });


      const embed = logEmbed(interaction, target, 'low').setTitle("Watching User")
        .addField("Joined At", u.toEpoch(target.joinedAt, 'f'), true)
        .addField(`Trusted ${undo ? "Regained" : "Removed"}`, `${(remove || undo) ? "YES" : "NO"}`, true);
      if (undo) {
        await target.roles.remove(untrusted);
        if (!target.roles.cache.has(trusted)) target.roles.add(trusted);
      } else {
        await target.roles.add(untrusted);
        if (remove) target.roles.remove(trusted);
      }
      await interaction.editReply({ content: `${target} has been ${undo ? "removed from" : "given"} the <@&${untrusted}> role! ${remove && !undo ? 'They have also lost the trusted role' : '' }` });
      await logs.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      u.errorHandler(error, interaction);
    }
  }
}

module.exports = ModCommon;