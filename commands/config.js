/* eslint-disable no-inner-declarations */
/* THINGS TO ADD
    member activity log channel
    member actiivty log toggles
    add main property to sb, only one can have it per guild
    language filter
    //muted role
*/
// N C D U CD CU DU CDU
// 0 1 2 3 4  5  6  7
// 0000000
const Augur = require('augurbot');
const { onlyEmoji } = require('emoji-aware');
const u = require('../utils/utils');
const { ButtonStyle } = require('discord.js');
// const { events } = require( '../jsons/events.json');
const Module = new Augur.Module();
// let configuring = [];
// const roleFilter = m => m.guild.roles.cache.get(m.content.replace(/[^0-9]/g, '')) || m.content.toLowerCase() == 'none';
// const contentOptions = (m, i) => ({ filter: contentFilter(m, i), max: 1, time, errors: ['time'] });
const time = 5000 * 60;


Module.addInteractionCommand({ name: 'config',
  commandId: '970061388502433792',
  onlyGuild: true,
  category: "Mod",
  process: async (int) => {
    try {
      console.log(int.locale);
      const contentFilter = (m) => m.content && m.author.id == int.user.id;
      const timeoutEmbed = u.embed().setTitle("Time's Up!").setDescription("I got tired of waiting around for you to hit a button.\nIf you want to continue configuring, use the command again.");
      const saveErrorEmbed = u.embed().setTitle("I had a problem saving that").setDescription("Sorry about this. I've let my developers know, so it should be fixed soon.");
      const channelFilter = m => int.guild.channels.cache.get(m.content.replace(/[^0-9]/g, '')) || m.content.toLowerCase() == 'none';
      switch (int.options.getString('setting', true)) {
      case "channel": return channel();
      case "star": return starboards();
      case "logs": return logging();
      case "roles": return;
      case "filter": return filter();
      }

      async function channel() {
        async function input(embed, embed2, saveFunct, errMsg) {
          int.followUp({ embeds: [embed], components: [] });
          const selectedChannel = await channelInput();
          if (typeof await saveFunct(int.guild.id, selectedChannel?.id) == Error) {
            u.errorHandler(errMsg, int);
            return int.followUp({ embeds: [saveErrorEmbed] });
          }
          int.followUp({ embeds: [embed2(selectedChannel)] });
        }
        async function botLobby() {
          const currentChannel = int.guild.channels.cache.get(await u.db.guildconfig.getBotLobby(int.guild.id));
          const embed = u.embed().setTitle("Bot Lobby").setDescription(`What channel should be used for large bits of text? ${currentChannel ? `\nThe current channel is ${currentChannel}` : ''}`).setFooter('Pro Tip: type none to disable this feature');
          const embed2 = s => u.embed().setTitle(`Bot Lobby ${s.id ? "Saved" : "Disabled"}`).setDescription(`Large bits of text will be sent ${s.id ? `in ${s}` : 'in the channel the command is used in'}`);
          return await input(embed, embed2, u.db.guildconfig.saveBotLobby, "Bot Lobby DB Save Error");
        }
        async function modLogs() {
          const currentChannel = int.guild.channels.cache.get(await u.db.guildconfig.getModLogs(int.guild.id));
          const embed = u.embed().setTitle("Mod Logs Channel").setDescription(`What channel should things like user updates, possible language, and reported messages be sent to? ${currentChannel ? `\nThe current channel is ${currentChannel}` : ''}`).setFooter('Pro Tip: type none to disable this feature');
          const embed2 = s => u.embed().setTitle(`Mod Logs Channel ${s.id ? "Saved" : "Disabled"}`).setDescription(`Mod logs will ${s.id ? ` be sent in ${s}` : 'not be sent. This has disabled user reporting.\nIf you\'re using the language filter feature, offending messages will be deleted and the user may be muted if they trigger the filter enough times.'}`);
          return await input(embed, embed2, u.db.guildconfig.saveModLogs, 'Mod Logs DB Save Error');
        }
        const embed = u.embed().setTitle("Which channel do you want to change?");
        const buttons = u.actionRow().addComponents([
          u.button().setCustomId("bot").setLabel("Bot Lobby").setStyle(ButtonStyle.Primary),
          u.button().setCustomId("modlogs").setLabel("Mod Logs").setStyle(ButtonStyle.Primary)
        ]);
        let prompt;
        if (!int.replied) prompt = await int.reply({ embeds: [embed], components: [buttons], fetchReply: true });
        else prompt = await int.followUp({ embeds: [embed], components: [buttons], fetchReply: true });
        const result = await u.awaitButton(prompt, int, time);
        await result.deferReply();
        await result.deleteReply();
        switch (result.customId) {
        case "bot": return await botLobby();
        case "modlogs": return await modLogs();
        case "time": {
          return await int.followUp({ embeds: [timeoutEmbed] });
        }
        }
      }
      async function channelInput(resultFilter = function() {return true;}, embed) {
        const badChannel = u.embed().setTitle("Invalid channel").setDescription(`Please try again. It should look something like ${int.channel} \n\n(or \`none\`)`);
        embed ??= badChannel;
        const collected = (await u.awaitMessage(int, { filter: channelFilter, max: 1, time, errors: ['time'] }))?.first();
        const content = collected.content;
        if (!collected) {
          int.followUp({ embeds: [timeoutEmbed] });
          return false;
        }
        if (!resultFilter(collected)) {
          int.followUp({ embeds: [embed] });
          return await channelInput(collected);
        }
        return int.guild.channels.cache.get(content.replace(/[^0-9]/g, '')) || content.toLowerCase();
      }
      async function starboards() {
        const existingBoards = await u.db.guildconfig.getStarBoards(int.guild.id);
        // let boardFilter = m => existingBoards?.find(b => b.channel == m.content.replace(/[^0-9]/g, ''))
        let newBoard = {};
        async function reactions(editing) {
          const existingEmoji = existingBoards.filter(b => b.channel != newBoard.channel).map(b => b.reactions).flat();
          const reacts = [];
          const embed = u.embed().setTitle("What reactions should trigger the board?")
          .setDescription(`You cannot use these reactions since they trigger other starboards:\n${existingEmoji.join(' ')}`)
          .setFooter(`You can set up to ${5 - reacts.length} more emojis`);
          if (existingBoards.length == 0) embed.setDescription("If you don't select any, it will default to ⭐ and 🌟.\n\nType `done` when you're done");
          await int.followUp({ embeds: [embed] });
          async function getEmoji(failTimes = 0) {
            const collected = await u.awaitMessage(int, { filter: contentFilter, max: 1, time, errors: ['time'] });
            if (!collected) {
              int.followUp({ embeds: [timeoutEmbed] });
              return false;
            }
            const content = collected.first().content;
            if (content.toLowerCase() == 'done') {
              if (reacts.length == 0) {
                if (failTimes == 0 || editing) {
                  int.followUp({ embeds: [u.embed().setTitle("You need some emoji!").setDescription(editing ? null : 'If you want to cancel the board creation, type `done` again. Otherwise, try again.')] });
                  return await getEmoji(1);
                } else {return [];}
              }
              return reacts;
            }
            const emoji = int.guild.emojis.cache.get(u.getEmoji(content)?.id)?.id || onlyEmoji(content)?.[0];
            if (!emoji) {
              embed.setTitle("Invalid emoji").setDescription("Please try again.\nKeep in mind that the emoji needs to be default or from this server.\n(like ⭐ or <:starsmile:921150225693966347>)");
              int.followUp({ embeds: [embed] });
              return await getEmoji(0);
            } else if (existingEmoji.includes(emoji)) {
              embed.setTitle("Invalid emoji").setDescription(`That emoji is already used by the starboard in <#${existingBoards.find(b => b.reactions.includes(emoji))}>`);
              int.followUp({ embeds: [embed] });
              return await getEmoji(0);
            } else if (reacts.includes(emoji)) {
              embed.setTitle("Invalid emoji").setDescription(`You're already using that emoji for this starboard`);
              int.followUp({ embeds: [embed] });
              return await getEmoji(0);
            }
            reacts.push(emoji);
            if (existingEmoji.length > 0) {
              embed.setTitle("Emoji Added")
            .setDescription(`You cannot use these reactions since they trigger other starboards:\n${existingEmoji.join(' ')}\nAdded emojis: ${reacts.map(a => int.guild.emojis.cache.get(a) || a).join(' ')}`)
            .setFooter(`You can set up to ${5 - reacts.length} more emojis`);
            }
            if (reacts.length > 4) {
              embed.setDescription("Max emojis reached").setFooter("");
              int.followUp({ embeds: [embed] });
              return reacts;
            }
            await int.followUp({ embeds: [embed] });
            return await getEmoji(0);
          }
          const emoji = await getEmoji();
          if (emoji === false) return;
          if (emoji.length == 0) return int.followUp({ embeds: [u.embed().setTitle("Starboard creation canceled")] });
          newBoard.reactions = emoji;
          if (editing) return await modifyBoard();
          return await singleChannel();
        }
        async function singleChannel(editing) {
          const channels = [];
          const embed = u.embed().setTitle("Which channel(s)/category(s) should this starboard be restricted to getting posts from?")
          .setDescription("Type in the format of `#channel-name` or `category name`. Type `done` if you don't want any restrictions.")
          .setFooter(`You can add up to ${5 - (newBoard.whitelist?.length || channels.length)} channel(s)/category(s)`);
          await int.followUp({ embeds: [embed] });
          async function getChannels() {
            let collected = await u.awaitMessage(int, { filter: contentFilter, max: 1, time, errors: ['time'] });
            if (!collected) {
              await int.followUp({ embeds: [timeoutEmbed] });
              return false;
            }
            collected = collected.first();
            const categories = int.guild.channels.cache.filter(c => c.type == 4);
            const category = categories.filter(c => c.name.toLowerCase() == collected.content.toLowerCase());
            const exclusiveChannel = int.guild.channels.cache.get(collected.content.replace(/[^0-9]/g, ''));

            if (collected.content.toLowerCase() == 'done') return channels;
            if (!exclusiveChannel) {
              embed.setTitle("Invalid channel").setDescription(`Please try again. It should look something like ${int.channel} ${categories.size > 0 ? `or \`${int.channel.parent?.name || categories.first().name}\`` : ''}`);
              if (category.size > 0) {
                if (category.size != 1) {
                  embed.setTitle("Duplicate category found")
                  .setDescription(`Looks like there are multiple categories with that name. You can try again either with the category's id or after you've changed its name (you can change it back right after its been added)`);
                  await int.followUp({ embeds: [embed] });
                  return await getChannels();
                } else if (channels.includes(category.first().id)) {
                  embed.setTitle("Invalid category")
                  .setDescription("That category has already been added to this starboard. Try again with a different one.");
                  await int.followUp({ embeds: [embed] });
                  return await getChannels();
                } else {
                  embed.setTitle("Category added")
                  .setDescription("Add another channel by typing in the format of `#channel-name` or `category name`. Type `done` if you're done");
                  channels.push(category.first().id);
                }
              }
            } else if (channels.includes(exclusiveChannel.id)) {
              embed
              .setTitle("Invalid channel").setDescription(`That channel has already been added to this starboard. Try again with a different one.`);
              await int.followUp({ embeds: [embed] });
            } else {
              embed.setTitle("Channel added")
              .setDescription("Add another channel by typing in the format of `#channel-name` or `category name`. Type `done` if you're done");
              channels.push(exclusiveChannel.id);
            }
            embed.spliceFields(0, 1, [{ name: 'Channels/Categories', value: channels.length > 0 ? channels.map(a => `<#${a}>`).join('\n') : 'None yet' }]);
            await int.followUp({ embeds: [embed] });
            return await getChannels();
          }
          const result = await getChannels();
          if (result === false) return;
          newBoard.whitelist = result;
          if (editing) return await modifyBoard();
          return await toPost();
        }
        async function toPost(editing) {
          const embed = u.embed().setTitle(`How many reactions should a post have?`).setDescription(`The minimum (and default) is 5.`);
          await int.followUp({ embeds: [embed] });
          async function getNumber() {
            let collected = await u.awaitMessage(int, { filter: contentFilter, max: 1, time, errors: ['time'] });
            if (!collected) {
              await int.followUp({ embeds: [embed] });
              return false;
            }
            collected = collected.first();
            if (isNaN(collected.content) || collected.content < 5) {
              embed.setTitle("Invalid input").setDescription("Your input needs to be a number");
              await int.folowUp({ embeds: [embed] });
              await getNumber();
            } else {return Math.round(collected.content);}
          }
          const result = await getNumber();
          if (result === false) return;
          newBoard.toPost = result;
          if (editing) return await modifyBoard();
          return await save();
        }
        async function save(editing) {
          if ((await u.db.guildconfig.saveStarBoard(int.guild.id, newBoard)) == null) {
            u.errorHandler("Starboard DB Save Error", int);
            return int.followUp({ embeds: [saveErrorEmbed] });
          }
          const embed = u.embed().setDescription(`${int.guild.channels.cache.get(newBoard.channel)} ${editing ? "has been updated" : "is now a starboard!"}\nReactions: ${newBoard.reactions.map(a => int.guild.emojis.cache.get(a) || a).join(' ')}`);
          if (newBoard.whitelist.length > 0) embed.setDescription(`Only messages in ${newBoard.whitelist.length > 1 ? `the following channels/categories will be eligible to appear on this starboard\n${newBoard.whitelist.map(a => int.guild.channels.cache.get(a)).join('\n')}` : `${int.guild.channels} will be eligible to appear on this starboard`}`);
          return await int.followUp({ embeds: [embed] });
        }
        async function channelPrompt(editing) {
          const nonDuplicate = m => !existingBoards?.find(b => b.channel == m.content.replace(/[^0-9]/g, ''));
          const embed = u.embed().setTitle('What channel should I send starred messages to?').setDescription('Type in the format of #channel-name\nTo cancel, type `none`');
          await int.followUp({ embeds: [embed] });
          const boardChannel = await channelInput(nonDuplicate, u.embed().setTitle("Starboard already exists").setDescription("That channel is already a starboard.\nPlease select a different channel.").setFooter('Type `none` to cancel'));
          if (boardChannel === false) return;
          if (boardChannel == 'none') {
            await int.followUp({ embeds: [u.embed().setTitle("Starboard creation canceled")] });
            return starboards();
          } else if (boardChannel) {
            newBoard.channel = boardChannel.id;
            return reactions(editing);
          } else {return;}
        }
        async function changeChannel() {
          const channelId = newBoard.channel;
          const nonDuplicate = m => !existingBoards.filter(b => b.channel != channelId)?.find(b => b.channel == m.content.replace(/[^0-9]/g, ''));
          const embed = u.embed().setTitle('What channel should I send starred messages to?')
          .setDescription(`They are currently being sent to <#${channelId}>.`)
          .setFooter(`Type \`none\` to cancel this operation`);
          await int.followUp({ embeds: [embed] });
          const failEmbed = u.embed().setTitle("Starboard already exists").setDescription("That channel is already a starboard.\nPlease select a different channel.").setFooter("Type `none` to cancel this operation");
          const collected = await channelInput(nonDuplicate, failEmbed);
          if (collected === false) return;
          if (collected == 'none') return await modifyBoard();
          const doneEmbed = u.embed().setTitle("Starboard channel changed").setDescription(`Was: <#${newBoard.channel}>\nChanged to: ${collected}`);
          newBoard.channel = collected.id;
          await int.followUp({ embeds: [doneEmbed] });
          return await modifyBoard();
        }
        async function createBoard() {
          const response = { embeds: [u.embed().setTitle('Max Starboards Reached').setDescription("You can't have more than 5 starboards at a time.")] };
          if (existingBoards?.length >= 5) return int.followUp(response);
          await channelPrompt();
        }
        async function selectBoard() {
          const embed = u.embed().setTitle("Select A Board").setDescription(existingBoards.map(b => `<#${b.channel}>`).join('\n'));
          await int.followUp({ embeds: [embed] });
          const failEmbed = u.embed().setTitle("Invalid Starboard").setDescription(`That wasn't one of the boards. Please try again.\nIt should look something like ${int.channel}`);
          const boardFilter = m => existingBoards.find(b => b.channel == m.content.replace(/[^0-9]/g, ''));
          const board = await channelInput(boardFilter, failEmbed);
          if (board == false) return int.followUp({ embeds: [timeoutEmbed] });
          return existingBoards.find(b => b.channel == board.id);
        }
        async function modifyBoard() {
          if (!newBoard.channel) newBoard = await selectBoard();
          console.log(newBoard);
          const buttons = u.actionRow().addComponents([
            u.button().setLabel("Change Starboard Channel").setCustomId("channel").setStyle(ButtonStyle.Primary),
            u.button().setLabel("Change Reactions").setCustomId("reactions").setStyle(ButtonStyle.Primary),
            u.button().setLabel("Change Exclusive Channels").setCustomId("singlechannel").setStyle(ButtonStyle.Primary),
            u.button().setLabel("Reaction Threshold").setCustomId("topost").setStyle(ButtonStyle.Primary),
            u.button().setLabel("Save").setCustomId("save").setStyle(ButtonStyle.Success),
          ]);
          const embed = u.embed().setTitle("What do you want to change?");
          const prompt = await int.followUp({ embeds: [embed], components: [buttons], fetchReply: true });
          const decision = await u.awaitButton(prompt, int, time);
          await decision.deferReply();
          await decision.deleteReply();
          switch (decision.customId) {
          case "channel": return changeChannel();
          case "reactions": return reactions(true);
          case "singlechannel": return singleChannel(true);
          case "topost": return toPost(true);
          case "save": return save(true);
          case "time": return int.followUp({ embeds: [timeoutEmbed] });
          }
          return;
        }
        async function removeBoard() {
          const board = await selectBoard();
          console.log(board);
          const confirmEmbed = u.embed().setTitle("Are you sure you want to do this?")
          .setDescription(`<#${board.channel}> will no longer have starred posts go to it. If you just need to change some settings or have posts sent to a different channel, press the modify button.`)
          .setFooter("Removing the starboard won't delete the actual channel");
          const buttons = u.actionRow().addComponents([
            u.button().setLabel('Cancel').setCustomId('cancel').setStyle(ButtonStyle.Secondary),
            u.button().setLabel('Delete').setCustomId('delete').setStyle(ButtonStyle.Danger),
            u.button().setLabel('Modify').setCustomId('modify').setStyle(ButtonStyle.Primary)
          ]);
          const prompt = await int.followUp({ embeds: [confirmEmbed], components: [buttons], fetchReply: true });
          const response = await u.awaitButton(prompt, int, time);
          await response.deferReply();
          await response.deleteReply();
          switch (response.customId) {
          case "cancel": return cancel();
          case "delete": return remove();
          case "modify": return modify();
          case "time": return int.followUp({ embeds: [timeoutEmbed] });
          }
          async function cancel() {
            const embed = u.embed().setTitle("Removal Canceled").setDescription(`<#${board.channel}> will remain as a starboard`);
            int.followUp({ embeds: [embed] });
            return await starboards();
          }
          async function remove() {
            const embed = u.embed().setTitle("Starboard Removed").setDescription(`Starred posts will no longer be sent to <#${board.channel}>`);
            if ((await u.db.guildconfig.removeStarBoard(int.guild.id, board.channel)) == null) {
              u.errorHandler("Starboard DB Save Error", int);
              return await int.followUp({ embeds: [saveErrorEmbed] });
            }
            await int.followUp({ embeds: [embed] });
            return await starboards();
          }
          async function modify() {
            return await modifyBoard();
          }
        }
        if (existingBoards?.length == 0) {
          const embed = u.embed().setTitle("Starboard Creation").setDescription("Since you don't have any starboards set up right now, let's create a new one.");
          await int.followUp({ embeds: [embed] });
          return await createBoard();
        }
        const embed = u.embed().setTitle("What do you want to do?").setDescription("You can create, modify, or delete a starboard");
        const buttons = u.actionRow().addComponents([
          u.button().setCustomId("create").setLabel("Create").setStyle(ButtonStyle.Success),
          u.button().setCustomId("modify").setLabel("Modify").setStyle(ButtonStyle.Primary),
          u.button().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger)
        ]);
        let prompt;
        if (!int.replied) prompt = await int.reply({ embeds: [embed], components: [buttons], fetchReply: true });
        else prompt = await int.followUp({ embeds: [embed], components: [buttons], fetchReply: true });
        const result = await u.awaitButton(prompt, int, time);
        await result.deferReply();
        await result.deleteReply();
        switch (result.customId) {
        case "create": return await createBoard();
        case "modify": return await modifyBoard();
        case "delete": return await removeBoard();
        case "time": {
          return await int.followUp({ embeds: [timeoutEmbed] });
        }
        }
      }
      async function logging() {
        return;
      }
      async function filter(existingPrompt) {
        const embed = u.embed().setTitle("How strict do you want the language filter to be, and which sources should I monitor?").setDescription("Green indicates selected");
        let lvl = await u.db.guildconfig.getLangFilter(int.guild.id)?.level ?? 0;
        let src = await u.db.guildconfig.getLangFilter(int.guild.id)?.source?.split('') ?? [];
        const style = (num) => lvl == num ? ButtonStyle.Success : ButtonStyle.Danger;
        const wordButtons = u.actionRow().addComponents([
          u.button().setLabel("None").setCustomId("0").setStyle(style(0)),
          u.button().setLabel("Low (sexual words)").setCustomId("1").setStyle(style(1)),
          u.button().setLabel("Medium (insults/racism)").setCustomId("2").setStyle(style(2)),
          u.button().setLabel("High (standard swears)").setCustomId("3").setStyle(style(3)),
          u.button().setLabel("Ultra (anything remotely bad)").setCustomId("4").setStyle(style(4)),
        ]);
        const yes = ButtonStyle.Success;
        const no = ButtonStyle.Danger;
        const sourceButtons = u.actionRow().addComponents([
          // 0 = none, 1 = text, 2 = image, 3 = usernames, 4 = statuses
          u.button().setLabel("Text").setCustomId("text").setStyle(src.includes('1') ? yes : no),
          u.button().setLabel("Images").setCustomId("images").setStyle(src.includes('2') ? yes : no),
          u.button().setLabel("Usernames").setCustomId("usernames").setStyle(src.includes('3') ? yes : no),
          u.button().setLabel("Statuses").setCustomId("statuses").setStyle(src.includes('4') ? yes : no),
          u.button().setLabel("Done").setCustomId("done").setStyle(ButtonStyle.Primary)
        ]);
        let prompt;
        if (existingPrompt) prompt = await int.editReply({ embeds: [embed], components: [wordButtons, sourceButtons], fetchReply: true });
        else prompt = await int.reply({ embeds: [embed], components: [wordButtons, sourceButtons], fetchReply: true });
        const response = await u.awaitButton(prompt, int, time);
        if (response.customId == 'time') {
          return await int.followUp({ embeds: [timeoutEmbed] });
        }
        function changeSrc(num) {
          if (src.includes(num)) src = src.filter(s => s != num);
          else src.push(num);
        }
        if (Number.parseInt(response.customId)) lvl = Number.parseInt(response.customId);
        switch (response.customId) {
        case 'text': {
          changeSrc('1');
          break;
        }
        case 'images': {
          changeSrc('2');
          break;
        }
        case 'usernames': {
          changeSrc('3');
          break;
        }
        case 'statuses': {
          changeSrc('4');
          break;
        }
        default: break;
        }
        if (response.customId == 'done') {
          const old = await u.db.guildconfig.getLangFilter(int.guild.id);
          const lvlMap = ['None', 'Low', 'Medium', 'High', 'Ultra'];
          const srcMap = ['None', 'Messages', 'Images', 'Messages & Images'];
          const saveEmbed = u.embed().setTitle("Language Filter Settings Saved")
          .addFields([{ name: "Was", value: `Level: ${lvlMap[old.level]}\nSource(s): ${srcMap[old.source]}` }])
          .addFields([{ name: "Is", value: `Level: ${lvlMap[lvl]}\nSource(s): ${srcMap[src]}` }]);
          if (await u.db.guildconfig.saveLanguageFilter(int.guild.id, { level: lvl, source: src.join('') }) == null) return int.followUp({ embeds: [saveErrorEmbed] });
          return await int.followUp({ embeds: [saveEmbed] });
        }
        return await filter(true);
      }
    } catch (error) {
      return u.errorHandler(error, int);
    }
  }
});
// Module.addCommand({name: 'config',
//    hidden: true,
//    onlyGuild: true,
//    permissions: ['MANAGE_GUILD'],
//    category: "Mod",
//    process: async (msg, suffix) =>{
//        let channelPrompt = async () =>{
//            let errorChannel = async () =>{
//                let currentChannel = await Module.db.guildconfig.getErrorChannel(msg.guild.id)
//                let embed = u.embed().setTitle("What channel should I send errors to?").setDescription(`Type it in the format of #channel-name\nType \`none\` to disable error messages\n${currentChannel ? `The current error channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no error channel set up right now.'}`)
//                msg.channel.send({embeds: [embed]}).then(async m=>{
//                    await m.channel.awaitMessages(channelOptions).then(async collected =>{
//                        let content = collected.first().content,
//                            channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
//                        if(!channel && content.toLowerCase() != 'none'){
//                            msg.channel.send("I couldn't find that channel. Please try again.")
//                            return errorChannel()
//                        }
//                        else if(await Module.db.guildconfig.saveErrorChannel(msg.guild.id, channel?.id) == null) {
//                            msg.channel.send("I had a problem saving that.")
//                            return mainMenu()
//                        }
//                        let newEmbed = u.embed().setTitle(`Error log channel ${channel ? 'saved' : 'disabled'}`).setDescription(`Errors will be ${channel ? `sent to ${channel}` : 'contained to my logs'}`)
//                        msg.channel.send({embeds: [newEmbed]})
//                        return mainMenu()
//
//                    }).catch(()=> timedOut(m))
//                })
//            }
//            let botLobby = async () =>{
//                let currentChannel = await Module.db.guildconfig.getBotLobby(msg.guild.id)
//                let embed = u.embed().setTitle("What channel should I send large bits of text to?").setDescription(`Type it in the format of #channel-name\nType \`none\` to disable error messages\n${currentChannel ? `The current error channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no error channel set up right now.'}`)
//                msg.channel.send({embeds:[embed]}).then(async m=>{
//                    await m.channel.awaitMessages(channelOptions).then(async collected =>{
//                        let content = collected.first().content,
//                            channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
//                        if(!channel && content.toLowerCase() != 'none'){
//                            msg.channel.send("I couldn't find that channel. Please try again.")
//                            return botLobby()
//                        }
//                        else if(await Module.db.guildconfig.saveBotLobby(msg.guild.id, channel?.id) == null) {
//                            msg.channel.send("I had a problem saving that.")
//                            return mainMenu()
//                        }
//                        let newEmbed = u.embed().setTitle(`Bot lobby channel ${channel ? 'saved' : 'disabled'}`).setDescription(`Large text dumps will be ${!channel ? 'sent in the channel they\'re sent in' : `sent to ${(channel)}`}`)
//                        msg.channel.send({embeds: [newEmbed]})
//                        return mainMenu()
//                    }).catch(()=> timedOut(m))
//                })
//            }
//
//            let embed = u.embed().setTitle('What channel do you want to configure?').setDescription('Options:\nError Channel\nBot Lobby')
//            msg.channel.send({embeds: [embed]}).then(async m=>{
//                await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                    let content = collected.first().content
//                    if(content.toLowerCase().startsWith('error')) return errorChannel()
//                    else if(content.toLowerCase().startsWith('bot')) return botLobby()
//                    msg.channel.send("That's not one of the options")
//                    return channelPrompt()
//
//                }).catch(()=> timedOut(m))
//            })
//        }
//        let starPrompt = async() =>{
//            let existingBoards = await Module.db.guildconfig.getStarBoards(msg.guild.id)
//            let  createBoard = async () =>{
//                let channelPrompt = async () =>{
//                    let embed =  u.embed().setTitle('What channel should I send messages to?').setDescription('Type in the format of #channel-name')
//                    msg.channel.send({embeds: [embed]}).then(async m =>{
//                        await m.channel.awaitMessages(channelOptions).then(async collected =>{
//                            let channel = msg.guild.channels.cache.get(collected.first().content.replace(/[^0-9]/g, ''))
//                            if(!channel){
//                                msg.channel.send("I couldn't find that channel. Please try again.")
//                                return channelPrompt(msg)
//                            }
//                            return reactions(channel.id)
//                        }).catch(()=> timedOut(m))
//                    })
//                }
//                let reactions = async (channel, reactionz = []) =>{
//                    let embed = u.embed().setTitle("What reactions should trigger the board?").setDescription("Defaults are ⭐ and 🌟.\n🌟 will always send to the main starboard if a mod reacts with it\n\nType `done` when you're done")
//                    msg.channel.send({embeds: [embed]}).then(async m =>{
//                        await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                            let content = collected.first().content
//                            if(content.toLowerCase() == 'done'){
//                                if(reactionz.length == 0) reactionz = ['⭐','🌟']
//                                return singleChannel(channel, reactionz)
//                            }
//                            let findEmoji = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == content) || onlyEmoji(content)
//                            if(!findEmoji){
//                                msg.channel.send("I couldn't find that emoji!")
//                                return reactions(channel, reactionz)
//                            }
//                            reactionz.push(content)
//                            return reactions(channel,reactionz)
//                        }).catch(()=> timedOut(m))
//                    })
//
//                }
//                let singleChannel = async (channel, reactions) =>{
//                    let embed = u.embed().setTitle("Should this board only be able to be triggered from a certain channel?").setDescription("Type in the format of #channel-name. Type `none` for none ")
//                    msg.channel.send({embeds: [embed]}).then(async m =>{
//                        await m.channel.awaitMessages(channelOptions).then(async collected =>{
//                            let content = collected.first().content
//                            let channel2 = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
//                            if(!channel2 && content.toLowerCase() != 'none'){
//                                msg.channel.send("I couldn't find that channel. Please try again.")
//                                return singleChannel(channel, reactions)
//                            }
//                            return toStar(channel, reactions, channel2?.id)
//                        })
//                    }).catch(()=> timedOut(m))
//                }
//
//                let toStar = async (channel, reactions, singleChannel) =>{
//                    let embed = u.embed().setTitle(`How many reactions are needed to be sent to ${msg.guild.channels.cache.get(channel)?.name}?`).setDescription(`The default is 5.`)
//                    msg.channel.send({embeds: [embed]}).then(async m=>{
//                        await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                            let content = collected.first().content
//                            if(isNaN(content) || content > 1000000 || content < 1){
//                                msg.channel.send("That's not a valid number. (Must be between 1 and 1,000,000")
//                                return toStar(channel, reactions, singleChannel)
//                            }
//                            else if(await Module.db.guildconfig.saveStarBoard(msg.guild.id, channel, reactions, singleChannel, Math.round(content)) != null){
//                                let embed = u.embed().setTitle(`${msg.guild.channels.cache.get(channel).name} is now a starboard!`).setFooter(reactions.join(' '))
//                                if(singleChannel) embed.setDescription(`Only messages in ${msg.guild.channels.cache.get(singleChannel)} will appear on this starboard.`)
//                                msg.channel.send({embeds: [embed]})
//                            }
//                            else msg.channel.send("I had a problem saving the starboard.")
//                            return mainMenu()
//                        }).catch(()=> timedOut(m))
//                    })
//                }
//                await channelPrompt()
//            }
//            let manageBoard = async () =>{
//                let selectionPrompt = async () =>{
//                    let embed = u.embed().setTitle("Which starboard do you want to manage?").setDescription(`${existingBoards ? `Current starboard(s):\n<#${existingBoards.map(e=> e.channel).join('>\n<#')}>` : 'There are no boards to manage.'}`)
//                    msg.channel.send({embeds: [embed]}).then(async m=>{
//                        await m.channel.awaitMessages(channelOptions).then(async collected =>{
//                            let content = collected.first().content.replace(/[^0-9]/g, '')
//                            let findBoard = existingBoards.find(b => b.channel == content)
//                            if(findBoard && !msg.guild.channels.cache.get(content)){
//                                msg.channel.send("I couldn't find that channel. It might have been deleted.")
//                                return selectionPrompt()
//                            }
//                            else if(findBoard) return initialPrompt(findBoard)
//                            msg.channel.send("That's not one of the options. Please try again.")
//                            return selectionPrompt()
//
//                        }).catch(()=> timedOut(m))
//                    })
//                }
//                let initialPrompt = async (channel) =>{
//                    let embed = u.embed().setTitle('What do you want to manage?').setDescription('The options are:\Reactions\nChannel Exclusivity\nReaction Amount\nDelete\nDone')
//                    msg.channel.send({embeds: [embed]}).then(async m=>{
//                        await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                            let content = collected.first().content.toLowerCase()
//                            if(content == 'reactions') return reactionPrompt(channel)
//                            if(content == 'exclusivity') return singleChannelPrompt(channel)
//                            if(content == 'reaction') return toStarPrompt(channel)
//                            if(content == 'delete') return deletePrompt(channel)
//                            if(content == 'done') return msg.channel.send("Modification Complete")
//                        }).catch(()=> timedOut(m))
//                    })
//                }
//                let reactionPrompt = async (channel) =>{
//                    let addEmoji = async(channel, emoji=[])=>{
//                        let embed = u.embed().setTitle('What emoji do you want to add?').setDescription(`Current reactions:\n${existingBoards.map(e=>e.reactions).join('\n')}\n4${emoji.join('\n')}\nType \`done\` when you're finished`)
//                        msg.channel.send({embeds: [embed]}).then(async m=>{
//                            await m.channel.awaitMessages(contentOptions).then(async collected=>{
//                                let content = collected.first().content
//                                if(content.toLowerCase() == 'done'){
//                                    if(emoji.length == 0) emoji = ['⭐','🌟']
//                                    Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, emoji, channel.singleChannel, channel.toStar)
//                                    return reactionPrompt(channel)
//                                }
//                                let findEmoji = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == content)?.id || onlyEmoji(content)
//                                if(!findEmoji){
//                                    msg.channel.send("I couldn't find that emoji!")
//                                    return addEmoji(channel, emoji)
//                                }
//                                emoji.push(findEmoji.id)
//                                return addEmoji(channel. emoji)
//                            }).catch(()=> timedOut(m))
//                        })
//                    }
//                    let removeEmoji = async(channel)=>{
//                        let embed = u.embed().setTitle("Which one do you waant to remove?").setDescription(`Current reactions:\n${existingBoards.map(e=>e.reactions).join('\n')}\nType \`done\` when you're done`)
//                        msg.channel.send({embeds: [embed]}).then(async m=>{
//                            await m.channel.awaitMessages(contentOptions).then(async collected=>{
//                                let content = collected.first().content,
//                                match,
//                                regex = /<:.*:(.*)>/g
//                                if(match = regex.exec(content)) content = match[1]
//                                let foundEmoji = channel.reactions.find(r => r == content)
//                                if(content.toLowerCase() == 'done') return reactionPrompt(channel)
//                                else if(!foundEmoji){
//                                    msg.channel.send("That's not one of the reactions.")
//                                    return removeEmoji(channel)
//                                }
//                                let newArray = channel.reactions.filter(r =>r != foundEmoji)
//                                Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, newArray, channel.toStar)
//                                return removeEmoji(channel)
//                            }).catch(()=> timedOut(m))
//                        })
//                    }
//                    let embed = u.embed().setTitle('Do you want to add or remove reactions?').setDescription(`${existingBoards ? `Current reaction(s):\n${existingBoards.map(e=>e.reactions).join('\n')} `: 'There are no starboards set up.'}`)
//                    msg.channel.send({embeds: [embed]}).then(async m=>{
//                        await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                            let content = collected.first().content.toLowerCase()
//                            if(content == 'add') return addEmoji(msg, channel)
//                            else if(content == 'remove') return removeEmoji(msg, channel)
//                            msg.channel.send("That's not one of the options.")
//                            return manageBoard()
//                        }).catch(()=> timedOut(m))
//                    })
//                }
//                let singleChannelPrompt = async (channel) =>{
//                    let embed = u.embed().setTitle('Which channel should this board watch for reactions?').setDescription('Type in the format of #channel-nname\nType `all` to disable exclusivity')
//                    msg.channel.send({embeds: [embed]}).then(async m=>{
//                        await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                            let content = collected.first().content.toLowerCase()
//                            let chanel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))?.id
//                            if(content == 'all') chanel = ''
//                            if(channel || content == 'all'){
//                                Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, channel.reactions, chanel, channel.toStar)
//                                return manageBoard(channel)
//                            }
//                            msg.channel.send("I couldn't find that channel. Please try again.")
//                            return singleChannelPrompt(channel)
//                        }).catch(()=> timedOut(m))
//                    })
//                }
//                let toStarPrompt = async (channel) =>{
//                    msg.channel.send("Not implimented yet")
//                    return manageBoard(channel)
//                }
//                let deletePrompt = async (channel) =>{
//                    msg.channel.send("Not implimented yet")
//                    return manageBoard(channel)
//                }
//                if(existingBoards.length == 0){
//                    msg.channel.send("There are no starboards to manage.")
//                    return starPrompt()
//                }
//            }
//            let embed = u.embed().setTitle('Do you want to create or manage a starboard?').setDescription(existingBoards ? `Current starboard(s):\n<#${existingBoards.map(e => e.channel).join('>\n<#')}>` : 'There are no starboards currently set up')
//            msg.channel.send({embeds: [embed]}).then(async m =>{
//                await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                    let content = collected.first().content
//                    if(content.toLowerCase() == 'create') return createBoard()
//                    else if(content.toLowerCase() == 'manage') return manageBoard()
//                    msg.channel.send("That's not one of the options. Please try again.")
//                    return starPrompt()
//                }).catch(()=> timedOut(m))
//            })
//        }
//
//        let logPrompt = async()=>{
//            async function buttons (guild, enabledEvents, disabledEvents){
//                let btns = events.filter(e => e[1] != 7).map(a => a[0])
//                btns.push("All", "None", "Done")
//                let enabled = (await u.decodeLogEvents(guild)).concat(enabledEvents).filter(a => !disabledEvents.includes(a))
//                let finalButtons = []
//                for (b of btns){
//                    let value = 'DANGER'
//                    if(enabled.includes(b)) value = 'SUCCESS'
//                    else if(['All', 'None', 'Done'].includes(b)) value = 'SECONDARY'
//                    let button = u.button().setCustomId(b.replace(/ /g, '')).setStyle(value).setLabel(b)
//                    finalButtons.push(button)
//                }
//                let actionRows = []
//                for (x of finalButtons){
//                    let findRow = actionRows?.find(r => r.components.length < 5)
//                    if(!findRow) actionRows.push(u.actionRow().addComponents([x]))
//                    else actionRows[actionRows.indexOf(findRow)] = findRow.addComponents([x])
//                }
//                return actionRows
//            }
//            let flags = async(channel, m, enabledEvents=[], disabledEvents=[]) =>{
//                let components = await buttons(msg.guild, enabledEvents, disabledEvents)
//                if(!m){
//                    let embed = u.embed().setTitle('What would you like to monitor?').setDescription(`Green buttons are activated and red are deactivated. Press done when you're done`)
//                    m = await msg.channel.send({embeds: [embed], components})
//                }
//                if(m) m.edit({components})
//                await m.awaitMessageComponent({buttonFilter, time}).then(async int =>{
//                    let id = int.customId
//                    if(id == 'Done'){
//                        let mapped = '0000000'
//                        if(enabledEvents.length > 0) mapped = await u.encodeLogEvents(enabledEvents.map(r => ({int: r[1], category: r[2]})))
//                        Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, mapped)
//                        return mainMenu()
//                    }
//                    else if(id == 'All') enabledEvents = events
//                    else if(id == 'None') enabledEvents = []
//                    else if(events.map(e => e[0].replace(/ /g, '')).includes(id)){
//                        enabledEvents.push(events.find(e => e[0].replace(/ /g, '') == id))
//                    }
//                    return flags(channel, m, enabledEvents)
//                })
//
//
//                //let embed = u.embed().setTitle('What would you like to monitor?').setDescription(`Type \`done\` when you're done.\n\nEnabled:\n${enabledEvents.map(e => e[0]).join('\n')}`)
//                //if(firstTime) embed.setDescription(`The following are the options. Type \`done\` when you're done.\n\n${events.map(e=>e[0]).join('\n')}`)
//                //msg.channel.send({embeds: [embed]}).then(async m=>{
//                //    await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                //        let content = collected.first().content
//                //        let filtered = events.find(e => e[0].toLowerCase() == content.toLowerCase())
//                //        if(content.toLowerCase() == 'all'){
//                //            let mapped = u.encodeLogEvents(events.map(r => {return {int: r[1], category: r[2]}}))
//                //            await Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, mapped)
//                //            return mainMenu()
//                //        }
//                //        else if(content.toLowerCase() == 'done'){
//                //            let mapped = '0000000'
//                //            if(enabledEvents.length > 0) mapped = u.encodeLogEvents(enabledEvents.map(r => ({int: r[1], category: r[2]})))
//                //            Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, mapped)
//                //            return mainMenu()
//                //        }
//                //        else if(filtered){
//                //            enabledEvents.push(filtered)
//                //            return flags(channel, false, enabledEvents)
//                //        }
//                //        msg.channel.send("That's not one of the options. Please try again.")
//                //        return flags(channel, false, enabledEvents)
//                //
//                //    }).catch((err)=> {timedOut(m); console.log(err)})
//                //})
//            }
//            let currentChannel = await Module.db.guildconfig.getLogChannel(msg.guild.id)
//            let embed = u.embed().setTitle('What channel should I send the logs in?').setDescription(`Type \`none\` to disable log prompts.\nType it in the format of #channel-name\n${currentChannel ? `The current log channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no logging channel set up'}`)
//            msg.channel.send({embeds: [embed]}).then(async m=>{
//                await m.channel.awaitMessages(channelOptions).then(async collected =>{
//                    let content = collected.first().content
//                    if(content.toLowerCase() == 'none'){
//                        await Module.db.guildconfig.saveLogChannel(msg.guild.id, null, '0000000')
//                        return mainMenu()
//                    }
//                    let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
//                    if(!channel){
//                        msg.channel.send("I couldn't find that channel. Please try again.")
//                        return logPrompt()
//                    }
//                    return flags(channel.id)
//                }).catch((err)=> {timedOut(m); console.log(err)})
//            })
//        }
//        let mutedPrompt = async() =>{
//            let currentRole = await Module.db.guildconfig.getMutedRole(msg.guild.id),
//                embed = u.embed().setTitle(`What should the role be?`).setDescription(`Type \`none\` to get rid of the muted role.${currentRole ? `\nThe current role is <@&${currentRole}>`: ''}`)
//            msg.channel.send({embeds: [embed], allowedMentions: {parse: []}}).then(async m=>{
//                await m.channel.awaitMessages(roleOptions).then(async collected =>{
//                    let content = collected.first().content
//                    let role = msg.guild.roles.cache.get(content.replace(/[^0-9]/g, ''))
//                    if(!role && content.toLowerCase() != 'none'){
//                        msg.channel.send("I couldn't find that role. Please try again")
//                        return mutedPrompt()
//                    }
//                    await Module.db.guildconfig.saveMutedRole(msg.guild.id, role?.id || 'disabled')
//                    embeds = [u.embed().setTitle('Muted role saved').setDescription(role ? `The role ${role} will be assigned to people when \`!mute\` is used.` : "The muted role has been disabled, so `!mute` will not work.")]
//                    m.channel.send({embed, allowedMentions: {parse: []}})
//                    return mainMenu()
//                }).catch((e)=> {timedOut(m); console.log(e)})
//            })
//        }
//
//        let mainMenu = async () => {
//            let choices = ['Channels', 'Starboards', 'Logging', 'Muted Role', 'Done'],
//                embed = u.embed().setTitle('What do you want to configure?').setDescription(`Options:\n${choices.join('\n')}`)
//            msg.channel.send({embeds: [embed]}).then(async m=>{
//                await m.channel.awaitMessages(contentOptions).then(async collected =>{
//                    let content = collected.first().content.toLowerCase()
//                    if(content == choices[0].toLowerCase()) return channelPrompt()
//                    if(content == choices[1].toLowerCase()) return starPrompt()
//                    if(content == choices[2].toLowerCase()) return logPrompt()
//                    if(content == choices[3].toLowerCase()) return mutedPrompt()
//                    if(content == choices[4].toLowerCase()) return collected.first().react('👍')
//                    msg.channel.send("That's not one of the options")
//                    return mainMenu()
//                }).catch(()=> timedOut(m))
//            }
//        )}
//        return mainMenu()
//    }
// })
module.exports = Module;