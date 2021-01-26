const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Module = new Augur.Module(),
    mongoose = require('mongoose')

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
            let embed = u.embed().setTitle('Do you want to create or manage a starboard?').setDescription(existingBoards ? existingBoards.join('\n') : 'There are no starboards currently set up')
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