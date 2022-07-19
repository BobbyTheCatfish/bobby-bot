const Augur = require('augurbot'),
  u = require('../utils/utils');
function toEpoch(time) {return `<t:${Math.floor(time / 1000)}>`;}
const cType = [
  "Text",
  "DM",
  "Voice",
  "Group DM",
  "Category",
  "News",
  "", "", "", "",
  "News Thread",
  "Public Thread",
  "Private Thread",
  "Stage",
  "Directory",
  "Forum"
];
const Module = new Augur.Module();
Module.addInteractionCommand({ name: 'get',
  commandId: "998829106206605342",
  process: async (int) => {
    try {
      const info = int.options.getString('general-info');
      const member = int.guild.members.cache.get(int.options.getUser('member')?.id);
      const role = int.guild.roles.cache.get(int.options.getRole('role')?.id);
      const emoji = int.options.getString('emoji');
      const channel = int.guild.channels.cache.get(int.options.getChannel('channel')?.id);
      const ban = int.options.getString('ban');
      const getServer = async () => {
        const guild = int.guild;
        const embed = u.embed().setTitle(guild.name)
        .addFields([
          { name: 'Owner', value: (await guild.fetchOwner())?.displayName || 'Unknown', inline: true },
          { name: 'Description', value: guild.description || 'None', inline: true },
          { name: 'Name Acronym', value: guild.nameAcronym || 'Unknown', inline: true },
          { name: 'Created at', value: toEpoch(guild.createdTimestamp) ?? 'Unknown', inline: true },
          { name: 'ID', value: guild.id || 'Unknown', inline: true },
          { name: 'Members', value: guild.memberCount.toString() ?? 'Unknown', inline: true },
          { name: 'Online', value: guild.presences.cache.filter(o => o.status == 'online').values().length?.toString() || 'Unknown', inline: true },
          { name: 'Large', value: guild.large.toString() ?? 'Unknown', inline: true },
          { name: 'Content Filter', value: guild.explicitContentFilter.toString() || 'Unknown', inline: true },
          { name: '2FA Level', value: guild.mfaLevel.toString() ?? 'Unknown', inline: true },
          { name: 'Verification Level', value: guild.verificationLevel.toString() || 'Unknown', inline: true },
          { name: 'Partnered', value: guild.partnered.toString() || 'Unknown', inline: true },
          { name: 'Boost Count', value: guild.premiumSubscriptionCount.toString() || 'Unknown', inline: true },
          { name: 'Boost Tier', value: guild.premiumTier.toString() || 'Unknown', inline: true },
          { name: 'Verified', value: guild.verified.toString() || 'Unknown', inline: true },
          { name: 'Default Pings', value: guild.defaultMessageNotifications == 0 ? 'All messages' : 'Mentions' || 'Unknown', inline: true },
          { name: 'Vanity URL Code', value: guild.vanityURLCode?.toString() || 'None', inline: true },
          { name: 'AFK timeout', value: `${(guild.afkTimeout) / 60} minute${(guild.afkTimeout) / 60 == 1 ? '' : 's'}` || 'Unknown', inline: true },
          { name: 'AFK channel', value: guild.afkChannel ? guild.afkChannel.name : 'None' || 'Unknown', inline: true },
          { name: 'Rules Channel', value: guild.rulesChannel ? guild.rulesChannel.toString() : 'None' || 'Unknown', inline: true },
          { name: 'System Channel', value: guild.systemChannel ? guild.systemChannel.toString() : 'None' || 'Unknown', inline: true },
          { name: 'Public Updates Channel', value: guild.publicUpdatesChannel ? guild.publicUpdatesChannel.toString() : 'None' || 'Unknown', inline: true },
          { name: 'Widget Channel', value: guild.widgetChannel ? guild.widgetChannel.toString() : 'None' || 'Unknown', inline: true },
        ]).setThumbnail(guild.iconURL({ size: 128 }));
        if (guild.discoverySplashURL) embed.setImage(guild.discoverySplashURL());
        return int.reply({ embeds: [embed], ephemeral: true });
      };
      const getMember = () => {
        if (!member) {
          const object = int.guild.members.cache;
          const bots = object.filter(o => o.user.bot).size;
          const statuses = (s) => `${object.filter(o => o.presence?.status == s).size}`;
          const embed = u.embed().setTitle(`There are \`${int.guild.memberCount}\` members in your server, \`${bots}\` of which are bots`);
          const online = statuses('online');
          const idle = statuses('idle');
          const dnd = statuses('dnd');
          const offline = int.guild.memberCount - online - idle;
          embed.addFields([
            { name: 'Online', value: online },
            { name: 'Idle', value: idle },
            { name: 'Do Not Disturb', value: dnd },
            { name: 'Offline/Invis', value: `${offline} (approx)` },
            { name: 'Partial Members', value: `${object.filter(o => o.partial).size}` },
            { name: 'Pending Members', value: `${object.filter(o => o.pending).size}` },
          ]);
          if (object.size == 0) return int.reply({ content: "While theoretically impossible, it appears that there aren't any members in your server...", ephemeral: true });
          else return int.reply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = u.embed();
          const a = member.presence?.activities;
          embed.setTitle(`${member.displayName || 'Unknown'} (${member.user.tag || ''})`)
          .setColor(member.displayColor || null)
          .setThumbnail(member.displayAvatarURL({ size: 32, dynamic: true }))
          .addFields([
            { name: 'Roles', value: member.roles.cache.map(r => r).sort((d, e) => e.rawPosition - d.rawPosition).join("\n") || 'None', inline: true },
            { name: 'Joined', value: toEpoch(member.joinedTimestamp) || 'Unknown', inline: true },
            { name: 'Account Created', value: toEpoch(member.user.createdTimestamp) || 'Unknown', inline: true },
            { name: 'Partial Member', value: member.partial.toString(), inline: true },
            { name: 'Pending Member', value: member.pending.toString(), inline: true },
            { name: 'Bot', value: member.user.bot.toString(), inline: true },
            { name: 'ID', value: member.id || 'Unknown', inline: true },
            { name: 'Activity', value: member.presence ? `${member.presence?.status}\n${a.length > 0 ? a.map(ac => `Type: \`${ac.type}\`\nStatus: ${ac.state ?? ac.name}`).join('\n') : ''}` : 'None' },
          ]);
          if (member.premiumSince) embed.addFields([{ name: 'Boosting since', value: toEpoch(member.premiumSinceTimestamp) ?? 'Unknown', inline: true }]);
          return int.reply({ embeds: [embed], ephemeral: true });
        }
      };
      const getRole = () => {
        if (!role) {
          const object = int.guild.roles.cache.toJSON().join("\n");
          const embed = u.embed().setTitle(`There are \`${int.guild.roles.cache.size}\` roles in your server.`).setDescription(object);
          if (object.length == 0) return int.channel.send("Looks like you don't have any roles.");
          else return int.reply({ embeds: [embed], ephemeral: true });
        } else {
          let hasRole = role.members.toJSON().join(`\n`);
          if (!hasRole) hasRole = 'Nobody';
          const embed = u.embed().setTitle(role.name).setColor(role.color || null)
          .addFields([
            { name: 'ID', value: role.id || 'Unknown', inline: true },
            { name: 'Created At', value: toEpoch(role.createdTimestamp) || 'Unknown', inline: true },
            { name: 'Managed Externally', value: role.managed.toString(), inline: true },
            { name: 'Hoisted', value: role.hoist.toString(), inline: true },
            { name: 'Mentionable', value: role.mentionable.toString(), inline: true },
            { name: 'Members', value: int.guild.roles.everyone == role ? 'Everyone' : hasRole || 'Nobody', inline: true },
            { name: 'Position', value: (int.guild.roles.cache.size - role.position).toString() || 'Unknown', inline: true },
          ]);
          if (role.unicodeEmoji) embed.addFields([{ name: 'Unicode Emoji', value: role.unicodeEmoji, inline: true }]);
          if (role.tags?.botId) embed.addFields([{ name: 'Bot Role For', value: `<@${role.tags.botId}>`, inline: true }]);
          if (role.tags?.integrationId) embed.addFields([{ name: 'Integration Role For', value: role.tags.integrationId, inline: true }]);
          if (role.tags?.premiumSubscriberRole) embed.addFields([{ name: 'Booster Role', value: 'true' }]);
          if (role.icon) embed.setThumbnail(role.iconURL());
          return int.reply({ embeds: [embed], ephemeral: true });
        }
      };
      const getEmoji = async () => {
        if (!emoji) {
          const object = int.guild.emojis.cache;
          const embed = u.embed().setTitle(`There are \`${object.size}\` emojis in your server.`).setDescription(object.map(e => e).join("  "));
          if (object.size == 0) return int.reply({ content: "Looks like your server doesn't have any emojis.", ephemeral: true });
          else return int.reply({ embeds: [embed], ephemeral: true });
        } else {
          const object = int.client.emojis.cache.find(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` == emoji.replace(/ /g, '') || e.name.toLowerCase().replace(/~ /g, '') == emoji.toLowerCase().replace(/~ /g, '') || e.id == emoji);
          if (!object) return int.reply({ content: "Couldn't find that emoji.", ephemeral: true });
          const embed = u.embed().addFields([
            { name: 'Name', value: object.name || 'Unknown', inline: true },
            { name: 'Managed Externally', value: object.managed.toString(), inline: true },
            { name: 'ID', value: object.id || 'Unknown', inline: true },
            { name: 'Created by', value: (await object.fetchAuthor())?.username || 'Unknown', inline: true },
            { name: 'Animated', value: object.animated.toString(), inline: true },
            { name: 'Created at', value: toEpoch(object.createdTimestamp) || 'Unknown', inline: true },
            { name: 'Exclusive to roles', value: object.roles.cache.map(r => r.name).join(`\n`) || 'None', inline: true },
          ]);
          if (object.guild.id != int.guildId) embed.addFields([{ name: 'Server', value: object.guild.name, inline: true }]);
          if (object.url) embed.setImage(object.url);
          return int.reply({ embeds: [embed], ephemeral: true });
        }
      };
      const getChannel = async () => {
        if (!channel) {
          const categories = int.guild.channels.cache.filter(b => b.type == 4);
          const noParents = int.guild.channels.cache.filter(b => !b.parent?.id && b.type != 4).sort((a, b) => a.name.localeCompare(b.name));
          let content = "";
          if (noParents.size > 0) content += (noParents.toJSON().join('\n'));
          if (categories.size > 0) {
            for (const category of categories.toJSON().sort((a, b) => a.name.localeCompare(b.name))) {
              const children = [];
              if (category.children?.cache.size > 0) {
                let sorted = [];
                sorted = sorted.concat(category.children.cache.filter(c => !c.isVoiceBased()).sort((a, b) => a.name.localeCompare(b.name)).toJSON());
                sorted = sorted.concat(category.children.cache.filter(c => c.isVoiceBased()).sort((a, b) => a.name.localeCompare(b.name)).toJSON());
                children.push(sorted);
              }
              if (children.length > 0) content += (`\n\n${category}\n${children.map(c => `➡️ ${c}`)}`);
            }
          }
          const embed = u.embed().setTitle(`There are \`${int.guild.channels.cache.size}\` channels in your server.`).setDescription(`${content ?? "No channels?"}`);
          if (!content) return int.reply({ content: "no channels found", ephemeral: true });
          else return int.reply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = u.embed().setTitle(`#${channel.name}`)
          .addFields([
            { name: 'ID', value: channel.id, inline: true },
            { name: 'Category', value: channel.parent || 'None', inline: true },
            { name: 'Created at', value: toEpoch(channel.createdTimestamp) || 'Unknown', inline: true },
            { name: 'Type', value: cType[channel.type], inline: true }
          ]);
          if (channel.isVoiceBased()) {
            embed.addFields([
              { name: 'Bitrate', value: channel.bitrate?.toString() || 'Unknown', inline: true },
              { name: 'User Limit', value: channel.userLimit?.toString() || 'None', inline: true },
              { name: 'Members in the VC', value: channel.members.toJSON().join('\n') || 'None', inline: true }
            ]);
          } else if (channel.isTextBased()) {
            if (channel.isThread()) {
              embed.addFields([
                { name: 'Thread Channel', value: 'true', inline: true },
                { name: 'Archived', value: toEpoch(channel.archiveTimestamp()) ?? channel.archived.toString() },
                { name: 'Auto Archive', value: `${channel.autoArchiveDuration / 1440} Day(s)`, inline: true },
                { name: 'Invitable', value: (channel.invitable ?? 'PUBLIC').toString(), inline: true },
                { name: 'Locked', value: channel.locked.toString() },
                { name: 'Members', value: channel.members.size.toString(), inline: true },
                { name: 'Created By', value: (await channel.fetchOwner())?.toString(), inline: true }
              ]);
            } else if (!channel.isDMBased()) {
              embed.addFields([
                { name: 'Description', value: channel.topic || 'Unknown', inline: true },
                { name: 'NSFW', value: `${channel.nsfw ?? 'false'}`, inline: true },
              ]);
              if (int.guild.rulesChannel?.id == channel.id) embed.addFields([{ name: "Rules Channel", value: "true", inline: true }]);
            }
            embed.addFields([
              { name: 'Last pin at', value: channel.lastPinAt || 'N/A', inline: true },
              { name: 'Slowmode', value: channel.rateLimitPerUser || 'None', inline: true }
            ]);
          }
          return int.reply({ embeds: [embed], ephemeral: true });
        }
      };
      const getBan = async () => {
        const get = await int.guild.bans.fetch();
        if (!ban) {
          const object = get.map(us => us.user).join('\n');
          const plural = get.size == 1;
          const embed = u.embed().setTitle(`There ${plural ? 'is' : 'are'} \`${get.size}\` banned user${plural ? '' : 's'} in your server`);
          if (object.length > 0) embed.setDescription(object);
          return int.reply({ embeds: [embed], ephemeral: true });
        } else {
          const object = get.find(b => b.user.username.toLowerCase() == ban || b.user.id == ban || b.user.tag.toLowerCase() == ban.toLowerCase());
          if (!object) return int.reply({ content: "I couldn't find that user.", ephemeral: true });
          const embed = u.embed().setTitle(object.user.username).addFields([
            { name: 'ID', value: object.user.id || 'Unknown', inline: true },
            { name: 'Created at', value: toEpoch(object.user.createdTimestamp), inline: true },
            { name: 'Activity', value: object.user.presence?.status ?? "Unknown", inline: true },
            { name: 'Bot', value: object.user.bot.toString(), inline: true },
            { name: 'Partial user', value: object.user.partial.toString(), inline: true },
            { name: 'Ban reason', value: object.reason ?? 'None given', inline: true }
          ]).setThumbnail(object.user.displayAvatarURL({ size: 64 }));
          int.reply({ embeds: [embed], ephemeral: true });
        }
      };
      if (!int.guild) return int.reply({ content: "This has to be used in a server!", ephemeral: true });
      if (!info && !member && !role && !emoji && !channel && !ban) return int.reply({ ephemeral: true, content: "You need to give me something to work with." });
      if (info == "server") return getServer();
      if (info == "members" || member) return getMember();
      if (info == "roles" || role) return getRole();
      if (info == "emojis" || emoji) return getEmoji();
      if (info == "channels" || channel) return getChannel();
      if (info == "bans" || ban) return getBan();
    } catch (e) {
      return u.errorHandler(e, int);
    }
  }
});

module.exports = Module;