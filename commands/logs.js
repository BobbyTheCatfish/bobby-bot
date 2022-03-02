const Augur = require('augurbot'),
  u = require('../utils/utils'),
  Module = new Augur.Module();
const flags = async (guild) => await u.decodeLogEvents(guild);
// const flags = async(guild) => await Module.db.guildconfig.getLogFlags(guild.id)
async function permDifferences(oldCache, newCache, guild) {
  function getDiff(a1, a2) {
    return a1.filter(x => !JSON.stringify(a2).includes(JSON.stringify(x)));
  }
  const changes = [];
  const { perms } = require('../jsons/perms.json');
  const older = oldCache.map(o => ({ id: o.id, type: o.type, deny: o.deny.toArray(), allow: o.allow.toArray(), version: '' }));
  const newer = newCache.map(o => ({ id: o.id, type: o.type, deny: o.deny.toArray(), allow: o.allow.toArray(), version: '' }));
  const diff = getDiff(older, newer).concat(getDiff(newer, older));
  if (diff.length > 1) {
    const difference = [];
    for await (const x of diff) {
      if (JSON.stringify(older).includes(JSON.stringify(x))) x.version = 'old';
      if (JSON.stringify(newer).includes(JSON.stringify(x))) x.version = 'new';
      if (difference.find(a => a.id == x.id)) {
        if (x.version == 'old') difference.find(a => a.id == x.id).oldPerms = { allow: x.allow, deny: x.deny };
        else if (x.version == 'new') difference.find(a => a.id == x.id).newPerms = { allow: x.allow, deny: x.deny };
      } else if (x.version == 'old') {
        difference.push({ id: x.id, type: x.type, oldPerms: { allow: x.allow, deny: x.deny }, version: x.version });
      } else if (x.version == 'new') {
        difference.push({ id: x.id, type: x.type, newPerms: { allow: x.allow, deny: x.deny }, version: x.version });
      }
    }
    for await (const overwrite of difference) {
      const oldAllow = overwrite.oldPerms.allow;
      const oldDeny = overwrite.oldPerms.deny;
      const newAllow = overwrite.newPerms.allow;
      const newDeny = overwrite.newPerms.deny;
      for await (const perm of perms) {
        let before, after;
        if (!oldDeny.includes(perm) && !oldAllow.includes(perm) && !newDeny.includes(perm) && !newAllow.includes(perm)) continue;
        if (oldDeny.includes(perm) && newDeny.includes(perm)) continue;
        if (oldAllow.includes(perm) && newAllow.includes(perm)) continue;
        if (oldDeny.includes(perm)) before = '❌';
        else if (oldAllow.includes(perm)) before = '✅';
        else if (!oldDeny.includes(perm) && !oldAllow.includes(perm)) before = '⬜';
        if (newDeny.includes(perm)) after = '❌';
        else if (newAllow.includes(perm)) after = '✅';
        else if (!newDeny.includes(perm) && !newAllow.includes(perm)) after = '🗑️';
        if (!before) console.log('no before');
        if (!after) console.log('no after');
        const change = `${u.properCase(perm.replace(/_/g, ' '))}: ${before} ➔ ${after}`;
        const find = changes.find(c => c?.id == overwrite.id);
        if (find) find.text.push(change);
        else changes.push({ id: overwrite.id, type: overwrite.type, text: [change] });
      }
    }
    return changes.map(c => `${c.type == 'member' ? guild.members.cache.get(c.id) : guild.roles.cache.get(c.id)}:\n${c.text.join('\n')}`).join('\n');
  } else if (diff.length == 1) {
    let change;
    if (JSON.stringify(older).includes(JSON.stringify(diff[0]))) change = 'removed';
    if (JSON.stringify(newer).includes(JSON.stringify(diff[0]))) change = 'added';
    return `${diff[0].type == 'member' ? guild.members.cache.get(diff[0].id) : guild.roles.cache.get(diff[0].id)} ${change}`;
  } else {return null;}
}
async function send(guild, embed, content) {
  const channel = await Module.db.guildconfig.getLogChannel(guild.id);
  guild.channels.cache.get(channel)?.send({ content, embeds: [embed], allowedMentions: { parse: [] } });
}
async function getLogAction(guild, id, type, time = new Date().getTime() - 50000, limit = 5, timeout = 500) {
  let logs, entry;
  function find(entries) {return entries.find(e => (e.target.id == id || e.extra?.channel?.id == id || e.extra?.id == id || e.code == id) && time - e.createdAt.getTime() < timeout);}
  if (typeof type == 'string') {
    logs = await guild.fetchAuditLogs({ type, limit });
    entry = find(logs.entries);
  } else {
    for (const x of type) {
      logs = await guild.fetchAuditLogs({ type: x, limit });
      entry = find(logs.entries);
      if (entry) break;
    }
  }
  if (!entry) {
    entry = logs.entries.find(e => (e.extra?.channel?.id == id || e.extra?.id == id || e.code == id) && time - e.createdAt.getTime() < 500);
    if (!entry) return null;
  }
  const member = guild.members.cache.get(entry.executor.id);
  const target = guild.members.cache.get(entry.target.id);
  return { member, reason: entry.reason, target, extra: entry.extra };
}
function footer(embed, logAction) {
  const { member, reason } = logAction;
  return embed.setFooter(`Action performed by ${member.displayName}${reason ? `\nReason: ${reason}` : ''}`, member.user.displayAvatarURL({ dynamic: true }));
}
function emojify(string) {
  return string.toString().replace('false', '❌').replace('true', '✅');
}
// const cu = ['n', 'p', 'po', 'pl', 'po', 'ns', 's', 't', 'b'];
// const gu = ['afkc', 'afkt', 'ba', 'dmn', 'd', 'ds', 'ecf', 'i', 'mfa', 'n', 'p', 'psc', 'pt', 'puc', 'r', 'rc', 's', 'sc', 'vu', 'vl', 'v', 'wc', 'we'];
// const gmu = ['n', 'r'];
// const ru = ['c', 'h', 'pe', 'po'];
const low = '#0fe300', med = '#e3d000', high = '#ff0000';
Module.addEvent('channelCreate', async channel => {
  function mention(p) {return p.type == 'member' ? channel.guild.members.cache.get(p.id) : channel.guild.roles.cache.get(p.id);}
  if (channel.guild) {
    const enabled = await flags(channel.guild);
    if (enabled?.includes('Channel Created')) {
      let embed = u.embed().setTitle(`The ${channel.isText() ? 'text channel `#' : 'voice channel `'}${channel.name}\` was created`).setColor(low);
      if (channel.permissionOverwrites.cache.size > 0 && !channel.permissionsLocked) {
        const overwrites = channel.permissionOverwrites.cache.map(p => ({ type: p.type, id: p.id, deny: p.deny.toArray().map(o => `${o}: ❌`), allow: p.allow.toArray().map(o => `${o}: ✅`) }));
        const final = overwrites.map(o => `${mention(o)}\n${o.allow.length > 0 ? `${u.properCase(o.allow.join('\n'), true)}` : ''}${o.deny.length > 0 ? `${u.properCase(o.deny.join('\n'), true)}` : ''}\n`).join('\n');
        if (final)embed.addField('Permissions', final);
      }
      const logAction = await getLogAction(channel.guild, channel.id, 'CHANNEL_CREATE');
      if (logAction) embed = footer(embed, logAction);
      await send(channel.guild, embed);
    }
  }
})
    .addEvent('channelDelete', async channel => {
      if (channel.guild) {
        const enabled = await flags(channel.guild);
        if (enabled?.includes('Channel Deleted')) {
          let embed = u.embed().setTitle(`The ${channel.isText() ? 'text channel `#' : 'voice channel `'}${channel.name}\` was deleted`).setColor(high);
          const logAction = await getLogAction(channel.guild, channel.id, 'CHANNEL_DELETE');
          if (logAction) embed = footer(embed, logAction);
          await send(channel.guild, embed);
        }
      }
    })
    .addEvent('channelUpdate', async (oldChannel, newChannel) => {
      if (oldChannel.guild) {
        const time = new Date();
        const enabled = await flags(oldChannel.guild);
        if (enabled?.includes('Channel Updated')) {
          let embed = u.embed().setTitle(`The ${oldChannel.category ? 'category `' : 'channel `#'}${oldChannel.name}\` was updated`).setColor(med);
          let logAction = await getLogAction(newChannel.guild, newChannel.id, 'CHANNEL_UPDATE', time);
          if (logAction) embed = footer(embed, logAction);
          if (oldChannel.name != newChannel.name) embed.addField(`Name`, `**Old:** ${oldChannel.name}\n**New:** ${newChannel.name}`);
          if (oldChannel.parent != newChannel.parent) embed.addField(`Category`, `**Old:** ${oldChannel.category}\n**New:** ${newChannel.category}`);
          if (oldChannel.permissionOverwrites.cache != newChannel.permissionOverwrites.cache && !(oldChannel.permissionsLocked || newChannel.permissionsLocked)) {
            const difference = await permDifferences(oldChannel.permissionOverwrites.cache, newChannel.permissionOverwrites.cache, newChannel.guild);
            if (difference) {
              embed.addField(`Permission Overwrites`, difference);
              logAction = await getLogAction(newChannel.guild, newChannel.id, ['CHANNEL_OVERWRITE_CREATE', 'CHANNEL_OVERWRITE_UPDATE', 'CHANNEL_OVERWRITE_DELETE']);
              if (logAction) embed = footer(embed, logAction);
            }
          }
          if (oldChannel.permissionsLocked != newChannel.permissionsLocked) embed.addField(`Permissions Synced`, emojify(`${oldChannel.permissionsLocked} ➔ ${newChannel.permissionsLocked}`));
          if (oldChannel.position != newChannel.position) embed.addField(`Position`, `**Old:** ${oldChannel.position}\n**New:** ${newChannel.position}`);
          if (oldChannel.isText()) {
            if (oldChannel.nsfw != newChannel.nsfw) embed.addField(`NSFW`, emojify(`${oldChannel.nsfw} ➔ ${newChannel.nsfw}`));
            if (oldChannel.rateLimitPerPerson != newChannel.rateLimitPerPerson) embed.addField(`Slowmode`, emojify(`${oldChannel.rateLimitPerPerson} ➔ ${newChannel.rateLimitPerPerson}`));
            if (oldChannel.topic != newChannel.topic) embed.addField(`Topic`, `**Old:** ${oldChannel.topic}\n**New:** ${newChannel.topic}`);
          }
          if (oldChannel.isVoice() && oldChannel.bitrate != newChannel.bitrate) embed.addField(`Bitrate`, `**Old:** ${oldChannel.bitrate}\n**New:** ${newChannel.bitrate}`);
          if (embed.fields.length > 0) {
            await send(newChannel.guild, embed);
          }
        }
      }
    })
    .addEvent('channelPinsUpdate', async channel => {
      if (channel.guild) {
        const enabled = await flags(channel.guild);
        if (enabled?.includes('Message Pinned')) {
          const time = new Date();
          let embed = u.embed().setColor(med);
          let logAction = await getLogAction(channel.guild, channel.id, 'MESSAGE_PIN', time);
          if (logAction) {
            const message = await channel.messages.fetch(logAction.extra.messageId);
            embed = footer(embed, logAction).setTitle(`A message was pinned in #${channel.name}`).setURL(message.url).setDescription(message.content).setAuthor(logAction.target.displayName, logAction.target.user.displayAvatarURL({ dynamic: true })).setTimestamp(message.createdTimestamp);
            if (message.attachments.first()) embed.setImage(message.attachments.first().url);
          } else {
            logAction = await getLogAction(channel.guild, channel.id, 'MESSAGE_UNPIN', time);
            if (logAction) {
              const message = await channel.messages.fetch(logAction.extra.messageId);
              if (!message || message?.deleted) {
                return;
              } else {
                embed = footer(embed, logAction).setTitle(`A message was unpinned in #${channel.name}`).setURL(message.url).setDescription(message?.content).setAuthor(logAction.target.displayName, logAction.target.user.displayAvatarURL({ dynamic: true })).setTimestamp(message?.createdTimestamp);
                if (message.attachments.first()) embed.setImage(message.attachments.first().url);
              }
            } else {embed.setTitle(`A message was pinned (or unpinned) in \`${channel.name}\``);}
          }
          await send(channel.guild, embed);
        }
      }
    })

    .addEvent('emojiCreate', async emoji => {
      if (emoji.guild) {
        const enabled = await flags(emoji.guild);
        if (enabled?.includes('Emoji Created')) {
          let embed = u.embed().setTitle(`The emoji \`:${emoji.name}:\` was created`).setImage(emoji.url).setColor(low);
          const logAction = await getLogAction(emoji.guild, emoji.id, 'EMOJI_CREATE');
          if (logAction) embed = footer(embed, logAction);
          await send(emoji.guild, embed);
        }
      }
    })
    .addEvent('emojiDelete', async emoji => {
      if (emoji.guild) {
        const enabled = await flags(emoji.guild);
        if (enabled?.includes(('Emoji Deleted'))) {
          let embed = u.embed().setTitle(`The emoji \`:${emoji.name}:\` was deleted`).setImage(emoji.url).setColor(high);
          const logAction = await getLogAction(emoji.guild, emoji.id, 'EMOJI_DELETE');
          if (logAction) embed = footer(embed, logAction);
          await send(emoji.guild, embed);
        }
      }
    })
    .addEvent('emojiUpdate', async (oldEmoji, newEmoji) => {
      if (oldEmoji.guild) {
        const time = new Date();
        const enabled = await flags(oldEmoji.guild);
        if (enabled?.includes('Emoji Updated')) {
          let embed = u.embed().setTitle(`The emoji \`:${oldEmoji.name}:\` was updated`).setColor(med).setDescription(newEmoji.toString());
          if (oldEmoji.name != newEmoji.name) embed.addField(`Name`, `Was: ${oldEmoji.name}\nIs: ${newEmoji.name}`);
          const logAction = await getLogAction(newEmoji.guild, newEmoji.id, 'EMOJI_UPDATE', time);
          if (logAction) embed = footer(embed, logAction);
          if (embed.fields.length > 0) await send(newEmoji.guild, embed);
        }
      }
    })

    .addEvent('guildBanAdd', async (ban) => {
      const { guild, user } = ban;
      const time = new Date();
      const enabled = await flags(guild);
      if (enabled?.includes('Member Banned')) {
        let embed = u.embed().setTitle(`\`${user.username}\` was banned`).setColor(high);
        const logAction = await getLogAction(guild, user.id, 'MEMBER_BAN_ADD', time);
        if (logAction) embed = footer(embed, logAction);
        await send(guild, embed);
      }
    })
    .addEvent('guildBanRemove', async (ban) => {
      const { guild, user } = ban;
      const time = new Date();
      const enabled = await flags(guild);
      if (enabled?.includes('Member Unbanned')) {
        let embed = u.embed().setTitle(`\`${user.username}\` was unbanned`).setColor(high);
        const logAction = await getLogAction(guild, user.id, 'MEMBER_BAN_REMOVE', time);
        if (logAction) embed = footer(embed, logAction);
        await send(guild, embed);
      }
    })
    .addEvent('guildMemberAdd', async member => {
      const enabled = await flags(member.guild);
      if (enabled?.includes('Member Joined')) {
        const embed = u.embed().setTitle(`\`${member.displayName}\` joined the server`).setColor(low);
        await send(member.guild, embed);
      }
    })
    .addEvent('guildMemberRemove', async member => {
      const time = new Date();
      const enabled = await flags(member.guild);
      if (enabled?.includes('Member Left')) {
        let embed = u.embed().setTitle(`\`${member.displayName}\` left the server`).setColor(high);
        let logAction = await getLogAction(member.guild, member.id, 'MEMBER_BAN_ADD', time);
        if (logAction && enabled?.includes('Member Banned')) return;
        logAction = await getLogAction(member.guild, member.id, 'MEMBER_PRUNE', time);
        if (logAction) {embed = footer(embed, logAction).setTitle(`\`${member.displayName}\` was pruned`);} else {
          logAction = await getLogAction(member.guild, member.id, 'MEMBER_KICK', time);
          if (logAction) embed = footer(embed, logAction).setTitle(`\`${member.displayName}\` was kicked`);
        }
        await send(member.guild, embed);
      }
    })
    .addEvent('guildMemberUpdate', async (oldMember, newMember) => {
      const time = new Date();
      const enabled = await flags(oldMember.guild);
      if (enabled?.includes('Member Updated')) {
        let embed = u.embed().setTitle(`\`${oldMember.user.tag}\` was updated`).setColor(med);
        if (oldMember.nickname != newMember.nickname) embed.addField(`Nickname`, `${oldMember.nickname ? oldMember.nickname : 'None'} **➔** ${newMember.nickname ? newMember.nickname : 'None'}`).setColor(med);
        if (oldMember.roles.cache != newMember.roles.cache) {
          const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.map(a => a).includes(r)).map(r => `<@&${r.id}>`);
          const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.map(a => a).includes(r)).map(r => `<@&${r.id}>`);
          if (added.length > 0) embed.addField(`Roles Added`, `${added.join('\n')}`);
          if (removed.length > 0) embed.addField(`Roles Removed`, `${removed.join('\n')}`);
        }
        const logAction = await getLogAction(newMember.guild, newMember.id, 'MEMBER_UPDATE', time);
        if (logAction) embed = footer(embed, logAction);
        if (embed.fields.length > 0) await send(newMember.guild, embed);
      }
    })
    .addEvent('guildUpdate', async (oldGuild, newGuild) => {
      const time = new Date();
      const enabled = await flags(oldGuild);
      if (enabled?.includes('Server Updated')) {
        let embed = u.embed().setTitle(`The server was modified`).setColor(high);
        if (oldGuild.afkChannelId != newGuild.afkChannelId) embed.addField(`AFK Channel`, `${oldGuild.afkChannel ?? 'None'} **➔** ${newGuild.afkChannel ?? 'None'}`);
        if (oldGuild.afkTimeout != newGuild.afkTimeout) embed.addField(`AFK Timeout`, `${oldGuild.afkTimeout} **➔** ${newGuild.afkTimeout}`);
        if (oldGuild.banner != newGuild.banner) embed.addField(`Banner`, `No information`);
        if (oldGuild.defaultMessageNotifications != newGuild.defaultMessageNotifications) embed.addField(`Default Notifications`, `${u.properCase(oldGuild.defaultMessageNotifications, true)} **➔** ${u.properCase(newGuild.defaultMessageNotifications, true)}`);
        if (oldGuild.description != newGuild.description) embed.addField(`Description`, `${oldGuild.description ?? 'None'} **➔** ${newGuild.description ?? 'None'}`);
        if (oldGuild.discoverySplash != newGuild.discoverySplash) embed.addField(`Discovery Splash`, `No information`);
        if (oldGuild.explicitContentFilter != newGuild.explicitContentFilter) embed.addField(`Explicit Content Filter`, `Was: ${u.properCase(oldGuild.explicitContentFilter, true)} **➔** ${u.properCase(newGuild.explicitContentFilter, true)}`);
        if (oldGuild.icon != newGuild.icon) embed.addField(`Icon`, `No information`);
        if (oldGuild.mfaLevel != newGuild.mfaLevel) embed.addField(`MFA Level`, `${u.properCase(oldGuild.mfaLevel)} **➔** ${u.properCase(newGuild.mfaLevel)}`);
        if (oldGuild.name != newGuild.name) embed.addField(`Name`, `${oldGuild.name} **➔** ${newGuild.name}`);
        if (oldGuild.partnered != newGuild.partnered) embed.addField(`Partnered`, `${emojify(oldGuild.partnered)} **➔** ${emojify(newGuild.partnered)}`);
        if (oldGuild.preferredLocale != newGuild.preferredLocale) embed.addField(`Preferred Locale`, `${oldGuild.preferredLocale} **➔** ${newGuild.preferredLocale}`);
        if (oldGuild.premiumSubscriptionCount != newGuild.premiumSubscriptionCount) embed.addField(`Boosts`, `Was: ${oldGuild.premiumSubscriptionCount} **➔** ${newGuild.premiumSubscriptionCount}`);
        if (oldGuild.premiumTier != newGuild.premiumTier) embed.addField(`Premium Tier`, `${u.properCase(oldGuild.premiumTier, true)} **➔** ${u.properCase(newGuild.premiumTier, true)}`);
        if (oldGuild.publicUpdatesChannelId != newGuild.publicUpdatesChannelId) embed.addField(`Community Updates Channel`, `${oldGuild.publicUpdatesChannel ?? 'None'} **➔** ${newGuild.publicUpdatesChannel ?? 'None'}`);
        if (oldGuild.rulesChannelId != newGuild.rulesChannelId) embed.addField(`Rules Channel`, `${oldGuild.rulesChannel ?? 'None'} **➔** ${newGuild.rulesChannel ?? 'None'}`);
        if (oldGuild.splash != newGuild.splash) embed.addField(`Splash Image`, `No information`);
        if (oldGuild.systemChannelId != newGuild.systemChannelId) embed.addField(`System Channel`, `${oldGuild.systemChannel ?? 'None'} **➔** ${newGuild.systemChannel ?? 'None'}`);
        if (oldGuild.vanityURLCode != newGuild.vanityURLCode) embed.addField(`Vanity URL Code`, `${oldGuild.vanityURLCode ?? 'None'} **➔** ${newGuild.vanityURLCode ?? 'None'}`);
        if (oldGuild.verificationLevel != newGuild.verificationLevel) embed.addField(`Verification Level`, `${u.properCase(oldGuild.verificationLevel, true)} **➔** ${u.properCase(newGuild.verificationLevel, true)}`);
        if (oldGuild.verified != newGuild.verified) embed.addField(`Verified`, `${emojify(oldGuild.verified)} **➔** ${emojify(newGuild.verified)}`);
        if (oldGuild.widgetChannelId != newGuild.widgetChannelId) embed.addField(`Widget Channel`, `${oldGuild.widgetChannel ?? 'None'} **➔** ${newGuild.widgetChannel ?? 'None'}`);
        if (oldGuild.widgetEnabled != newGuild.widgetEnabled) embed.addField(`Widget Enabled`, `Was: ${emojify(oldGuild.widgetEnabled)} **➔** ${emojify(newGuild.widgetEnabled)}`);
        const logAction = await getLogAction(newGuild, newGuild.id, 'GUILD_UPDATE', time);
        if (logAction) embed = footer(embed, logAction);
        if (embed.fields.length > 0) await send(newGuild, embed);
      }
    })

    .addEvent('inviteCreate', async invite => {
      if (invite.guild) {
        const time = new Date();
        const enabled = await flags(invite.guild);
        if (enabled?.includes('Invite Created')) {
          let embed = u.embed().setTitle(`An invite was created: \`${invite}\``).setColor(low);
          const logAction = await getLogAction(invite.guild, invite.code, 'INVITE_CREATE', invite.createdTimestamp);
          let reason;
          if (logAction) reason = logAction.reason;
          embed = footer(embed, { member: invite.guild.members.cache.get(invite.inviter).displayName, reason });
          if (invite.maxUses > 0) embed.addField('Max Uses', invite.maxUses);
          if (invite.maxAge > 0) embed.addField('Expires', `<t:${Math.round(time.getTime() / 1000 + invite.maxAge)}:f>`);
          if (invite.targetUser) embed.addField('Target User', invite.targetUser.tag);
          await send(invite.guild, embed);
        }
      }
    })
    .addEvent('inviteDelete', async invite => {
      if (invite.guild) {
        const time = new Date();
        if (invite.expiresAt > time) {
          const enabled = await flags(invite.guild);
          if (enabled?.includes('Invite Deleted')) {
            let embed = u.embed().setTitle(`Invite \`${invite}\` was deleted`).setColor(med);
            const logAction = await getLogAction(invite.guild, invite.targetUser.id, 'INVITE_DELETE', time);
            if (logAction) embed = footer(embed, logAction);
            await send(invite.guild, embed);
          }
        }
      }
    })

    .addEvent('messageDeleteBulk', async messages => {
      if (messages.first().guild) {
        const time = new Date();
        const enabled = await flags(messages.first().guild);
        if (enabled?.includes('Messages Bulk Deleted')) {
          const msg = messages.first();
          let logAction = await getLogAction(msg.guild, msg.author.id, 'MEMBER_BAN_ADD', time);
          if (!logAction) {
            let embed = u.embed().setTitle(`\`${messages.size}\` messages were bulk deleted in \`#${messages.first().channel.name}\``).setColor(med);
            logAction = await getLogAction(msg.guild, msg.channel.id, 'MESSAGE_BULK_DELETE', time, null, 5000);
            if (logAction) embed = footer(embed, logAction);
            await send(messages.first().guild, embed);
          }
        }
      }
    })

    .addEvent('roleCreate', async role => {
      const enabled = await flags(role.guild);
      if (enabled?.includes('Role Created')) {
        let embed = u.embed().setTitle(`The \`${role.name}\` role was created`).setDescription(`${role}`).setColor(low);
        const logAction = await getLogAction(role.guild, role.id, 'ROLE_CREATE');
        if (logAction) embed = footer(embed, logAction);
        await send(role.guild, embed);
      }
    })
    .addEvent('roleDelete', async role => {
      const enabled = await flags(role.guild);
      if (enabled?.includes('Role Deleted')) {
        let embed = u.embed().setTitle(`The \`${role.name}\` role was deleted`).setColor(high);
        const logAction = await getLogAction(role.guild, role.id, 'ROLE_DELETE');
        if (logAction) embed = footer(embed, logAction);
        await send(role.guild, embed);
      }
    })
    .addEvent('roleUpdate', async (oldRole, newRole) => {
      const enabled = await flags(oldRole.guild);
      if (enabled?.includes('Role Updated')) {
        const embed = u.embed().setTitle(`The role \`${oldRole.name}\` was modified`).setColor(med);
        if (oldRole.hexColor != newRole.hexColor) embed.addField(`Color`, `${oldRole.hexColor} **➔** ${newRole.hexColor}`).setColor(newRole.hexColor);
        if (oldRole.hoist != newRole.hoist) embed.addField(`Display Seperately`, `${emojify(oldRole.hoist)} **➔** ${emojify(newRole.hoist)}`);
        if (oldRole.permissions != newRole.permissions) {
          const newAllow = newRole.permissions.toArray().filter(p => !oldRole.permissions.toArray().includes(p));
          const newDeny = oldRole.permissions.toArray().filter(p => !newRole.permissions.toArray().includes(p));
          if (newAllow.length > 0) embed.addField('Added Permissions', newAllow.map(p => u.properCase(p, true)).join('\n'));
          if (newDeny.length > 0) embed.addField('Removed Permissions', newDeny.map(p => u.properCase(p, true)).join('\n'));
        }
        if (oldRole.position != newRole.position) embed.addField(`Position`, `${oldRole.position} **➔** ${newRole.position}`);
        if (embed.fields.length > 0) await send(newRole.guild, embed);
      }
    })

    .addEvent('rateLimit', async (rateLimitInfo) => {console.log(rateLimitInfo);});

module.exports = Module;