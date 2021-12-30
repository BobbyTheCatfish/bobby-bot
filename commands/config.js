/*THINGS TO ADD
    member activity log channel
    member actiivty log toggles
    change exclusive SBs to arrays
    add main property to sb, only one can have it per guild
    able to set sb exclusive to category
    language filter
    //muted role


    in the distant future
    rank systems
    enable/disable commands
    
*/
//N C D U CD CU DU CDU
//0 1 2 3 4  5  6  7
//0000000
const Augur = require('augurbot')
const {onlyEmoji} = require( 'emoji-aware')
const u = require('../utils/utils')
const {events} = require( '../jsons/events.json')
const Module = new Augur.Module()
let configuring = []
    let roleFilter = m => m.guild.roles.cache.get(m.content.replace(/[^0-9]/g, '')) || m.content.toLowerCase() == 'none'
    let time = 5000 * 60,
    contentOptions = (m, i) => ({filter: contentFilter(m, i), max: 1, time, errors: ['time']})

    Module.addInteractionCommand({name: 'config',
    onlyGuild: true,
    category: "Mod",
    process: async(int) =>{
        if(configuring.includes(int.guildId)) return int.reply("Someone else is already configuring me!")
        configuring.push(int.guildId)
        await int.deferReply({ephemeral: true})
        let timeoutEmbed = u.embed().setTitle("Time's Up!").setDescription("I got tired of waiting around for you to hit a button.\nIf you want to continue configuring, use the command again.")
        let contentFilter = m => m.content && m.author.id == int.user.id
        let channelFilter = m => int.guild.channels.cache.get(m.content.replace(/[^0-9]/g, '')) || m.content.toLowerCase() == 'none'

        let embed = u.embed().setTitle('Bot Config').setDescription("What do you need to configure?")
        let buttons = [
            u.button().setLabel('Bot Lobby').setCustomId('channel'),
            u.button().setLabel('Starboards').setCustomId('starboards'),
            u.button().setLabel('Logging').setCustomId('logging'),
            u.button().setLabel('Roles').setCustomId('roles'),
            u.button().setLabel('Language Filter').setCustomId('filter'),
        ]
        buttons = u.actionRow().addComponents(buttons)
        let msg = await int.reply({embeds: [embed], components: [buttons]})
        let interaction = await u.awaitButton(msg)
        switch(interaction.customId){
            case "channel": await channel()
            case "starboards": await starboards()
            case "logging":
            case "roles":
            case "filter":
            case "time": {
                configuring = configuring.filter(a => a != int.guildId)
                return interaction.update({embeds: [timeoutEmbed], components: []})
            }
        }
        async function channel () {
            let currentChannel = await Module.db.guildconfig.getBotLobby(int.guildId)
            let embed = u.embed().setTitle("Bot Lobby").setDescription(`What channel should be used for large bits of text?${currentChannel ? `The current channel is ${currentChannel}` : ''}`).setFooter('Pro Tip: type none to disable the bot lobby feature')
            interaction.update({embeds: [embed], components: []})
            let channel = await channelInput()
            if(await Module.db.guildconfig.saveErrorChannel(int,guild.id, channel?.id) == null){
                u.errorHandler('Database Save Error', int)
                configuring = configuring.filter(a => a != int.guildId)
                return int.editReply({embeds: [u.embed().setTitle("I had a problem saving that").setDescription("Sorry about this. I've let my developers know, so it should be fixed soon.")]})
            }
            embed = u.embed().setTitle(`Bot Lobby ${channel.id ? "Saved" : "Disabled"}`).setDescription(`Large bits of text will be sent ${channel.id ? `in ${channel}` : 'in the channel the command is used in'}`)
            int.editReply({embeds: [embed]})
            return configuring = configuring.filter(a => a != int.guildId)
        }
        async function channelInput(filter = function(){true}, embed){
            let badChannel  = u.embed().setTitle("Invalid channel").setDescription(`Please try again. It should look something like ${int.channel} \n\n(or \`none\`)`)
            embed ??= badChannel
            return await int.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']}).then(async collected =>{
                collected = collected.first()
                let content = collected.content
                if(collected.deletable) collected.delete()
                if(!channelFilter(collected)){
                    int.editReply({embeds: [badChannel]})
                    return await channelInput()
                }
                if(!filter(collected)) {
                    int.editReply({embeds: [embed], ephemeral: true})
                    return await channelInput()
                }
                else return int.guild.channels.cache.get(content.replace(/[^0-9]/g, '')) || content.toLowerCase()
            })
        }
        async function starboards(){
            let existingBoards = await Module.db.guildconfig.getStarBoards(int.guild.id)
            //let boardFilter = m => existingBoards?.find(b => b.channel == m.content.replace(/[^0-9]/g, ''))
            let newBoard = {}
            async function createBoard(){
                let nonDuplicate = m => !existingBoards?.find(b => b.channel == m.content.replace(/[^0-9]/g, ''))
                async function channelPrompt(editing) {
                    let embed =  u.embed().setTitle('What channel should I send starred messages to?').setDescription('Type in the format of #channel-name\nTo cancel, type \`none\`')
                    await int.editReply({embeds: [embed]})
                    let channel = await channelInput(nonDuplicate, u.embed().setTitle("Starboard already exists").setDescription("Please select a different channel."))
                    if(!channel == 'none') return await int.editReply({embeds: [u.embed().setTitle("Starboard creation canceled")]})
                    else if(channel){
                        newBoard.channel = channel.id
                        return reactions()
                    }
                    else return
                }
                async function reactions(editing){
                    let existingEmoji = existingBoards.filter(b => b.channel != newBoard.channel).map(b => b.reactions).flat()
                    let embed = u.embed().setTitle("What reactions should trigger the board?").setDescription(`You cannot use these reactions since they trigger other starboards:\n${existingEmoji.join(' ')}`)
                    if(existingBoards.length == 0) embed.setDescription("If you don't select any, it will default to ⭐ and 🌟.\n\nType `done` when you're done")
                    await int.editReply({embeds: [embed]})
                    let reacts
                    async function getEmoji(failTimes = 0){
                        return await int.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']}).then(async collected =>{
                            let content = collected.first().content
                            collected.first().delete()
                            if(content.toLowerCase() == 'done'){
                                if(existingBoards.length == 0 && reacts.length == 0) reacts = ['⭐', '🌟']
                                if(reacts.length == 0){
                                    if(failTimes == 0 || editing){
                                        int.editReply({embeds: [u.embed().setTitle("You need some emoji!").setDescription(editing ? null : 'If you want to cancel the board creation, type \`done\` again. Otherwise, try again.')]})
                                        if(!editing) embed
                                        return await getEmoji(1)
                                    }
                                    else return []
                                }
                                return reacts
                            }
                            let emoji = msg.guild.emojis.cache.get(u.getEmoji(content))?.id || onlyEmoji(content)
                            //let emoji = msg.guild.emojis.cache.find(e => `<${e.animated ? 'a': ''}:${e.name}:${e.id}>` == content)?.id || onlyEmoji(content)
                            if(!emoji){
                                embed = u.embed().setTitle("Invalid emoji").setDescription("Please try again.\nKeep in mind that the emoji needs to be default or from this server.\n(like ⭐ or <:starsmile:921150225693966347>)")
                                int.editReply({embeds: [embed]})
                                return await getEmoji(0)
                            }
                            else if(existingEmoji.includes(emoji)){
                                embed = u.embed().setTitle("Invalid emoji").setDescription(`That emoji is already used by the starboard in <#${existingBoards.find(b => b.reactions.includes(emoji))}>`)
                            }
                            reacts.push(emoji)
                            if(existingEmoji.length > 0) embed.setDescription(`You cannot use these reactions since they trigger other starboards:\n${existingEmoji.join(' ')}\nCurrent emojis: ${reacts.map(a=> int.guild.emojis.cache.get(a) || a).join(' ')}`)
                            await int.editReply({embeds: [embed]})
                            return await getEmoji(0)
                        })
                    }
                    let emoji = await getEmoji()
                    if(emoji.length == 0) return int.editReply({embeds: [u.embed().setTitle("Starboard creation canceled")]})
                    newBoard.emoji = emoji
                    if(editing) return await modifyBoard()
                    return await singleChannel()
                }
                async function singleChannel(editing){
                    let embed = u.embed().setTitle("Which channel(s)/category(s) should this starboard be restricted to getting posts from?").setDescription("Type in the format of `#channel-name` or `category name`. Type `done` if you don't want any restrictions.")
                    await int.editReply({embeds: [embed], ephemeral: true})
                    let channels = []
                    async function getChannels(){
                        return await int.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']}).then(async collected =>{
                            collected = collected.first()
                            collected.delete()
                            let categories = int.guild.channels.cache.filter(c => c.type == 'GUILD_CATEGORY')
                            let category = categories.filter(c => c.name.toLowerCase() == collected.content.toLowerCase())
                            let filter = int.guild.channels.cache.get(collected.content.replace(/[^0-9]/g, ''))
                            embed = u.embed().addField('Channels/Categories', channels.length > 0 ? channels.map(a => categories.find(c => c.id == a) ? `${a} (category)` :`<#${a}>`).join('\n') :'None yet')
                            if(collected.content.toLowerCase() == 'done'){
                                return channels
                            }
                            if(!filter) {
                                embed = embed.setTitle("Invalid channel").setDescription(`Please try again. It should look something like ${int.channel} ${categories.size > 0 ? `or \`${int.channel.parent?.name || categories.first().name}\``:''}`)
                                if(category.size > 0){
                                    if(category.size != 1) embed = embed.setTitle("Duplicate category found").setDescription(`Looks like there are multiple categories with that name. You can try again either with the category's id or after you've changed its name (you can change it back right after its been added)`)
                                    else{
                                        embed = embed.setTitle("Category added").setDescription("Add another channel by typing in the format of `#channel-name` or `category name`. Type `done` if you're done")
                                        channels.push(category.first().id)
                                    }
                                }
                            }
                            else{
                                embed = embed.setTitle("Channel added").setDescription("Add another channel by typing in the format of `#channel-name` or `category name`. Type `done` if you're done")
                                channels.push(filter.id)
                            }
                            int.editReply({embeds: [embed], ephemeral: true})
                            return await getChannels()
                        })
                    }
                    newBoard.whitelist = await getChannels()
                    return await toPost()
                    //let restrictions = await getChannels()
                    //if(restrictions) return await toStar(channel, reactions, restrictions)
                }
                
                async function toPost(editing) {
                    let embed = u.embed().setTitle(`How many reactions should a post have?`).setDescription(`The minimum (and default) is 5.`)
                    await int.editReply({embeds: [embed]})
                    async function getNumber(){
                        return await int.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']}).then(async collected =>{
                            collected = collected.first()
                            if(isNaN(collected.content) || collected.content < 5){
                                embed = u.embed().setTitle("Invalid input").setDescription("Your input needs to be a number")
                                await int.editReply({embeds: [embed], ephemeral: true})
                                await getNumber()
                            }
                            else return Math.round(collected.content)
                        })
                    }

                    newBoard.toPost = await getNumber()
                    
                    msg.channel.send({embeds: [embed]}).then(async m=>{
                        await m.channel.awaitMessages(contentOptions).then(async collected =>{
                            let content = collected.first().content
                            if(isNaN(content) || content > 100 || content < 1){
                                msg.channel.send("That's not a valid number. (Must be between 1 and 100")
                                return toPost(channel, reactions, singleChannel)
                            }
                            else if(await Module.db.guildconfig.saveStarBoard(msg.guild.id, channel, reactions, singleChannel, Math.round(content)) != null){
                                let embed = u.embed().setTitle(`${msg.guild.channels.cache.get(channel).name} is now a starboard!`).setFooter(reactions.join(' '))
                                if(singleChannel) embed.setDescription(`Only messages in ${msg.guild.channels.cache.get(singleChannel)} will appear on this starboard.`)
                                msg.channel.send({embeds: [embed]})
                            }
                            else msg.channel.send("I had a problem saving the starboard.")
                            return mainMenu()
                        }).catch(()=> timedOut(m))
                    })
                }
                async function save(editing){
                        embed = u.embed().setTitle(`${msg.guild.channels.cache.get(newBoard.channel)} ${editting ? "has been updated" : "is now a starboard!"}`).setFooter(newBoard.reactions.join(' '))
                        if(newBoard.whitelist.length > 0) embed.setDescription(`Only messages in ${newBoard.whitelist.length > 1 ? `the following channels/categories will be eligible to appear on this starboard\n${newBoard.whitelist.map(a => msg.guild.channels.cache.get(a)).join('\n')}` : `${msg.guild.channels} will be eligible to appear on this starboard`}`)
                }
                if(existingBoards?.length >= 5) return int.editReply({embeds: [u.embed().setTitle('Max Starboards Reached').setDescription("You can't have more than 5 starboards at a time.")]})
                await channelPrompt()
            }
            async function modifyBoard(){}
            async function removeBoard(){}
            switch(data.getString('action')){
                case "create": return await createBoard()
                case "modify": return await modifyBoard()
                case "delete": return await removeBoard()
                default: break;
            }
        }
        async function logging(){}
        async function filter(){
            
        }
        switch (cmd) {
            case "channel": return await channel();
            case "starboards": return await starboards();
            case "logging": return await logging();
            case "roles": return await roles();
            case "filter": return await filter();
            default: break;
        }
    }
})
//Module.addCommand({name: 'config',
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
//})
module.exports = Module