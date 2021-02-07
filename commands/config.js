/*THINGS TO ADD
    memer activity log channel
    memer actiivty log toggles
    change exclusive SBs to arrays
    add main property to sb, only one can have it per guild
    able to set sb exclusive to category
    language filter
    muted role


    in the distant future
    rank systems
    enable/disable commands
    
*/
let events = [
    ['Channel Created','cc'],
    ['Channel Deleted','cd'],
    ['Channel Updated','cu'],
    ['Message Delete','md'],
    ['Message Bulk Delete','mbd'],
    ['Message Pinned','mp'],
    ['Emoji Create','ec'],
    ['Emoji Delete','ed'],
    ['Emoji Update','eu'],
    ['Member Joined','mj'],
    ['Member Left','ml'],
    ['Member Update','mu'],
    ['Member Banned','mb'],
    ['Member Unbanned','mub'],
    ['Inegrations Update','iu'],
    ['Server Update','su'],
    ['Invite Created','ic'],
    ['Invite Deleted','id'],
    ['Role Created','rc'],
    ['Role Deleted','rd'],
    ['Role Updated','ru'],
    ['Enable All', 'ea']
]
const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Module = new Augur.Module(),
    {onlyEmoji} = require('emoji-aware')

Module.addCommand({name: 'config',
    ownerOnly: true,
    guildOnly: true,
    process: async (msg, suffix) =>{
        let time = 5000 * 60
        let contentFilter = m => m.content
        let channelFilter = m => m.content && ((m.content.startsWith('<#') && m.content.endsWith('>')) || m.content == 'none')
        let channelPrompt = async msg =>{
            let errorChannel = async msg =>{
                let currentChannel = await Module.db.guildconfig.getErrorChannel(msg.guild.id)
                let embed = u.embed().setTitle("What channel should I send errors to?").setDescription(`Type it in the format of #channel-name\nType \`none\` to disable error messages\n${currentChannel ? `The current error channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no error channel set up right now.'}`)
                msg.channel.send({embed}).then(async m=>{
                    await m.channel.awaitMessages(channelFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let content = collected.first().content
                        let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                        let setChannel
                        if(channel) setChannel = channel.id
                        else if(content.toLowerCase() == 'none') setChannel = ''
                        if(!setChannel && !!content.toLowerCase() == 'none'){
                            msg.channel.send("I couldn't find that channel. Please try again.")
                            await errorChannel(msg)
                        }
                        else if(await Module.db.guildconfig.saveErrorChannel(msg.guild.id, setChannel) == null) {
                            msg.channel.send("I had a problem saving that.")
                            await mainMenu(msg)
                        }
                        else{
                            let newEmbed = u.embed().setTitle(`Error log channel ${setChannel ? 'saved' : 'disabled'}`).setDescription(`Errors will be ${!channel ? 'contained to my logs' : `sent to ${channel}`}`)
                            msg.channel.send(newEmbed)
                            await mainMenu(msg)
                        }
                    })
                })
            }
            let botLobby = async msg =>{
                let currentChannel = await Module.db.guildconfig.getErrorChannel(msg.guild.id)
                let embed = u.embed().setTitle("What channel should I send large bits of text to?").setDescription(`Type it in the format of #channel-name\nType \`none\` to disable error messages\n${currentChannel ? `The current error channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no error channel set up right now.'}`)
                msg.channel.send({embed}).then(async m=>{
                    await m.channel.awaitMessages(channelFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let content = collected.first().content
                        let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                        let setChannel
                        if(channel) setChannel = channel.id
                        else if(content.toLowerCase() == 'none') setChannel = ''
                        if(!setChannel && !!content.toLowerCase() == 'none'){
                            msg.channel.send("I couldn't find that channel. Please try again.")
                            await errorChannel(msg)
                        }
                        else if(await Module.db.guildconfig.saveErrorChannel(msg.guild.id, setChannel) == null) {
                            msg.channel.send("I had a problem saving that.")
                            await mainMenu(msg)
                        }
                        else{
                            let newEmbed = u.embed().setTitle(`Bot lobby channel ${setChannel ? 'saved' : 'disabled'}`).setDescription(`Large text dumsp will be ${!channel ? 'sent in the channel they\'re sent in' : `sent to ${(channel)}`}`)
                            msg.channel.send(newEmbed)
                            await mainMenu(msg)
                        }
                    })
                })
            }

            let embed = u.embed().setTitle('What channel do you want to configure?').setDescription('Options:\nError Channel\nBot Lobby')
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase().startsWith('error')) await errorChannel(msg)
                    else if(content.toLowerCase().startsWith('bot')) await botLobby(msg)
                    else{
                        msg.channel.send("That's not one of the options")
                        await channelPrompt(msg)
                    }
                })
            })
        }
        let starPrompt = async(msg) =>{
            let existingBoards = await Module.db.guildconfig.getStarBoards(msg.guild.id)
            let  createBoard = async msg =>{
                let channelPrompt = async msg =>{
                    let embed =  u.embed().setTitle('What channel should I send messages to?').setDescription('Type in the format of #channel-name')
                    msg.channel.send({embed}).then(async m =>{
                        await m.channel.awaitMessages(channelFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let channel = msg.guild.channels.cache.get(collected.first().content.replace(/[^0-9]/g, ''))
                            if(!channel){
                                msg.channel.send("I couldn't find that channel. Please try again.")
                                await channelPrompt(msg)
                            }
                            else await reactions(msg, channel.id, [])
                        })
                    })
                }

                let reactions = async (msg, channel, reactionz = []) =>{
                    let embed = u.embed().setTitle("What reactions should trigger the board?").setDescription("Defaults are ⭐ and 🌟.\n🌟 will always send to the main starboard if a mod reacts with it\n\nType `done` when you're done")
                    msg.channel.send({embed}).then(async m =>{
                        await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content
                            if(content.toLowerCase() == 'done'){
                                if(reactionz.length == 0) reactionz = ['⭐','🌟']
                                await singleChannel(msg, channel, reactionz)
                            }
                            else{
                                let findEmoji = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == content)
                                let unicodeEmote = onlyEmoji(content)
                                if(!unicodeEmote && !findEmoji){
                                    msg.channel.send("I couldn't find that emoji!")
                                    await reactions(msg, channel, reactionz)
                                }
                                else{
                                    if(findEmoji) reactionz.push(content)
                                    else if(unicodeEmote) reactionz.push(unicodeEmote)
                                    await reactions(msg,channel,reactionz)
                                }
                            }
                        })
                    })
                    
                }

                let singleChannel = async (msg, channel, reactions) =>{
                    let embed = u.embed().setTitle("Should this board only be able to be triggered from a certain channel?").setDescription("Type in the format of #channel-name. Type `none` for none ")
                    msg.channel.send({embed}).then(async m =>{
                        await m.channel.awaitMessages(channelFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content
                            let channel2 = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                            if(content.toLowerCase() == 'none') await toStar(msg, channel, reactions, '')
                            else if(!channel2){
                                msg.channel.send("I couldn't find that channel. Please try again.")
                                await singleChannel(msg, channel, reactions)
                            }
                            else await toStar(msg, channel, reactions, channel2.id)
                        })
                    })
                }

                let toStar = async (msg, channel, reactions, singleChannel) =>{
                    let embed = u.embed().setTitle(`How many reactions are needed to be sent to ${msg.guild.channels.cache.get(channel)?.name}?`).setDescription("The default is 5. Reacting with 🌟 while having the Manage Server permission will automatically put this on the channel.")
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content
                            if(content.replace(/[0-9]/g, '') != ''){
                                msg.channel.send("That's not a valid number.")
                                await toStar(msg, channel, reactions, singleChannel)
                            }
                            else if(await Module.db.guildconfig.saveStarBoard(msg.guild.id, channel, reactions, singleChannel, content) != null){
                                let embed = u.embed().setTitle(`${msg.guild.channels.cache.get(channel).name} is now a starboard!`).setFooter(reactions.join(' '))
                                if(singleChannel)embed.setDescription(`Only messages in ${msg.guild.channels.cache.get(singleChannel)} will appear on this starboard.`)
                                msg.channel.send({embed})
                            }
                            else return msg.channel.send("I had a problem saving the starboard.")
                            
                        })
                    })
                }
                await channelPrompt(msg)
            }
            let manageBoard = async msg =>{
                let selectionPrompt = async msg =>{
                    let embed = u.embed().setTitle("Which starboard do you want to manage?").setDescription(`${existingBoards ? `Current starboard(s):\n<#${existingBoards.map(e=> e.channel).join('>\n<#')}>` : 'There are no boards to manage.'}`)
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(channelFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content.replace(/[^0-9]/g, '')
                            let findBoard = existingBoards.find(b => b.channel == content)
                            if(findBoard && !msg.guild.channels.cache.get(content)){
                                msg.channel.send("I couldn't find that channel. It might have been deleted.")
                                await selectionPrompt(msg)
                            }
                            else if(findBoard){
                                await initialPrompt(msg, findBoard)
                            }
                            else{
                                msg.channel.send("That's not one of the options. Please try again.")
                                await selectionPrompt(msg)
                            }
                        })
                    })
                }
                let initialPrompt = async (msg, channel) =>{
                    let embed = u.embed().setTitle('What do you want to manage?').setDescription('The options are:\Reactions\nChannel Exclusivity\nReaction Amount\nDelete\nDone')
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content.toLowerCase()
                            if(content == 'reactions') await reactionPrompt(msg, channel)
                            else if(content == 'exclusivity') await singleChannelPrompt(msg, channel)
                            else if(content == 'reaction') await toStarPrompt(msg, channel)
                            else if(content == 'delete') await deletePrompt(msg, channel)
                            else if(content == 'done') return msg.channel.send("Modification Complete")
                        })
                    })
                }
                let reactionPrompt = async (msg, channel) =>{
                    let addEmoji = async(msg, channel, emoji=[])=>{
                        let embed = u.embed().setTitle('What emoji do you want to add?').setDescription(`Current reactions:\n${existingBoards.map(e=>e.reactions).join('\n')}\n4${emoji.join('\n')}\nType \`done\` when you're finished`)
                        msg.channel.send({embed}).then(async m=>{
                            await m.channel.awaitMessages(contentFilter, {max: 1, time, errors:['time']})
                            .then(async collected=>{
                                let content = collected.first().content
                                if(content.toLowerCase() == 'done'){
                                    if(emoji.length == 0) emoji = ['⭐','🌟']
                                    Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, emoji, channel.singleChannel, channel.toStar)
                                    await(reactionPrompt(msg, channel))
                                }
                                else{
                                    let findEmoji = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == content)
                                    let unicodeEmote = onlyEmoji(content)
                                    if(!unicodeEmote && !findEmoji){
                                        msg.channel.send("I couldn't find that emoji!")
                                        await addEmoji(msg, channel, emoji)
                                    }
                                    else{
                                        if(findEmoji) emoji.push(findEmoji.id)
                                        else if(unicodeEmote) emoji.push(unicodeEmote)
                                        await addEmoji(msg,channel,emoji)
                                    }
                                }
                            })
                        })
                    }
                    let removeEmoji = async(msg, channel)=>{
                        let embed = u.embed().setTitle("Which one do you waant to remove?").setDescription(`Current reactions:\n${existingBoards.map(e=>e.reactions).join('\n')}\nType \`done\` when you're done`)
                        msg.channel.send({embed}).then(async m=>{
                            await m.channel.awaitMessages(contentFilter, {max: 1, time, errors:['time']})
                            .then(async collected=>{
                                let content = collected.first().content
                                let foundEmoji = channel.reactions.find(r => r == content)
                                if(content.toLowerCase() == 'done'){
                                    await reactionPrompt(msg, channel)
                                }
                                if(!foundEmoji){
                                    msg.channel.send("That's not one of the reactions.")
                                    await removeEmoji(msg, channel)
                                }
                                else{
                                    let newArray = channel.reactions.filter(r =>r != foundEmoji)
                                    Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, newArray, channel.toStar)
                                    await removeEmoji(msg, channel)
                                }
                            })
                        })

                    }
                    let embed = u.embed().setTitle('Do you want to add or remove reactions?').setDescription(`${existingBoards ? `Current reaction(s):\n${existingBoards.map(e=>e.reactions).join('\n')} `: 'There are no starboards set up.'}`)
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content.toLowerCase()
                            if(content == 'add') await addEmoji(msg, channel)
                            else if(content == 'remove') await removeEmoji(msg, channel)
                            else{
                                msg.cchannel.send("That's not one of the options.")
                                await manageBoard(msg)
                            }
                        })
                    })
                }
                let singleChannelPrompt = async (msg, channel) =>{
                    let embed = u.embed().setTitle('Which channel should this board watch for reactions?').setDescription('Type in the format of #channel-nname\nType `all` to disable exclusivity')
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content.toLowerCase()
                            let chanel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))?.id
                            if(content == 'all') chanel = ''
                            if(channel || content == 'all'){
                                Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, channel.reactions, chanel, channel.toStar)
                                await manageBoard(msg, channel)
                            }
                            else{
                                msg.channel.send("I couldn't find that channel. Please try again.")
                                await singleChannelPrompt(msg)
                            }
                        })
                    })
                }
                let toStarPrompt = async msg =>{

                }
                let deletePrompt = async msg =>{
                
                }
                if(existingBoards.length == 0){
                    msg.channel.send("There are no starboards to manage.")
                    await starPrompt(msg)
                }
            }
            let embed = u.embed().setTitle('Do you want to create or manage a starboard?').setDescription(existingBoards ? `Current starboard(s):\n<#${existingBoards.map(e => e.channel).join('>\n<#')}>` : 'There are no starboards currently set up')
            msg.channel.send({embed}).then(async m =>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'create') await createBoard(msg)
                    else if(content.toLowerCase() == 'manage') await manageBoard(msg)
                    else{
                        msg.channel.send("That's not one of the options. Please try again.")
                        await starPrompt(msg)
                    }
                })
            })
        }
        let logPrompt = async(msg)=>{
            let flags = async(msg, channel, firstTime = true, enabledEvents=[]) =>{
                let embed = u.embed().setTitle('What would you like to monitor?').setDescription(`Type \`done\` when you're done.\n\nEnabled:\n${enabledEvents.map(e => e[0]).join('\n')}`)
                if(firstTime) embed.setDescription(`The following are the options. Type \`done\` when you're done.\n\n${events.map(e=>e[0]).join('\n')}`)
                msg.channel.send({embed}).then(async m=>{
                    await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let content = collected.first().content
                        let filtered = events.find(e => e[0].toLowerCase() == content.toLowerCase())
                        if(content.toLowerCase() == 'all'){
                            Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, events.map(r => r[1]))
                            await mainMenu(msg)
                        }
                        else if(content.toLowerCase() == 'done'){
                            Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, enabledEvents.map(r => r[1]))
                            await mainMenu(msg)
                        }
                        else if(filtered){
                            if(filtered[1] == 'ea') enabledEvents = events
                            enabledEvents.push(filtered)
                            await flags(msg, channel, false, enabledEvents)
                        }
                        else{
                            msg.channel.send("That's not one of the options. Please try again.")
                            await flags(msg, channel, false, enabledEvents)
                        }
                    })
                })
            }
            let currentChannel = await Module.db.guildconfig.getLogChannel(msg.guild.id)
            let embed = u.embed().setTitle('What channel should I send the logs in?').setDescription(`Type \`none\` to disable log prompts.\nType it in the format of #channel-name\n${currentChannel ? `The current log channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no logging channel set up'}`)
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(channelFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'none'){
                        await Module.db.guildconfig.saveLogChannel(msg.guild.id)
                    }
                    let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                    if(!channel){
                        msg.channel.send("I couldn't find that channel. Please try again.")
                        await logPrompt(msg)
                    }
                    else{
                        await flags(msg, channel.id)
                    }
                })
            })
        }
        let mainMenu = async msg => {
            let embed = u.embed().setTitle('What do you want to configure?').setDescription('Options:\nChannels\nStarboards\nLogging\nDone')
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'channels') await channelPrompt(msg)
                    else if(content.toLowerCase() == 'starboards') await starPrompt(msg)
                    else if(content.toLowerCase().includes('log')) await logPrompt(msg)
                    else if(content.toLowerCase() == 'roles') await rolePrompt(msg)
                    else if(content.toLowerCase() == 'done') return msg.channel.send("Configuration complete")
                    else{
                        msg.channel.send("That's not one of the options")
                        await mainMenu(msg)
                    }
                })
            }
        )}
        return await mainMenu(msg)
    }
})
module.exports = Module