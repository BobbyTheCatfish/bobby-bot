const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    tesseract = require('node-tesseract-ocr'),
    validUrl = require('valid-url'),
    jimp = require('jimp'),
    profanityFilter = require('profanity-matcher'),
    config = {oem: 0, psm: 3}

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
    syntax: "@User#1234 <reason>",
    description: "Bans people",
    info: "Want to ban someone from your server? Look no further. You can also ban multiple people in one swing of the ban hammer.",
    category: "Mod",
    onlyGuild: true,
    process: async (msg, suffix) =>{
        if(!msg.member.permissions.has("BAN_MEMBERS")) return msg.channel.send("You are not worthy to wield the ban hammer.").then(m => u.clean([m,msg]))
        let target, promptEmbed, confirmEmbed, cancelEmbed,
        mentions = /<@!?(\d+)>/ig,
        reason = suffix.replace(mentions, "")
        if(msg.mentions.members.size == 1)
        {
            target = msg.guild.members.cache.get(msg.mentions.members.first());
            if(!reason || reason.replace(/ /g, '').length < 1) reason = '<no reason given>'
            if(!target) return msg.channel.send("Sorry, I couldn't find that user.").then(m => u.clean([m,msg]))
            if(!target.bannable) return msg.reply("That person is immune to the ban hammer!").then(m => u.clean([m,msg]))
            if(target.roles.highest.position > msg.member.roles.highest.position && msg.member != msg.guild.owner) return msg.channel.send("You don't have permission to ban that user.")
            promptEmbed = u.embed().setTitle('Confirm ban for:').setDescription(target).addField('Reason', reason)
            confirmEmbed = u.embed().setTitle(`Ban successful`).setDescription(`${target} was banned by ${msg.member} for \`${reason}\``)
            cancelEmbed = u.embed().setTitle(`Ban canceled`).setDescription(`${msg.member} canceled the ban for ${target}`)
            let decision = await u.confirmEmbed(msg,promptEmbed,confirmEmbed,cancelEmbed)
            if(decision == true)
            {
                try{
                    msg.guild.members.cache.get(target).ban({reason: `${msg.author.username} banned them for: ${reason}`});
                    if (logChannel && msg.channel != logChannel) u.modEvent('ban', msg.member, [target], reason)// logChannel.send({embeds: [confirmEmbed]})
                }catch(e){
                    msg.channel.send("I ran into an error while banning them.").then(u.clean)
                    return logChannel ? logChannel.send(`An error occured while trying to ban ${target}: ${e}`) : console.log(e)
                }
            }
            return
        }
        else if(msg.mentions.members.size > 1)
        {
            if(!reason || reason.replace(/ /g, '').length < 1) reason = '<no reason given>'
            target = msg.mentions.members.map(m=>m);
            promptEmbed = u.embed().setTitle(`Confirm bans for:`).setDescription(target.join('\n')).addField('Reason',reason)
            confirmEmbed = u.embed().setTitle(`Ban results:`)
            let s = [], f = []
            target.forEach(m => {
                if(m.bannable && (target.roles.highest.position < msg.member.roles.highest.position || msg.member == msg.guild.owner)) s.push(m)
                else f.push(m)
            });
            if(s.length > 0) confirmEmbed.addField('Successes', s.join('\n'))
            if(f.length > 0) confirmEmbed.addField('Failures', f.join('\n'))
            cancelEmbed = u.embed().setTitle(`Bans canceled`).setDescription(`${msg.author} canceled the bans`)
            let decision = await u.confirmEmbed(msg,promptEmbed,confirmEmbed,cancelEmbed)
            if(decision == true)
            {
                s.forEach(m => {
                    try{
                        msg.guild.members.cache.get(m).ban(`${msg.author.username} batch banned them and others for ${reason.substr(0,400)}`);
                    }catch(e){
                        msg.channel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't ban ${m}`)], allowedMentions: {parse: []}}).then(m => u.clean(m))
                        if(logChannel && msg.channel != logChannel) logChannel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't ban ${m}`)], allowedMentions: {parse: []}})
                        else console.log(e)
                        return
                    }
                });
                if(logChannel && msg.channel != logChannel) u.modEvent('ban', msg.member, target, reason)//logChannel.send({embeds: [confirmEmbed]});
                return 
            }
            return
        }
        else return msg.channel.send("Who do you want to ban? Make sure you're pinging them.")
    }
})
.addCommand({name: "kick",
    syntax: "@User#1234 <reason>",
    description: "Kicks people",
    info: "Want to kick someone from your server? Look no further. You can also kick multiple people in one swing of the boot.",
    category: "Mod",
    permissions: ['KICK_MEMBERS'],
    onlyGuild: true,
    process: async (msg, suffix) =>{
        const logChannel = null
        let target
        let mentions = /<@!?(\d+)>/ig;
        let reason = suffix.replace(mentions, "")
        let promptEmbed, confirmEmbed, cancelEmbed
        if(msg.mentions.members.size == 1)
        {
            target = msg.guild.members.cache.get(msg.mentions.members.first());
            if(!reason || reason.replace(/ /g, '').length < 1) reason = '<no reason given>'
            if(!target) return msg.channel.send("Sorry, I couldn't find that user.").then(m => u.clean([m,msg]))
            if(!target.kickable) return msg.reply("That person is immune to the boot!").then(m => u.clean([m,msg]))
            if(target.roles.highest.position > msg.member.roles.highest.position && msg.member != msg.guild.owner) return msg.channel.send("You don't have permission to kick that user.")
            promptEmbed = u.embed().setTitle('Confirm kick for:').setDescription(target).addField('Reason', reason)
            confirmEmbed = u.embed().setTitle(`Kick successful`).setDescription(`${target} was kicked by ${msg.member} for \`${reason}\``)
            cancelEmbed = u.embed().setTitle(`Kick canceled`).setDescription(`${msg.member} canceled the kick for ${target}`)
            let decision = await u.confirmEmbed(msg,promptEmbed,confirmEmbed,cancelEmbed)
            if(decision == true)
            {
                try{
                    msg.guild.members.cache.get(target).kick(`${msg.author.username} kicked them for: ${reason.substr(0,400)}`);
                    if (logChannel && msg.channel != logChannel) u.modEvent('kick', msg.member, [target], reason)//logChannel.send({embeds: [confirmEmbed]})
                }catch(e){
                    msg.channel.send("I ran into an error while kicking them.")
                    logChannel ? logChannel.send(`An error occured while trying to kick ${target}: ${e}`) : console.log(e)
                }
            }
            return
        }
        else if(msg.mentions.members.size > 1)
        {
            if(!reason || reason.replace(/ /g, '').length < 1) reason = '<no reason given>'
            target = msg.mentions.members.map(m=>m);
            promptEmbed = u.embed().setTitle(`Confirm kicks for:`).setDescription(target.join('\n')).addField('Reason',reason)
            confirmEmbed = u.embed().setTitle(`Kick results:`)
            let s = [], f = []
            target.forEach(m => {
                if(m.kickable && (target.roles.highest.position < msg.member.roles.highest.position || msg.member == msg.guild.owner)) s.push(m)
                else f.push(m)
            });
            if(s.length > 0) confirmEmbed.addField('Successes', s.join('\n'))
            if(f.length > 0) confirmEmbed.addField('Failures', f.join('\n'))
            cancelEmbed = u.embed().setTitle(`Kicks canceled`).setDescription(`${msg.author} canceled the kicks`)
            let decision = await u.confirmEmbed(msg,promptEmbed,confirmEmbed,cancelEmbed)
            if(decision == true)
            {
                s.forEach(m => {
                    try{
                        msg.guild.members.cache.get(m).kick(`${msg.author.username} batch kicked them and others for ${reason.substr(0,400)}`);
                        if(logChannel && msg.channel != logChannel) u.modEvent('kick', msg.member, target, reason)
                    }catch(e){
                        msg.channel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't kick ${m}`)], allowedMentions: {parse: []}}).then(m => u.clean(m))
                        if(logChannel && msg.channel != logChannel) logChannel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't kick ${m}`)], allowedMentions: {parse: []}})
                        else console.log(e)
                        return
                    }
                });
                //if(logChannel && msg.channel != logChannel) logChannel.send(({embeds: [confirmEmbed]}));
                return 
                
            }
            return
        }
        else return msg.channel.send("Who do you want to kick? Make sure you're pinging them.")
    }
})
.addCommand({name: "clear",
    syntax: "<number>",
    description: "Clears messages",
    info: "Deletes up to 200 messages in a channel, including the one you send",
    category: "Mod",
    permissions:['MANAGE_MESSAGES'],
    onlyGuild: true,
    process: async (msg, suffix) =>{
        var deleteCount = suffix;
        if(isNaN(deleteCount) || !deleteCount || deleteCount < 2 || deleteCount > 200) return msg.channel.send("Please provide a number between 2 and 200 for the number of messages to delete")
        else msg.channel.bulkDelete(deleteCount).catch(error => errorChannel ? errorChannel.send(`I couldn't delete messages in ${msg.channel} because of: ${error}`) : msg.reply(`Couldn't delete messages because of: ${error}`));
        let embed = u.embed().setTitle(`${deleteCount} messages deleted by ${msg.member.displayName}`)
        if(logChannel && logChannel != msg.channel) return u.modEvent('clear', msg.member, msg.channel, deleteCount)//logChannel.send({embeds: [embed]})
        else return msg.channel.send({embeds: [embed]}).then(u.clean)
    }
})
.addCommand({name: "dcall",
    description: "Disconnects all members from VCs",
    category: "Mod",
    permissions: ['MOVE_MEMBERS'],
    onlyGuild: true,
    process: async (msg, suffix) =>{
        let total = []
        for(let m of msg.guild.members.cache){
            if(m.voice.channel && m != msg.member){
                m.voice.setChannel(null)
                total.push(m.id)
            }
            if(logChannel && logChannel != msg.channel) u.modEvent('dcall', msg.member, msg.channel, total.length)
            else msg.channel.send(`${msg.member.displayName} called a DC All in ${msg.channel.name}, causing ${total.length} people to DC`)
            //(logChannel ? logChannel : msg.channel).send
        };

    }
})
.addCommand({name: 'emoji',
    description: 'Tool for managing server emojis',
    category: 'Mod',
    permissions: ['MANAGE_EMOJIS_AND_STICKERS'],
    onlyGuild: true,
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
//.addCommand({name:'lockall',
//    description: 'Locks all the VCs',
//    category: 'Mod',
//    permissions: ['MOVE_MEMBERS'],
//    onlyGuild: true,
//    process: async(msg, suffix) =>{
//        if(!msg.guild.id == '765669316217143315') return
//        if(!msg.member.permissions.has('MANAGE_MESSAGES')) return msg.channel.send("You don't have permission to use that command.")
//        let channel = msg.client.channels.cache.get("765669316741038141");
//        let perms = channel.permissionsFor(msg.guild.members.cache.get('458086784065208320')).toArray()
//        if(perms.includes('CONNECT'))
//        {
//            channel.permissionOverwrites.edit(channel.guild.roles.everyone, {CONNECT: false})
//            await msg.react('🔒')
//            if(msg.guild.id == '765669316217143315') console.log(`${'C '.cyan}${u.time()} ${(msg.member.displayName).yellow} ${'locked all the VCs!'.green}`)
//        }
//        else
//        {
//            channel.permissionOverwrites.edit(channel.guild.roles.everyone, {CONNECT: null})
//            await msg.react('🔓')
//            if(msg.guild.id == '765669316217143315') console.log(`${'C '.cyan}${u.time()} ${(msg.member.displayName).yellow} ${`unlocked all the VCs!`.red}`)
//        }
//}
//})
.addCommand({name:'mute',
    description: 'Mutes people',
    category: 'Mod',
    permissions: ['MANAGE_ROLES'],
    onlyGuild: true,
    process: async(msg, suffix) =>{
        let s = []
        let err = []
        let mutedUsers = msg.mentions.members
        let dbFetch = await Module.db.guildconfig.getMutedRole(msg.guild.id)
        if(dbFetch == 'disabled' || !dbFetch) return msg.channel.send(`The mute command is disabled. Use \`/config\` to set it up.`)
        if(mutedUsers.size == 0) return msg.channel.send(`You need to specify who to mute`)
        const muteRole = msg.guild.roles.cache.find(r => r.id == dbFetch);
        if(!muteRole) return u.reply(msg, `I couldn't find the muted role.`, true)
        mutedUsers.forEach(m => {
            if(m.roles.cache.has(muteRole.id)) err.push(`<@${m.user.id}>`)
            else try{
                m.roles.add(muteRole)
                s.push(`<@${m.user.id}>`)
            }catch(e){err.push(`<@${m.user.id}>`)}
        });
        let embed = u.embed().setTitle(`Mute Resulst:`)
        if(s.length > 0) embed.addField("Successfully muted", `${s.join('\n')}`)
        if(err.length > 0) embed.addField("Failed to add role", `${err.join('\n')}`)
        return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}});
    }
})
.addCommand({name:'unmute',
    description: 'Unmutes people',
    category: 'Mod',
    permissions: ['MANAGE_ROLES'],
    onlyGuild: true,
    process: async(msg, suffix) =>{
        let s = []
        let err = []
        let mutedUsers = msg.mentions.members
        let dbFetch = await Module.db.guildconfig.getMutedRole(msg.guild.id)
        if(dbFetch == 'disabled') return msg.channel.send("The unmute command was disabled when using `!config` to remove the muted role.")
        if(mutedUsers.size == 0) return msg.channel.send(`You need to specify who to mute`)
        const muteRole = msg.guild.roles.cache.find(r => dbFetch ? r.id == dbFetch : r.name.toLowerCase() === "muted");
        if(!muteRole) return msg.channel.send(`I couldn't find the muted role to remove.`)
        msg.mentions.members.forEach(m => {
            if(!m.roles.cache.has(muteRole.id)) err.push(`<@${m.user.id}>`)
            else try{
                m.roles.remove(muteRole)
                s.push(`<@${m.user.id}>`)
            }catch(e){err.push(`<@${m.user.id}>`)}
        });
        let embed = u.embed().setTitle(`Unmute Resulst:`)
        if(s.length > 0) embed.addField("Successfully unmuted", s.join('\n'))
        if(err.length > 0) embed.addField("Failed to remove role", err.join('\n'))
        return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}});    
    }
})
.addCommand({name:'muteall',
    description: 'Mutes all members in a VC',
    category: 'Mod',
    permissions: ['MUTE_MEMBERS'],
    onlyGuild: true,
    process: async(msg, suffix) =>{
        let channel = msg.member.voice.channel;
        if(!channel) return msg.channel.send("You need to be in a voice channel to mute the members in it!");
        for (let m of channel.members.map(r => r)) if(!m.permissions.has('ADMINISTRATOR' || 'MANAGE_GUILD') && m != msg.member) m.voice.setMute(true)
    }
})
.addCommand({name:'unmuteall',
    description: 'Unutes all members in a VC',
    category: 'Mod',
    permissions: ['MUTE_MEMBERS'],
    onlyGuild: true,
    process: async(msg, suffix) =>{
        let channel = msg.member.voice.channel;
        if(!channel) return msg.channel.send("You need to be in a voice channel to unmute the members in it!");
        for (let m of channel.members.map(r => r)) if(!m.permissions.has('ADMINISTRATOR' || 'MANAGE_GUILD') && m != msg.member) m.voice.setMute(false)
    }
})
.addCommand({name:'nick',
    description: `Changes someone's nickname`,
    category: 'Mod',
    permissions: ['MANAGE_NICKNAMES'],
    onlyGuild: true,
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
.addEvent('messageCreate', async msg =>{
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