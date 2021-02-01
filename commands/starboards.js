const Augur = require('augurbot'),
    u = require('../utils/utils'),
    mongoose = require('mongoose')
    colors = require('colors')

const Module = new Augur.Module();

let starboards = async(msg) => await Module.db.guildconfig.getStarBoards(msg.guild.id)

let postToBoard = async(reaction, user, force=false) =>{
    let msg = reaction.message
    let guildBoards = await starboards(msg)
    if(guildBoards.length > 0){
        if(!guildBoards.includes({channel: msg.channel.id})){
            for(x of guildBoards){
                if(!x.reactions.includes(reaction.emoji.name) && !x.reactions.includes(reaction.emoji.id) && !(x.main && force)) continue
                else if(x.singleChannel && msg.channel.id != x.singleChannel && !force) continue
                if(reaction.count == x.toStar || force){
                    let channel = msg.guild.channels.cache.get(x.channel)
                    let embed = u.embed().setDescription(msg.content)
                    if(msg.attachments.first()) embed.setImage(msg.attachments.first().url)
                    embed.addField('Channel', msg.channel).addField('Jump to post', msg.url).setTimestamp(msg.createdAt).setAuthor(msg.member.displayName, msg.author.avatarURL()).setFooter(reaction.emoji.name)
                    if(channel){
                        channel.send({embed})
                        Module.db.guildconfig.saveSBMessage(msg)
                    }
                    else u.errorHandler(`Starboard Send Error`, `Couldn't send to channel *${x.channel}* in guild *${msg.guild.name}*`)
                }
            }
        }
    }
}

Module.addEvent('messageReactionAdd', async(reaction, user) =>{
    if(reaction.message.author.bot) return
    if(user.bot) return
    if(!reaction.message.guild) return
    if(reaction.message.createdTimestamp < (Date.now() - 3 * 24 * 60 * 60000)) return
    let member = reaction.message.guild.members.cache.get(user.id)
    if(member.hasPermission('MANAGE_GUILD') && reaction.emoji.name == '🌟') return await postToBoard(reaction, member, true)
    else await postToBoard(reaction, user) 
})

module.exports = Module;