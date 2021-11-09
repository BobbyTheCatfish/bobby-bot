const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    tesseract = require('node-tesseract-ocr'),
    validUrl = require('valid-url'),
    jimp = require('jimp'),
    profanityFilter = require('profanity-matcher'),
    config = {oem: 0, psm: 3},
    {Message, GuildMember} = require('discord.js')

const Module = new Augur.Module();
const logChannel = null
const errorChannel = async msg => msg.guild.channels.cache.get(await Module.db.guildconfig.getErrorChannel(msg.guild.id))
function filter(text){
    let noWhiteSpace = text.toLowerCase().replace(/[\.,\/#!$%\^&\*;:\{\}=\-_`~"'\(\)\?\|]/g,"").replace(/\s\s+/g, " ")
    let pf = new profanityFilter()
    let filtered = pf.scan(noWhiteSpace).filter(a => a.length > 0)
    if(filtered.length > 0 && (noWhiteSpace.length > 0)){
        return filtered
    }
}
Module.addCommand({name: "ban",
    syntax: "@User#1234 @User#5678 <reason>",
    description: "Bans people",
    info: "Want to ban someone from your server? Look no further. You can also ban multiple people in one swing of the ban hammer.",
    category: "Mod",
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async (msg, suffix) =>{
        if(!msg.member.permissions.has("BAN_MEMBERS")) return msg.channel.send("You are not worthy to wield the ban hammer.").then(m => u.clean([m,msg]))
        let {targets, reason} = u.parseTargets(suffix)
        let s = [], f = []
        if(targets.length < 1) return msg.reply("I need at least one target (make sure to mention them)")
        for(let m of targets) m.bannable && (m.roles.highest.position < msg.member.roles.highest.position || msg.member.id == msg.guild.ownerId) ? s.push(m) : f.push(m)        
        if(s.length < 1) return msg.reply("Unfortunately, I can't ban anyone on your hit-list.")
        if(reason.trim().length < 1) reason = 'no reason given'
        let plural = s.length > 1 ? "s":''
        let promptEmbed = u.embed().setTitle(`Confirm ban${plural} for:`).setDescription(`${s.join('\n')}${f.length > 0 ? `\n\nNote: I can't ban the following member${f.length > 1 ? 's': ''}:\n${f.join('\n')}` : ''}`).addField('Reason', reason)
        let confirmEmbed = u.embed().setTitle(`Ban${plural} confirmed`)
        let cancelEmbed = u.embed().setTitle(`Ban${plural} canceled`).setDescription(`${msg.author} canceled the ban${plural}`)
        let decision = await u.confirmEmbed(msg, promptEmbed, confirmEmbed, cancelEmbed)
        if(decision == true){
            let errors = []
            let good = []
            let p = new Promise(async(res, rej) =>{
                for(let i = 0; i < s.length; i++){
                    let x = s[i]
                    try{
                        await x.ban(`${x.displayName} ${s.length > 1 ? 'was caught in a batch ban':'was banned'} by ${msg.member.displayName}`)
                        good.push(x)
                        if(i == s.length+1) res(true)
                    } catch(e){
                        errors.push(x)
                        console.log(e)
                        continue
                    }
                }
            })
            await p
            let embed = u.embed().setTitle('Ban Results')
                .addField('Banned Members', good.length > 0 ? good.map(a => a.displayName).join('\n') : 'Nobody was banned')
                .setFooter(`Action performed by ${msg.member.displayName}`, msg.author.displayAvatarURL())
                .setTimestamp(new Date())
            if(errors.length > 0) embed.addField('Failed To Ban', errors.join('\n'))
            if(logChannel){
                if(msg.channel != logChannel) msg.reply(`Ban results in ${logChannel} (${`\`${good.length}\` banned`})`).then(m => u.clean(m, 3000))
                u.emit('ban', msg, targets, reason, embed)
            }
            else msg.reply({failIfNotExists: false, allowedMentions: {parse: []}, embeds: [embed]}).then(u.clean)
        }
    }
})
.addCommand({name: "kick",
    syntax: "@User#1234 <reason>",
    description: "Kicks people",
    info: "Want to kick someone from your server? Look no further. You can also kick multiple people in one swing of the boot.",
    category: "Mod",
    memberPermissions: ['KICK_MEMBERS'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async (msg, suffix) =>{
        let {targets, reason} = u.parseTargets(suffix)
        let s = [], f = []
        if(targets.length < 1) return msg.reply("I need at least one target (make sure to mention them)")
        for(let m of targets) m.kickable && (m.roles.highest.position < msg.member.roles.highest.position || msg.member.id == msg.guild.ownerId) ? s.push(m) : f.push(m)
        if(s.length < 1) return msg.reply(`Unfortunately, I can't kick ${targets.length > 1 ? "them": "anyone on your kick-list"}`)
        if(reason.trim().length < 1) reason = 'no reason given'
        let plural = s.length > 1 ? "s":''
        let promptEmbed = u.embed().setTitle(`Confirm kick${plural} for:`).setDescription(`${s.join('\n')}${f.length > 0 ? `\n\nNote: I can't kick the following member${f.length > 1 ? 's': ''}:\n${f.join('\n')}` : ''}`).addField('Reason', reason)
        let confirmEmbed = u.embed().setTitle(`Kick${plural} confirmed`)
        let cancelEmbed = u.embed().setTitle(`Kick${plural} canceled`).setDescription(`${msg.author} canceled the kick${plural}`)
        let decision = await u.confirmEmbed(msg, promptEmbed, confirmEmbed, cancelEmbed)
        if(decision == true){
            let errors = []
            let good = []
            let p = new Promise(async(res, rej) =>{
                for(let i = 0; i < s.length; i++){
                    let x = s[i]
                    try{
                        await x.kick(`${x.displayName} ${s.length > 1 ? 'was caught in a batch kick':'was kicked'} by ${msg.member.displayName}`)
                        good.push(x)
                        if(i == s.length+1) res(true)
                    } catch(e){
                        errors.push(x)
                        console.log(e)
                        continue
                    }
                }
            })
            let e = await p
            let embed = u.embed().setTitle('Kick Results')
                .addField(`Kicked Member${good.length > 1 ? 's' : ''}`, good.length > 0 ? good.map(a => a.displayName).join('\n') : 'Nobody was banned')
                .setFooter(`Action performed by ${msg.member.displayName}`, msg.author.displayAvatarURL())
                .setTimestamp(new Date())
            if(errors.length > 0) embed.addField('Failed To Kick', errors.join('\n'))
            if(logChannel){
                if(msg.channel != logChannel) msg.reply(`Kick results in ${logChannel} (${`\`${good.length}\` kicked`})`).then(m => u.clean(m, 3000))
                u.emit('kick', msg, targets, reason, embed)
            }
            else msg.reply({failIfNotExists: false, allowedMentions: {parse: []}, embeds: [embed]}).then(u.clean)
        }
    }
})
.addCommand({name: "clear",
    syntax: "<number>",
    description: "Clears messages",
    info: "Deletes up to 200 messages in a channel, including the one you send",
    category: "Mod",
    memberPermissions:['MANAGE_MESSAGES'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async (msg, suffix) =>{
        var deleteCount = suffix;
        let error = false
        if(isNaN(deleteCount) || !deleteCount || deleteCount < 2 || deleteCount > 200) return msg.channel.send("Please provide a number between 2 and 200 for the number of messages to delete")
        else await msg.channel.bulkDelete(deleteCount).catch(/**@param {Error} e*/e => {
            if(e.message.startsWith('You can only bulk delete messages')) msg.reply(`I can't bulk delete messages older than 14 days`).then(u.clean)
            else u.errorHandler(e, msg)
            error = true
        })
        if(error) return null
        let embed = u.embed().setTitle(`${deleteCount} messages deleted by ${msg.member.displayName}`).setFooter()
        if(logChannel){
            if(logChannel != msg.channel) msg.reply({failIfNotExists: false, allowedMentions: {parse: []}, embeds: [embed]}).then(u.clean)
            u.emit('clear', msg, msg.channel, embed)
        }
        if(logChannel && logChannel != msg.channel) return u.emit('clear', )//logChannel.send({embeds: [embed]})
        else return msg.channel.send({embeds: [embed]}).then(u.clean)
    }
})
.addCommand({name: "dcall",
    description: "Disconnects all members from all VCs or the one you're in",
    category: "Mod",
    memberPermissions: ['MOVE_MEMBERS'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async (msg, suffix) =>{
        let total = [], failed = []
        let channel = msg.member.voice.channel
        let members = msg.guild.members.cache.filter(m => channel ? m.voice.channelId == channel.id : m.voice.channelId).map(a=>a)
        let p = new Promise(async(res, rej) =>{
            for(let m of members){
                try{
                    await m.voice.setChannel(null)
                    total.push(m.id)
                } catch{
                    failed.push(m)
                }
            }
        })
        await p
        if(logChannel && logChannel != msg.channel) u.modEvent('dcall', msg.member, channel ?? msg.channel, total.length)
        else msg.channel.send(`${msg.member.displayName} ${channel ? 'disconnected all members from their voice channels' : `disconnected all members from ${channel.name}`} in ${msg.channel.name}, causing ${total.length} people to DC${failed.length > 0 ? `\n\nNote: I was unable to remove the following member${failed.length > 1 ? 's':''}:\n${failed.join('\n')}`: ""}`)
    }
})
.addCommand({name: 'emoji',
    description: 'Tool for managing server emojis',
    category: 'Mod',
    memberPermissions: ['MANAGE_EMOJIS_AND_STICKERS'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async (msg, suffix) =>{
        const validName = 'You need to specify a valid name for the emoji'
        const validLink = 'You need to upload a picture or paste a valid link.'
        let words = suffix?.toLowerCase().split(' ')
        let keywords = words.slice(0).join(' ')
        let cmd = words[0]

        if(['add, create'].includes(cmd)){
            let image = msg.attachments.first()?.url ?? words[1]
            if(!image || !await u.validImage(image)) return msg.reply(validLink)
            let name = words[1]
            if(!msg.attachments.first()) name = words[2]
            if(!name) return msg.reply(validName)
            let emoji
            try{
                emoji = await msg.guild.emojis.create(image, name)
            } catch{
                return msg.reply("I couldn't use that image (it was probably too big)").then(u.clean)
            }
            msg.reply(`\`:${emoji.name}:\` was successfully added!`)
            if(logChannel && msg.channel != logChannel) u.modEvent('emojiCreate', msg.member, emoji)
        }
        else if(['remove', 'delete'].includes(cmd)){
            let emoji = msg.guild.emojis.cache.find(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` == words[1])
            if(!emoji) return msg.reply("I need a valid emoji from this server.")
            emoji.delete().catch(()=>{
                return msg.reply("I wasn't able to delete that emoji. (Do I have the needed perms?)")
            })
            msg.reply(`\`${emoji.name}\` was successfully removed!`)
            if(logChannel && msg.channel != logChannel) u.modEvent('emojiDelete', msg.member, emoji)
        }
        else if(['rename', 'edit'].includes(cmd)){
            let emoji = msg.guild.emojis.cache.find(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` == words[1] || e.name == words[1])
            if(!emoji) return msg.channel.send('You need to specify which emoji to rename')
            if(!words[2]) return msg.channel.send('You need to specify what you want to rename it to')
            emoji.setName(words[2]).catch(()=> {
                return msg.reply("I wasn't able to rename that emoji. (Do I have the needed perms?)")
            })
            msg.reply(`\`:${emoji}:\` was successfully renamed to \`${msg.guild.emojis.cache.get(emoji.id)}\``)
            if(logChannel && msg.channel != logChannel) u.modEvent('emojiUpdate', msg.member, emoji, msg.guild.emojis.cache.get(emoji.id))
        }
        return msg.channel.send("That's an invalid action. Valid actions are `create`, `remove`, and `rename`.")
    }
})
.addCommand({name:'mute',
    description: 'Mutes people',
    category: 'Mod',
    memberPermissions: ['MANAGE_ROLES'],
    onlyGuild: true,
    /**@param {Message} msg
     * @property {Message} msg
    */
    process: async(msg, suffix) =>{
        let s = []
        let err = []
        let mutedUsers = msg.mentions.members
        let dbFetch = await Module.db.guildconfig.getMutedRole(msg.guild.id)
        if(dbFetch == 'disabled' || !dbFetch) return u.reply(msg, `The mute command is disabled. Use \`/config\` to set it up.`, true)
        if(mutedUsers.size == 0) return u.reply(msg, `You need to specify who to mute`, true)
        const muteRole = msg.guild.roles.cache.get(dbFetch);
        if(!muteRole) return u.reply(msg, `I couldn't find the muted role.`, true)
        let p = new Promise(async(res, rej) =>{
            for(let i = 0; i<mutedUsers.length; i++){
                let m = mutedUsers[i]
                if(!m.id || m.roles.cache.has(muteRole.id)) err.push(`<@${m.user.id}>`)
                else try{
                    await m.roles.add(muteRole)
                    s.push(`<@${m.user.id}>`)
                }catch(e){err.push(`<@${m.user.id}>`)}
                if(i+1 == mutedUsers.length) res()
            }
        })
        await p
        if(logChannel) u.modEvent('muteAll', msg.member, channel, null, )
        let embed = u.embed().setTitle(`Mute Results:`)
        if(s.length > 0) embed.addField("Successfully muted", `${s.join('\n')}`)
        if(err.length > 0) embed.addField("Failed to add role", `${err.join('\n')}`)
        let message = msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
        if(logChannel && logChannel != msg.channel){
            logChannel.send({embeds: [embed], allowedMentions: {parse: []}})
            u.clean(message)
        }
    }
})
.addCommand({name:'unmute',
    description: 'Unmutes people',
    category: 'Mod',
    memberPermissions: ['MANAGE_ROLES'],
    onlyGuild: true,
    /**@param {Message} msg */
    process: async(msg, suffix) =>{
        let s = []
        let err = []
        let [id, mutedUsers] = msg.mentions.members
        let dbFetch = await Module.db.guildconfig.getMutedRole(msg.guild.id)
        if(dbFetch == 'disabled') return msg.channel.send("The unmute command was disabled when using `!config` to remove the muted role.")
        if(mutedUsers.size == 0) return msg.channel.send(`You need to specify who to mute`)
        const muteRole = msg.guild.roles.cache.find(r => dbFetch ? r.id == dbFetch : r.name.toLowerCase() === "muted");
        if(!muteRole) return msg.channel.send(`I couldn't find the muted role to remove.`)
        let p = new Promise(async(res, rej) =>{
            for(let i = 0; i < mutedUsers.length; i++){
                let m = mutedUsers[i]
                if(!mid || !m.roles.cache.has(mutedRole.id)) err.push(m.member)
                else try{
                    await m.roles.remove(muteRole)
                    s.push(m.member)
                } catch{err.push(m.member)}
                if(i+1 == mutedUsers.length) res()
            }
        })
        await p
        let embed = u.embed().setTitle(`Unmute Resulst:`)
        if(s.length > 0) embed.addField("Successfully unmuted", s.join('\n'))
        if(err.length > 0) embed.addField("Failed to remove role", err.join('\n'))
        return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}});
    }
})
.addCommand({name:'muteall',
    description: 'Mutes all members in a VC',
    category: 'Mod',
    memberPermissions: ['MUTE_MEMBERS'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async(msg, suffix) =>{
        let channel = msg.member.voice.channel;
        if(!channel) return msg.channel.send("You need to be in a voice channel to mute the members in it!");
        let s = [], f = []
        let p = new Promise(async(res, rej) =>{
            let members = channel.members.map(r =>r)
            members.forEach(async(m, i) =>{
                try{
                    if(!m.permissions.has('ADMINISTRATOR' || 'MANAGE_GUILD') && m.id != msg.member.id){
                        m.voice.setMute(true)
                        s.push(m.id)
                    }
                } catch{
                    f.push(m.toString())
                }
                if(i+1 >= members.length) res()
            })
        })
        await p
        let embed = u.embed().setTitle(`Muted All in ${channel.name}`).setDescription(`Muted \`${s.length}\` members`)
        if(f.length > 0) embed.addField('Failed to Mute', f.join('\n'))
        if(logChannel) logChannel.send({embeds: [embed]})
    }
})
.addCommand({name:'unmuteall',
    description: 'Unutes all members in a VC',
    category: 'Mod',
    memberPermissions: ['MUTE_MEMBERS'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async(msg, suffix) =>{
        let channel = msg.member.voice.channel;
        if(!channel) return msg.channel.send("You need to be in a voice channel to unmute the members in it!");
        let s = [], f = []
        let p = new Promise(async(res, rej) =>{
            let members = channel.members.map(r =>r)
            members.forEach(async(m, i) =>{
                try{
                    if(!m.permissions.has('ADMINISTRATOR' || 'MANAGE_GUILD') && m.id != msg.member.id){
                        m.voice.setMute(true)
                        s.push(m.id)
                    }
                } catch{
                    f.push(m.toString())
                }
                if(i+1 >= members.length) res()
            })
        })
        await p
        let embed = u.embed().setTitle(`Muted All in ${channel.name}`).setDescription(`Muted \`${s.length}\` members`)
        if(f.length > 0) embed.addField('Failed to Mute', f.join('\n'))
        if(logChannel) logChannel.send({embeds: [embed]})
        //let channel = msg.member.voice.channel;
        //if(!channel) return msg.channel.send("You need to be in a voice channel to unmute the members in it!");
        //for (let m of channel.members.map(r => r)) if(!m.permissions.has('ADMINISTRATOR' || 'MANAGE_GUILD') && m != msg.member) m.voice.setMute(false)
    }//
})
.addCommand({name:'nick',
    description: `Changes someone's nickname`,
    category: 'Mod',
    memberPermissions: ['MANAGE_NICKNAMES'],
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async(msg, suffix) =>{
        let nickUser = msg.guild.members.cache.get(msg.mentions.users.first());
        if(!nickUser) return msg.channel.send("Who's nickname would you like me to change?")
        let nick = suffix.split(' ').slice(1).join(' ')
        if(!nick) return msg.channel.send("What would you like me to change their nickname to?")
        try {nickUser.setNickname(nick)} catch (error) {msg.channel.send("Looks like there was an error while changing their nickname!")}
    }
})
.addCommand({name:'say',
    description: `Repeats after you`,
    category: 'Mod',
    onlyGuild: true,
    /**@param {Message} msg*/
    process: async(msg, suffix) =>{
        if(msg.author.id == '337713155801350146' || (msg.member.permissions.has("ADMINISTRATOR")))
        {
            if(!suffix && !msg.attachments.size > 0) try {msg.author.send("You need to tell me what to say!")} catch (error) {msg.channel.send("I tried to send you a DM with information, but it looks like you have DMs turned off!").then(u.clean)}
            let content = suffix
            if(msg.attachments.size > 0) content = (suffix, {files: [msg.attachments.first().url]})
            try {
                msg.channel.send(content)
                return setTimeout(() => msg.delete(), 500)
            }catch (error) {msg.channel.send("I couldn't delete your message")}
        }
        if(msg.content.includes('no.')) return msg.channel.send('I refuse.')
        return msg.channel.send('no.')
    }
})
.addCommand({name:'prefix',
    description: `Changes the server prefix`,
    category: 'Mod',
    onlyGuild: true,
    otherPerms: (msg) => msg.author.id == '337713155801350146' || (msg.member && msg.member.permissions.has("ADMINISTRATOR")),
    /**@param {Message} msg*/
    process: async(msg, suffix) =>{
        let read = await Module.db.guildconfig.getPrefix(msg.guild.id)
        if(suffix == read) return msg.channel.send(`The prefix is already \`${suffix}\``)
        if(!suffix) return msg.channel.send(`The prefix is \`${read}\``).then(u.clean)
        if(suffix.length > 3) return msg.reply("you cannot have a prefix of more than 3 characters.").then(u.clean)
        await Module.db.guildconfig.savePrefix(msg.guild.id, suffix);
        return msg.channel.send(`Changed the prefix to \`${await Module.db.guildconfig.getPrefix(msg.guild.id)}\``).then(u.clean)
    }
})
.addEvent('messageReactionAdd', async (reaction, user) =>{
    try {
        if(!reaction.message.guild) return
        let member = reaction.message.guild.members.cache.get(user.id)
        if(['📌','📍','🧷'].includes(reaction.emoji.name) && member.permissions.has('MANAGE_MESSAGES') && reaction.message.pinnable) {
        let messages = await reaction.message.channel.messages.fetchPinned().catch(u.noop);
        if(messages.size == 50) return reaction.message.channel.send("You've reached the max number of pins for this channel. Please unpin something else if you want to pin this.")
        else await reaction.message.pin()
      }
    } catch (error) {
        reaction.message.channel.send(`Coudln't pin that post because: ${error}`)
        u.errorHandler(error, reaction.message.content)
    } 
})
.addEvent('messageCreate', /**@param {Message} msg*/ async msg =>{
    try{
        if(!msg.guild || msg.author.bot) return
        hasLanguage = false
        let guildFilter = await Module.db.guildconfig.langFilter(msg.guild?.id)
        if(guildFilter){
            let imgFiltered, msgFiltered
            if(guildFilter.includes('i')){
                let image = msg.attachments.first()?.url || validUrl.isWebUri(msg.content)
                if(image) try{await jimp.read(image)} catch{image = null}
                if(image){
                    image = await jimp.read(image)
                    image.resize(image.getWidth() *1.2, image.getHeight() * 1.2).grayscale
                    image = await image.getBufferAsync(jimp.MIME_JPEG)
                    let text = await tesseract.recognize(image, config)
                    if(text){
                        imgFiltered = filter(text)
                        if(imgFiltered) hasLanguage = "Looks like that image might have language in it. If this is the case, please delete it."
                    }
                }
            }
            if(guildFilter.includes('m') && msg.content){
                msgFiltered = filter(msg.content)
                if(msgFiltered) hasLanguage = `Looks like ${hasLanguage ? "both your message and image have" : "your message has"} some language in it. I'd delete it myself, but this feature is still in beta`
            }
            if(hasLanguage) {
                let embed = u.embed().setTitle("Language Warning").setURL(msg.url).setDescription(msg.content).setColor('#a86632')
                if(msgFiltered) embed.addField('Detected in message', msgFiltered.join('\n'))
                if(imgFiltered) embed.addField('Detected in image', imgFiltered.join('\n'))
                msg.guild.channels.cache.get(await Module.db.guildconfig.langLogChannel(msg.guild.id)).send({attachments: [msg.attachments.map(a => a.url)], embeds: [embed]})
                return msg.reply(hasLanguage).then(u.clean)
            }
    }

    } catch(e) {console.log(e, 'caught')}
})
module.exports = Module