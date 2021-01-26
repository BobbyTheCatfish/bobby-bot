const Augur = require('augurbot'),
    u = require('../utils/utils'),
    mongoose = require('mongoose')
    colors = require('colors')

const Module = new Augur.Module();

let starboards = async(msg) => await Module.db.guildconfig.getStarBoards(msg.guild.id)

let postToBoard = async(reaction, user, force=false) =>{
    let msg = reaction.message
    let guildBoards = await starboards(msg)
    console.log(guildBoards)
    if(!guildBoards) return
    else if(guildBoards.includes({id: msg.channel.id})) return
    else for(x of guildBoards){
        if(x.reactions.includes(reaction.emoji.name)){
            if(x.singleChannel && msg.channel.id != x.singleChannel) return
            else if(reaction.count != x.toStar && !force) return 
            let channel = msg.guild.channels.cache.get(x.id)
            let embed = u.embed().setDescription(msg.content)
            if(msg.attachments.first()) embed.setImage(msg.attachments.first().url)
            embed.addField('Channel', msg.channel).addField('Jump to post', msg.url).setTimestamp(msg.createdAt).setAuthor(msg.member.displayname, msg.author.avatarURL()).setFooter(reaction.emoji.name)
            if(channel) channel.send(embed)
        }
    }
}

Module.addEvent('messageReactionAdd', async(reaction, user) =>{
    if(reaction.message.author.bot) return
    if(!reaction.message.guild) return
    let member = reaction.message.guild.members.cache.get(user.id)
    if(member.hasPermission('MANAGE_GUILD') && reaction.emoji.name == '🌟') return await postToBoard(reaction, member, true)
    else await postToBoard(reaction, user) 
})
module.exports = Module;