const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Module = new Augur.Module(),
    mongoose = require('mongoose'),
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
        let mainMenu = async msg => {
            let embed = u.embed().setTitle('What do you want to configure?').setDescription('Options:\nChannels\nStarboards\nDone')
            msg.channel.send({embed}).then(async m=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'channels') await channelPrompt(msg)
                    else if(content.toLowerCase() == 'starboards') await starPrompt(msg)
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