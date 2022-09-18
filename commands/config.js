/* eslint-disable no-inner-declarations */
const Augur = require('augurbot');
const { onlyEmoji } = require('emoji-aware');
const u = require('../utils/utils');
const Module = new Augur.Module();

const time = 5000 * 60;
const defaultThreshold = 8;

Module.addInteractionCommand({ name: 'config',
  commandId: '970061388502433792',
  onlyGuild: true,
  category: "Mod",
  permissions: (int) => int.member?.permissions.has('MANAGE_GUILD'),
  process: async (int) => {
    try {
      const timeoutEmbed = u.embed().setTitle("Time's Up!").setDescription("I got tired of waiting around for you to hit a button.\nIf you want to continue configuring, use the command again.");
      const saveErrorEmbed = u.embed().setTitle("I had a problem saving that").setDescription("Sorry about this. I've let my developers know, so it should be fixed soon.");
      switch (int.options.getSubcommand()) {
      case "channels": return channels();
      case "starboards": return starboards();
      case "roles": return roles();
      case "filter": return filter();
      case "prefix": return prefix();
      }

      async function channels() {
        const type = int.options.getString('type');
        let newChannel = int.options.getChannel('channel');
        if (!newChannel.isTextBased() && type != 'modcategory') return int.reply({ content: "The channel needs to be text based!" });
        else if (newChannel.type != 4 && type == 'modcategory') return int.reply({ content: "The channel needs to be category!" });
        const currentChannel = int.guild.channels.cache.get(await u.db.guildConfig.snowflakes.getChannel(int.guild.id, type));
        if (currentChannel?.id == newChannel?.id) newChannel = null;

        let embed;
        const botLobby = u.embed().setTitle("Bot Lobby").setDescription(`Bot lobby updated!\nLarge bits of text will now be sent in ${newChannel ?? 'the channel the command is used in'}${currentChannel ? ` instead of ${currentChannel}.` : '.'}`);
        const modCategory = u.embed().setTitle(`Mod Logs Channel ${newChannel ? "Saved" : "Disabled"}`).setDescription(`Mod channels will ${newChannel ? ` be identified by ${newChannel} ${currentChannel ? `instead of ${currentChannel}.` : ""}` : 'not be identified.'}`);
        const modLogs = u.embed().setTitle(`Mod Logs Channel ${newChannel ? "Saved" : "Disabled"}`).setDescription(`Mod logs will ${newChannel ? ` be sent in ${newChannel} ${currentChannel ? `instead of ${currentChannel}.` : ""}` : 'not be sent. This has also turned off the language filter and message reporting.'}`);
        const muteChannel = u.embed().setTitle("Bot Lobby").setDescription(`Mute Channel updated!\n${newChannel ? `Users will be pinged in a thread in ${newChannel} upon mute` : "Users won't be pinged upon mute"}${currentChannel ? ` instead of in ${currentChannel}.` : '.'}`);

        switch (type) {
        case "botLobby": return embed = botLobby;
        case "modCategory": return embed = modCategory;
        case "modLogs": return embed = modLogs;
        case "muteChannel": return embed = muteChannel;
        }
        if (embed) {
          const saved = await u.db.guildConfig.snowflakes.saveChannel(int.guild.id, newChannel?.id ?? '', type);
          if (saved) return int.reply({ embeds: [embed], ephemeral: true });
          else return int.reply({ content: "I wasn't able to save that. Please try again later." });
        } else {
          return int.reply({ content: "That's not one of the options.", ephemeral: true });
        }
      }

      async function starboards() {
        await int.deferReply({ ephemeral: true });
        const existingBoards = await u.db.guildConfig.starboards.get(int.guild.id);
        const action = int.options.getString('action');
        const channel = int.options.getChannel('channel');
        const emoji = int.options.getString('emoji');
        let priority = int.options.getChannel('priority');
        const threshold = int.options.getInteger('threshold');
        const change = int.options.getChannel('changechannel');
        switch (action) {
        case 'create': return createBoard();
        case 'modify': return modifyBoard();
        case 'disable': return removeBoard();
        }
        async function createBoard() {
          if (existingBoards?.length >= 5) return int.editReply({ embeds: [u.embed().setTitle('Max Starboards Reached').setDescription("You can't have more than 5 starboards at a time.")] });
          if (existingBoards.find(b => b.channel == channel.id)) return int.editReply("This channel is already a star board!");
          if (!channel?.isTextBased()) return int.editReply("The new channel has to be a text channel!");
          if (!emoji || !threshold) return int.editReply("I need some emoji and a threshold!");
          if (threshold < defaultThreshold) return int.editReply("The threshold has to be greater than " + defaultThreshold);

          const existingEmoji = existingBoards.filter(b => b.channel != channel).map(b => b.reactions).flat();
          const mapped = [...new Set(emoji.split(' ').map(e => u.getEmoji(e)?.id ?? onlyEmoji(e)?.[0]))];
          const duplicates = mapped.filter(m => existingEmoji.includes(m));
          const nonDup = mapped.filter(m => !existingEmoji.includes(m));

          if (duplicates.length > 0) return int.editReply(`The following emojis are already being used by another board!\n${duplicates.join(' ')}`);

          const board = { channel, reactions: nonDup, whitelist: priority, toPost: threshold };
          if (await u.db.guildConfig.starboards.save(int.guild.id, board) == null) return int.editReply({ embeds: [saveErrorEmbed] });

          const embed = u.embed().setDescription(`${channel} is now a starboard!\nReactions: ${nonDup.map(a => int.guild.emojis.cache.get(a) || a).join(' ')}`);
          if (priority) embed.setDescription(`Messages in ${priority} will go to this channel once they reach the reaction threshold, assuming another board doesn't have the emoji`);
          return int.editReply({ embeds: [embed] });
        }
        async function modifyBoard() {
          const oldBoard = existingBoards.find(b => b.channel == channel.id);
          if (!oldBoard) return int.editReply("This channel isn't a star board!");
          if (!change?.isTextBased()) return int.editReply("The new channel has to be a text channel!");
          if (!emoji && !priority && !threshold && !change) return int.editReply("Please provide some options.");
          if (threshold && threshold < defaultThreshold) return int.editReply("The threshold has to be greater than " + defaultThreshold);

          let finalEmoji = oldBoard.reactions;
          if (priority?.id == oldBoard.whitelist) priority = null;

          if (emoji) {
            const existingEmoji = existingBoards.filter(b => b.channel != channel).map(b => b.reactions).flat();
            const mapped = [...new Set(emoji.split(' ').map(e => u.getEmoji(e)?.id ?? onlyEmoji(e)?.[0]))];
            const duplicates = mapped.filter(m => existingEmoji.includes(m));
            finalEmoji = mapped.filter(m => !existingEmoji.includes(m));
            if (duplicates.length > 0) return int.editReply(`The following emojis are already being used by another board!\n${duplicates.join(' ')}`);
          }
          const board = { channel: change?.id ?? oldBoard.channel, reactions: finalEmoji, whitelist: priority != null ? priority : oldBoard.whitelist, toPost: threshold ?? oldBoard.toPost };
          if (await u.db.guildConfig.starboards.save(int.guild.id, board) == null) return int.editReply({ embeds: [saveErrorEmbed] });

          const oldPriority = oldBoard.whitelist ? `<#${oldBoard.whitelist}>` : 'None';
          const embed = u.embed().setDescription(`${channel} has been modified!\nReactions: ${finalEmoji.map(a => int.guild.emojis.cache.get(a) || a).join(' ')}`);
          if (change) embed.addFields([{ name: "Channel", value: `Was: ${oldBoard.channel}\nIs: ${change}` }]);
          if (emoji) embed.addFields([{ name: "Emoji", value: `Was: ${oldBoard.reactions.join(' ')}\nIs: ${finalEmoji}` }]);
          if (priority) embed.addFields([{ name: "Priority", value: `Was: ${oldPriority}\nIs: ${priority ?? "None"}` }]);
          if (threshold) embed.addFields([{ name: "Threshold", value: `Was: ${oldBoard.toPost}\nIs: ${threshold}` }]);
          return int.editReply({ embeds: [embed] });
        }
        async function removeBoard() {
          const board = existingBoards.find(b => b.channel == channel.id);
          if (!board) return int.editReply({ embeds: [u.embed().setTitle("Invalid Starboard").setDescription(`That wasn't one of the boards. Please try again.\nIt should look something like ${int.channel}`)], ephemeral: true });
          const confirmEmbed = u.embed().setTitle("Are you sure you want to do this?")
          .setDescription(`<#${board.channel}> will no longer have starred posts go to it. If you just need to change some settings or have posts sent to a different channel, try modifying instead.`)
          .setFooter("Removing the starboard won't delete the actual channel");
          const buttons = u.actionRow().addComponents([
            u.button().setLabel('Cancel').setCustomId('cancel').setStyle(2),
            u.button().setLabel('Delete').setCustomId('delete').setStyle(4),
          ]);
          const prompt = await int.followUp({ embeds: [confirmEmbed], components: [buttons] });
          const response = await u.awaitButton(prompt, int, time);
          await response.deferReply();
          await response.deleteReply();
          switch (response.customId) {
          case "cancel": return cancel();
          case "delete": return remove();
          case "time": return int.followUp({ embeds: [timeoutEmbed] });
          }
          async function cancel() {
            const embed = u.embed().setTitle("Removal Canceled").setDescription(`<#${board.channel}> will remain as a starboard`);
            return int.followUp({ embeds: [embed] });
          }
          async function remove() {
            const embed = u.embed().setTitle("Starboard Removed").setDescription(`Starred posts will no longer be sent to <#${board.channel}>`);
            if ((await u.db.guildConfig.starboards.delete(int.guild.id, board.channel)) == null) return await int.followUp({ embeds: [saveErrorEmbed] });
            return await int.followUp({ embeds: [embed] });
          }
        }
      }

      async function roles() {
        const type = int.options.getString('type');
        let newRole = int.options.getRole('role');
        const currentRole = int.guild.channels.cache.get(await u.db.guildConfig.snowflakes.getRole(int.guild.id, type));
        if (currentRole?.id == newRole?.id) newRole = null;

        let embed;
        const muted = u.embed().setTitle("Muted Role").setDescription(`Muted role updated!\n${newRole ? `Users will recieve the ${newRole} role when commands such as \`/mod mute\` are used${currentRole ? `, instead of ${currentRole}.` : '.'}` : "Since no role was provided, this has disabled mute related commands."}`);
        const trusted = u.embed().setTitle("Trusted Role").setDescription(`Trusted role updated!\n${newRole ? `Users will recieve the ${newRole} role when commands such as \`/mod trust\` are used${currentRole ? `, instead of ${currentRole}.` : '.'}` : "Since no role was provided, this has disabled trust and trust+ related commands."}`);
        const trustplus = u.embed().setTitle("Trusted+ Role").setDescription(`Trusted+ role updated!\n${newRole ? `Users will recieve the ${newRole} role when commands such as \`/mod trustplus\` are used${currentRole ? `, instead of ${currentRole}.` : '.'}` : "Since no role was provided, this has disabled trust+ related commands."}`);
        const untrusted = u.embed().setTitle("Untrusted Role").setDescription(`Untrusted role updated!\n${newRole ? `Users will recieve the ${newRole} role when commands such as \`/mod watch\` are used${currentRole ? `, instead of ${currentRole}.` : '.'}` : "Since no role was provided, this has disabled watching related commands."}`);
        const mods = u.embed().setTitle("Mod Role").setDescription(`Mod role updated!\n${newRole ? `Users with the ${newRole} role will be able to use mod commands${currentRole ? `, instead of ${currentRole}.` : '.'}` : "Since no role was provided, this has disabled some moderation related features."}`);

        switch (type) {
        case "muted": return embed = muted;
        case "trusted": return embed = trusted;
        case "trustPlus": return embed = trustplus;
        case "untrusted": return embed = untrusted;
        case "mod": return embed = mods;
        }

        if (embed) {
          const saved = await u.db.guildConfig.snowflakes.saveRole(int.guild.id, newRole?.id ?? '', type);
          if (saved) return int.reply({ embeds: [embed], ephemeral: true });
          else return int.reply({ content: "I wasn't able to save that. Please try again later.", ephemeral: true });
        } else {
          int.reply({ content: "That's not one of the options", ephemeral: true });
        }
      }

      async function filter() {
        await int.deferReply({ ephemeral: true });
        const status = int.options.getBoolean("status");
        const oldFilter = await u.db.guildConfig.filter.get(int.guild.id);
        if (await u.db.guildConfig.filter.save(int.guild.id, status) == null) return int.editReply({ embeds: [saveErrorEmbed] });
        const embed = u.embed().setTitle("Language Filter Updated")
          .setDescription(`The filter is now ${status ? 'on' : 'off'} ${status == oldFilter ? "(Nothing changed)" : ""}`)
          .setFooter("The language filter looks at messages, usernames/nicknames, and statuses");
        return await int.editReply({ embeds: [embed] });
      }

      async function prefix() {
        await int.deferReply({ ephemeral: true });
        const input = int.options.getString('prefix');
        const read = await u.db.guildConfig.prefix.get(int.guild.id);

        if (input == read) return int.editReply(`The prefix is already \`${input}\``);
        if (!input) return int.editReply(`The prefix is \`${read}\``);
        if (input.length > 3) return int.editReply("you cannot have a prefix of more than 3 characters.");

        const newPrefix = await u.db.guildConfig.prefix.save(int.guild.id, input);
        return int.editReply(`Changed the prefix to \`${newPrefix}\``);
      }
    } catch (error) {
      return u.errorHandler(error, int);
    }
  }
});
module.exports = Module;