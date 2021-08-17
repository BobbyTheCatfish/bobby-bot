const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors')

const Module = new Augur.Module();
const logChannel = null
const errorChannel = async msg => msg.guild.channels.cache.get(await Module.db.guildconfig.getErrorChannel(msg.guild.id))
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
                }catch(e){
                    msg.channel.send("I ran into an error while banning them.")
                    logChannel ? logChannel.send(`An error occured while trying to ban ${target}: ${e}`) : console.log(e)
                }
                if (logChannel && msg.channel != logChannel) logChannel.send({embeds: [confirmEmbed]})
                if(msg.guild.id == '765669316217143315')return console.log(`🔔 ${u.time()}${target.user.username.yellow} was banned by ${msg.author.username.red} for ${reason.cyan}`)
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
                        console.log(`🔔 ${u.time()}${m.user.username.yellow} was banned by ${msg.author.username.red} for ${reason.cyan}`)
                    }catch(e){
                        msg.channel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't ban ${m}`)], allowedMentions: {parse: []}}).then(m => u.clean(m))
                        if(logChannel && msg.channel != logChannel) logChannel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't ban ${m}`)], allowedMentions: {parse: []}})
                    }
                });
                if(logChannel && msg.channel != logChannel) logChannel.send({embeds: [confirmEmbed]});
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
                }catch(e){
                    msg.channel.send("I ran into an error while kicking them.")
                    logChannel ? logChannel.send(`An error occured while trying to kick ${target}: ${e}`) : console.log(e)
                }
                if (logChannel && msg.channel != logChannel) logChannel.send({embeds: [confirmEmbed]})
                return console.log(`🔔 ${u.time()}${target.user.username.yellow} was kicked by ${msg.author.username.red} for ${reason.cyan}`)
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
                        console.log(`🔔 ${u.time()}${m.user.username.yellow} was kicked by ${msg.author.username.red} for ${reason.cyan}`)
                    }catch(e){
                        msg.channel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't kick ${m}`)], allowedMentions: {parse: []}}).then(m => u.clean(m))
                        if(logChannel && msg.channel != logChannel) logChannel.send({embeds: [u.embed().setTitle('Error').setDescription(`I couldn't kick ${m}`)], allowedMentions: {parse: []}})
                    }
                });
                if(logChannel && msg.channel != logChannel) logChannel.send(({embeds: [confirmEmbed]}));
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
        if(logChannel && logChannel != msg.channel && deleteCount > 9) return logChannel.send({embeds: [embed]})
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
            if(msg.guild.id == '765669316217143315')console.log(`! ${u.time()}${msg.member.displayName.yellow} called a DC All in ${msg.guild.nameAcronym.red}, causing ${total.length.green} people to DC`);
            (logChannel ? logChannel : msg.channel).send(`${msg.member.displayName} called a DC All in ${msg.channel.name}, causing ${total.length} people to DC`)
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
        const validLink = 'You need to upload a picture or paste a link. If you posted a link but it didnt work, try including https:// at the start and making sure that it ends with .png or .gif'
        let words = suffix.split(' ')
        let keywords = words.slice(0).join(' ')

        if(words[0].toLowerCase() == 'add' || words[0].toLowerCase() == 'create'){
            if (msg.attachments.size > 0){
                let attachment = msg.attachments.first();
                if (attachment.height <= 1 && attachment.width <= 1) return msg.channel.send('You need to upload a picture. If you feel this is a mistake, try uploading manually.')
                if(!keywords || keywords.length < 2) return msg.channel.send(validName)
                return msg.guild.emojis.create(attachment.url, words[1]).then(e => msg.channel.send({embeds: [u.embed().setImage(e.url)]})).then(msg.channel.send('`:' + keywords.replace(/ /g, '-') + ':` was successfuly added!')).catch(error => msg.reply(`Couldn't create emoji because of: ${error}`));
            }
            else if(msg.content.endsWith('.png') || msg.content.endsWith('.jpg') || msg.content.endsWith('.gif'))
            {
                if(!words[2]) return msg.channel.send(validName)
                if(!msg.content.includes('https://')) return msg.channel.send(validLink)
                if(words[2].length < 2) return msg.channel.send(validName)
                return msg.guild.emojis.create(words[1], keywords).then(msg.channel.send('`:' + words[1] + ':` was successfuly added!')).catch(error => msg.reply(`Couldn't create emoji because of: ${error}`));                
            }
        }
        else if(words[0].toLowerCase() == 'id'){
            let test = /<(a?):\w+:(\d+)>/i;
            let id = test.exec(words[1]);
            if(id) return msg.channel.send('`'+id[2]+'`'+words[1])
            return msg.channel.send("Not a valid emoji (doesn't work with discord's emojis)")
        }
        else if(words[0].toLowerCase() == 'remove' || words[0].toLowerCase() == 'delete'){
            let test = /<(a?):\w+:(\d+)>/i;
            let id = test.exec(words[1]);
            if(!id) return msg.channel.send('You need to specify which emoji to remove')
            return msg.guild.emojis.cache.get(id[2]).delete().then(msg.channel.send('`' + words[1] + '` was successfuly removed!')).catch(error => msg.channel.reply(`Couldn't remove emoji because of: ${error}`));   
        }
        else if(words[0].toLowerCase() == 'rename'){
            let test = /<(a?):\w+:(\d+)>/i;
            let id = test.exec(words[1]);
            if(!id) return msg.channel.send('You need to specify which emoji to rename')
            if(!words[2]) return msg.channel.send('You need to specify what you want to rename it to')
            return msg.guild.emojis.cache.get(id[2]).setName(words[2]).then(msg.channel.send(words[1]+' was successfuly renamed to `'+ words[2]+'`')).catch(error => msg.channel.reply(`Couldn't rename emoji because of: ${error}`));
        }
        return msg.channel.send("That's an invalid action. Valid actions are `create`, `id`, `remove`, and `rename`.")
    }
})
.addCommand({name:'lockall',
    description: 'Locks all the VCs',
    category: 'Mod',
    permissions: ['MOVE_MEMBERS'],
    onlyGuild: true,
    process: async(msg, suffix) =>{
        if(!msg.guild.id == '765669316217143315') return
        if(!msg.member.permissions.has('MANAGE_MESSAGES')) return msg.channel.send("You don't have permission to use that command.")
        let channel = msg.client.channels.cache.get("765669316741038141");
        let perms = channel.permissionsFor(msg.guild.members.cache.get('458086784065208320')).toArray()
        if(perms.includes('CONNECT'))
        {
            channel.permissionOverwrites.edit(channel.guild.roles.everyone, {CONNECT: false})
            await msg.react('🔒')
            if(msg.guild.id == '765669316217143315') console.log(`${'C '.cyan}${u.time()} ${(msg.member.displayName).yellow} ${'locked all the VCs!'.green}`)
        }
        else
        {
            channel.permissionOverwrites.edit(channel.guild.roles.everyone, {CONNECT: null})
            await msg.react('🔓')
            if(msg.guild.id == '765669316217143315') console.log(`${'C '.cyan}${u.time()} ${(msg.member.displayName).yellow} ${`unlocked all the VCs!`.red}`)
        }
}
})
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
        if(dbFetch == 'disabled') return msg.channel.send("The mute command was disabled when using `!config` to remove the muted role.")
        if(mutedUsers.size == 0) return msg.channel.send(`You need to specify who to mute`)
        const muteRole = msg.guild.roles.cache.find(r => dbFetch ? r.id == dbFetch : r.name.toLowerCase() === "muted");
        if(!muteRole) return msg.channel.send(`I couldn't find the muted role.`)
        mutedUsers.forEach(m => {
            if(m.roles.cache.has(muteRole.id)) err.push(`<@${m.user.id}>`)
            else try{
                m.roles.add(muteRole)
                s.push(`<@${m.user.id}>`)
            }catch(e){err.push(`<@${m.user.id}>`)}
        });
        let embed = u.embed().setTitle(`Mute Resulst:`)
        if(s.length > 0) embed.addFields({name: "Successfully muted", value: s.join('\n')})
        if(err.length > 0) embed.addFields({name: "Failed to add role", value: err.join('\n')})
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
        if(s.length > 0) embed.addFields({name: "Successfully unmuted", value: s.join('\n')})
        if(err.length > 0) embed.addFields({name: "Failed to remove role", value: err.join('\n')})
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
                setTimeout(() => msg.delete(), 500)
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
module.exports = Module