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
    category: "Mod",
    process: async (msg, suffix) =>{
        let time = 5000 * 60,
            options = {max: 1, time, errors: ['time']}
        let contentFilter = m => m.content && m.author == msg.author
        let channelFilter = m => m.content && (m.guild.channels.cache.get(m.content.replace(/[^0-9]/g, '')) || m.content.toLowerCase() == 'none') && m.author == msg.author
        let roleFilter = m => m.content && (m.guild.roles.cache.get(m.content.replace(/[^0-9]/g, '')) || m.content.toLowerCase() == 'none') && m.author == msg.author
        let channelPrompt = async () =>{
            let errorChannel = async () =>{
                let currentChannel = await Module.db.guildconfig.getErrorChannel(msg.guild.id)
                let embed = u.embed().setTitle("What channel should I send errors to?").setDescription(`Type it in the format of #channel-name\nType \`none\` to disable error messages\n${currentChannel ? `The current error channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no error channel set up right now.'}`)
                msg.channel.send({embed}).then(async m=>{
                    await m.channel.awaitMessages(channelFilter, options).then(async collected =>{
                        let content = collected.first().content,
                            channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                        if(!channel && content.toLowerCase() != 'none'){
                            msg.channel.send("I couldn't find that channel. Please try again.")
                            return errorChannel()
                        }
                        else if(await Module.db.guildconfig.saveErrorChannel(msg.guild.id, channel?.id) == null) {
                            msg.channel.send("I had a problem saving that.")
                            return mainMenu()
                        }
                        else{
                            let newEmbed = u.embed().setTitle(`Error log channel ${channel ? 'saved' : 'disabled'}`).setDescription(`Errors will be ${channel ? `sent to ${channel}` : 'contained to my logs'}`)
                            msg.channel.send(newEmbed)
                            return mainMenu()
                        }
                    }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                })
            }
            let botLobby = async () =>{
                let currentChannel = await Module.db.guildconfig.getBotLobby(msg.guild.id)
                let embed = u.embed().setTitle("What channel should I send large bits of text to?").setDescription(`Type it in the format of #channel-name\nType \`none\` to disable error messages\n${currentChannel ? `The current error channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no error channel set up right now.'}`)
                msg.channel.send({embed}).then(async m=>{
                    await m.channel.awaitMessages(channelFilter, options).then(async collected =>{
                        let content = collected.first().content,
                            channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                        if(!channel && content.toLowerCase() != 'none'){
                            msg.channel.send("I couldn't find that channel. Please try again.")
                            return botLobby()
                        }
                        else if(await Module.db.guildconfig.saveErrorChannel(msg.guild.id, channel?.id) == null) {
                            msg.channel.send("I had a problem saving that.")
                            return mainMenu()
                        }
                        else{
                            let newEmbed = u.embed().setTitle(`Bot lobby channel ${channel ? 'saved' : 'disabled'}`).setDescription(`Large text dumsp will be ${!channel ? 'sent in the channel they\'re sent in' : `sent to ${(channel)}`}`)
                            msg.channel.send(newEmbed)
                            return mainMenu()
                        }
                    }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                })
            }

            let embed = u.embed().setTitle('What channel do you want to configure?').setDescription('Options:\nError Channel\nBot Lobby')
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase().startsWith('error')) return errorChannel()
                    else if(content.toLowerCase().startsWith('bot')) return botLobby()
                    else{
                        msg.channel.send("That's not one of the options")
                        return channelPrompt()
                    }
                }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
            })
        }
        let starPrompt = async() =>{
            let existingBoards = await Module.db.guildconfig.getStarBoards(msg.guild.id)
            let  createBoard = async () =>{
                let channelPrompt = async () =>{
                    let embed =  u.embed().setTitle('What channel should I send messages to?').setDescription('Type in the format of #channel-name')
                    msg.channel.send({embed}).then(async m =>{
                        await m.channel.awaitMessages(channelFilter, options).then(async collected =>{
                            let channel = msg.guild.channels.cache.get(collected.first().content.replace(/[^0-9]/g, ''))
                            if(!channel){
                                msg.channel.send("I couldn't find that channel. Please try again.")
                                return channelPrompt(msg)
                            }
                            else return reactions(channel.id)
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                }
                let reactions = async (channel, reactionz = []) =>{
                    let embed = u.embed().setTitle("What reactions should trigger the board?").setDescription("Defaults are ⭐ and 🌟.\n🌟 will always send to the main starboard if a mod reacts with it\n\nType `done` when you're done")
                    msg.channel.send({embed}).then(async m =>{
                        await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                            let content = collected.first().content
                            if(content.toLowerCase() == 'done'){
                                if(reactionz.length == 0) reactionz = ['⭐','🌟']
                                return singleChannel(channel, reactionz)
                            }
                            else{
                                let findEmoji = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == content) || onlyEmoji(content)
                                if(!findEmoji){
                                    msg.channel.send("I couldn't find that emoji!")
                                    return reactions(channel, reactionz)
                                }
                                else{
                                    reactionz.push(content)
                                    return reactions(channel,reactionz)
                                }
                            }
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                    
                }
                let singleChannel = async (channel, reactions) =>{
                    let embed = u.embed().setTitle("Should this board only be able to be triggered from a certain channel?").setDescription("Type in the format of #channel-name. Type `none` for none ")
                    msg.channel.send({embed}).then(async m =>{
                        await m.channel.awaitMessages(channelFilter, options).then(async collected =>{
                            let content = collected.first().content
                            let channel2 = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                            if(!channel2 && content.toLowerCase() != 'none'){
                                msg.channel.send("I couldn't find that channel. Please try again.")
                                return singleChannel(channel, reactions)
                            }
                            else return toStar(channel, reactions, channel2?.id)
                        })
                    }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                }

                let toStar = async (channel, reactions, singleChannel) =>{
                    let embed = u.embed().setTitle(`How many reactions are needed to be sent to ${msg.guild.channels.cache.get(channel)?.name}?`).setDescription(`The default is 5. Reacting with 🌟 while having the Manage Server permission will automatically put this on <#${channel}>.`)
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                            let content = collected.first().content
                            if(isNaN(content) || content > 100 || content < 1){
                                msg.channel.send("That's not a valid number. (Must be between 1 and 100")
                                return toStar(channel, reactions, singleChannel)
                            }
                            else if(await Module.db.guildconfig.saveStarBoard(msg.guild.id, channel, reactions, singleChannel, Math.round(content)) != null){
                                let embed = u.embed().setTitle(`${msg.guild.channels.cache.get(channel).name} is now a starboard!`).setFooter(reactions.join(' '))
                                if(singleChannel) embed.setDescription(`Only messages in ${msg.guild.channels.cache.get(singleChannel)} will appear on this starboard.`)
                                msg.channel.send({embed})
                            }
                            else msg.channel.send("I had a problem saving the starboard.")
                            return mainMenu()
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                }
                await channelPrompt()
            }
            let manageBoard = async () =>{
                let selectionPrompt = async () =>{
                    let embed = u.embed().setTitle("Which starboard do you want to manage?").setDescription(`${existingBoards ? `Current starboard(s):\n<#${existingBoards.map(e=> e.channel).join('>\n<#')}>` : 'There are no boards to manage.'}`)
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(channelFilter, options).then(async collected =>{
                            let content = collected.first().content.replace(/[^0-9]/g, '')
                            let findBoard = existingBoards.find(b => b.channel == content)
                            if(findBoard && !msg.guild.channels.cache.get(content)){
                                msg.channel.send("I couldn't find that channel. It might have been deleted.")
                                return selectionPrompt()
                            }
                            else if(findBoard){
                                return initialPrompt(findBoard)
                            }
                            else{
                                msg.channel.send("That's not one of the options. Please try again.")
                                return selectionPrompt()
                            }
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                }
                let initialPrompt = async (channel) =>{
                    let embed = u.embed().setTitle('What do you want to manage?').setDescription('The options are:\Reactions\nChannel Exclusivity\nReaction Amount\nDelete\nDone')
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                            let content = collected.first().content.toLowerCase()
                            if(content == 'reactions') return reactionPrompt(channel)
                            else if(content == 'exclusivity') return singleChannelPrompt(channel)
                            else if(content == 'reaction') return toStarPrompt(channel)
                            else if(content == 'delete') return deletePrompt(channel)
                            else if(content == 'done') return msg.channel.send("Modification Complete")
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                }
                let reactionPrompt = async (channel) =>{
                    let addEmoji = async(channel, emoji=[])=>{
                        let embed = u.embed().setTitle('What emoji do you want to add?').setDescription(`Current reactions:\n${existingBoards.map(e=>e.reactions).join('\n')}\n4${emoji.join('\n')}\nType \`done\` when you're finished`)
                        msg.channel.send({embed}).then(async m=>{
                            await m.channel.awaitMessages(contentFilter, options).then(async collected=>{
                                let content = collected.first().content
                                if(content.toLowerCase() == 'done'){
                                    if(emoji.length == 0) emoji = ['⭐','🌟']
                                    Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, emoji, channel.singleChannel, channel.toStar)
                                    return reactionPrompt(channel)
                                }
                                else{
                                    let findEmoji = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == content)?.id || onlyEmoji(content)
                                    if(!findEmoji){
                                        msg.channel.send("I couldn't find that emoji!")
                                        await addEmoji(channel, emoji)
                                    }
                                    else emoji.push(findEmoji.id)
                                    return addEmoji(channel. emoji)
                                }
                            }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                        })
                    }
                    let removeEmoji = async(channel)=>{
                        let embed = u.embed().setTitle("Which one do you waant to remove?").setDescription(`Current reactions:\n${existingBoards.map(e=>e.reactions).join('\n')}\nType \`done\` when you're done`)
                        msg.channel.send({embed}).then(async m=>{
                            await m.channel.awaitMessages(contentFilter, options).then(async collected=>{
                                let content = collected.first().content,
                                match,
                                regex = /<:.*:(.*)>/g
                                if(match = regex.exec(content)) content = match[1]
                                let foundEmoji = channel.reactions.find(r => r == content)
                                if(content.toLowerCase() == 'done') return reactionPrompt(channel)
                                else if(!foundEmoji){
                                    msg.channel.send("That's not one of the reactions.")
                                    return removeEmoji(channel)
                                }
                                else{
                                    let newArray = channel.reactions.filter(r =>r != foundEmoji)
                                    Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, newArray, channel.toStar)
                                    return removeEmoji(channel)
                                }
                            }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                        })
                    }
                    let embed = u.embed().setTitle('Do you want to add or remove reactions?').setDescription(`${existingBoards ? `Current reaction(s):\n${existingBoards.map(e=>e.reactions).join('\n')} `: 'There are no starboards set up.'}`)
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                            let content = collected.first().content.toLowerCase()
                            if(content == 'add') return addEmoji(msg, channel)
                            else if(content == 'remove') return removeEmoji(msg, channel)
                            else{
                                msg.channel.send("That's not one of the options.")
                                return manageBoard(msg)
                            }
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                }
                let singleChannelPrompt = async (channel) =>{
                    let embed = u.embed().setTitle('Which channel should this board watch for reactions?').setDescription('Type in the format of #channel-nname\nType `all` to disable exclusivity')
                    msg.channel.send({embed}).then(async m=>{
                        await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                            let content = collected.first().content.toLowerCase()
                            let chanel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))?.id
                            if(content == 'all') chanel = ''
                            if(channel || content == 'all'){
                                Module.db.guildconfig.saveStarBoard(msg.guild.id, channel.channel, channel.reactions, chanel, channel.toStar)
                                return manageBoard(channel)
                            }
                            else{
                                msg.channel.send("I couldn't find that channel. Please try again.")
                                return singleChannelPrompt(channel)
                            }
                        }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                    })
                }
                let toStarPrompt = async (channel) =>{
                    msg.channel.send("Not implimented yet")
                    return manageBoard(channel)
                }
                let deletePrompt = async (channel) =>{
                    msg.channel.send("Not implimented yet")
                    return manageBoard(channel)
                }
                if(existingBoards.length == 0){
                    msg.channel.send("There are no starboards to manage.")
                    return starPrompt()
                }
            }
            let embed = u.embed().setTitle('Do you want to create or manage a starboard?').setDescription(existingBoards ? `Current starboard(s):\n<#${existingBoards.map(e => e.channel).join('>\n<#')}>` : 'There are no starboards currently set up')
            msg.channel.send({embed}).then(async m =>{
                await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'create') return createBoard()
                    else if(content.toLowerCase() == 'manage') return manageBoard()
                    else{
                        msg.channel.send("That's not one of the options. Please try again.")
                        return starPrompt()
                    }
                }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
            })
        }
        let logPrompt = async()=>{
            let flags = async(channel, firstTime = true, enabledEvents=[]) =>{
                let embed = u.embed().setTitle('What would you like to monitor?').setDescription(`Type \`done\` when you're done.\n\nEnabled:\n${enabledEvents.map(e => e[0]).join('\n')}`)
                if(firstTime) embed.setDescription(`The following are the options. Type \`done\` when you're done.\n\n${events.map(e=>e[0]).join('\n')}`)
                msg.channel.send({embed}).then(async m=>{
                    await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                        let content = collected.first().content
                        let filtered = events.find(e => e[0].toLowerCase() == content.toLowerCase())
                        if(content.toLowerCase() == 'all'){
                            Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, events.map(r => r[1]))
                            return mainMenu()
                        }
                        else if(content.toLowerCase() == 'done'){
                            Module.db.guildconfig.saveLogChannel(msg.guild.id, channel, enabledEvents.map(r => r[1]))
                            return mainMenu()
                        }
                        else if(filtered){
                            if(filtered[1] == 'ea') enabledEvents = events
                            enabledEvents.push(filtered)
                            return flags(channel, false, enabledEvents)
                        }
                        else{
                            msg.channel.send("That's not one of the options. Please try again.")
                            return flags(channel, false, enabledEvents)
                        }
                    }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
                })
            }
            let currentChannel = await Module.db.guildconfig.getLogChannel(msg.guild.id)
            let embed = u.embed().setTitle('What channel should I send the logs in?').setDescription(`Type \`none\` to disable log prompts.\nType it in the format of #channel-name\n${currentChannel ? `The current log channel is ${msg.guild.channels.cache.get(currentChannel)}` : 'There is no logging channel set up'}`)
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(channelFilter, options).then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'none'){
                        await Module.db.guildconfig.saveLogChannel(msg.guild.id)
                        return channelPrompt()
                    }
                    let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                    if(!channel){
                        msg.channel.send("I couldn't find that channel. Please try again.")
                        return logPrompt(msg)
                    }
                    else{
                        return flags(msg, channel.id)
                    }
                }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
            })
        }
        let mutedPrompt = async() =>{
            let currentRole = msg.guild.roles.cache.get(await Module.db.guildconfig.getMutedRole(msg.guild.id)),
                embed = u.embed().setTitle(`What should the role be?`).setDescription(`Type \`none\` to get rid of the muted role.\nThe current role is ${currentRole}`)
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(roleFilter, options).then(async collected =>{
                    let content = collected.first().content
                    let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, '')) || null
                    if(!channel && content.toLowerCase() != 'none'){
                        msg.channel.send("I couldn't find that role. Please try again")
                        return mutedPrompt()
                    }
                    else{
                        await Module.db.guildconfig.saveMutedRole(msg.guild.id, null)
                        return mainMenu()
                    }
                }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
            })
        }
        let mainMenu = async () => {
            let choices = ['Channels', 'Starboards', 'Logging', 'Muted', 'Done'],
                embed = u.embed().setTitle('What do you want to configure?').setDescription(`Options:\n${choices.join('\n')}`)
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(contentFilter, options).then(async collected =>{
                    let content = collected.first().content.toLowerCase()
                         if(content == choices[0].toLowerCase()) return channelPrompt()
                    else if(content == choices[1].toLowerCase()) return starPrompt()
                    else if(content == choices[2].toLowerCase()) return logPrompt()
                    else if(content == choices[3].toLowerCase()) return mutedPrompt()
                  //else if(content == choices[4].toLowerCase()) return rolePrompt()
                    else if(content == choices[4].toLowerCase()) return collected.first().react('👍')
                    else{
                        msg.channel.send("That's not one of the options")
                        return mainMenu()
                    }
                }).catch(()=> m.channel.send({embed: u.embed().setTitle('Timed out').setDescription('You ran out of time!')}))
            }
        )}
        return mainMenu()
    }
})
module.exports = Module