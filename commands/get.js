const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors')
function toEpoch (time) {
    return `<t:${Math.floor(time/1000)}>`
}
const Module = new Augur.Module();
Module.addCommand({name: "get",
    syntax: "<type>",
    description: "Gets info about the server/server members",
    info: "Lots of sub commands (will describe later)",
    category: "Mod",
    memberPermissions: ['MANAGE_GUILD'],
    process: async (msg, suffix) =>{
        let words = suffix.split(' ')[0]
        let keywords = suffix.split(' ').slice(1).join(' ')
        msg.guild.members.fetch()
        if(words == 'members' || words == 'member' || words == 'user' || words == 'users') {
            if(keywords) {
                let object = msg.mentions.members.first() || (await msg.guild.members.fetch({query: keywords})).first() || msg.member
                let embed = u.embed();
                let a = object.presence?.activities
                embed.setTitle(`${object.displayName  || 'Unknown'} (${object.user.tag  || ''})`)
                .setColor(object.displayColor || null)
                .setThumbnail(object.user.displayAvatarURL({size: 32, dynamic: true}))
                .addFields([
                    {name: 'Roles', value: object.roles.cache.map(r => r).sort((d, a) => a.rawPosition - d.rawPosition).join("\n") || 'None', inline: true},
                    {name: 'Joined', value: toEpoch(object.joinedTimestamp) || 'Unknown', inline: true},
                    {name: 'Account Created', value: toEpoch(object.user.createdTimestamp) || 'Unknown', inline: true},
                    {name: 'Partial Member', value: object.partial.toString(), inline: true},
                    {name: 'Bot', value: object.user.bot.toString(), inline: true},
                    {name: 'ID', value: object.id || 'Unknown', inline: true},
                    {name: 'Activity', value: object.presence ? `${object.presence?.status}\n${a.length > 0 ? a.map(ac => `Type: \`${ac.type}\`\nStatus: ${ac.state ?? ac.name}`).join('\n') : ''}` : 'None'},
                ])
                return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
            else {
                let object = msg.guild.memberCount
                let bots = msg.guild.members.cache.filter(o => o.user.bot).size
                let embed = u.embed().setTitle(`There are \`${object}\` members in your server, \`${bots}\` of which are bots`)
                .addFields([
                    {name: 'Online', value: msg.guild.members.cache.filter(o => o.presence?.status == 'online').size.toString()},
                    {name: 'Idle', value: msg.guild.members.cache.filter(o => o.presence?.status == 'idle').size.toString()},
                    {name: 'Do Not Disturb', value: msg.guild.members.cache.filter(o => o.presence?.status == 'dnd').size.toString()},
                    {name: 'Offline/Invis', value: msg.guild.members.cache.filter(o => o.presence?.status == 'offline').size.toString()},
                ])
                if(!object) return msg.channel.send("While theoretically impossible, it appears that there aren't any members in your server...").then(u.clean)
                else return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}});
            }
        }
        else if(words == 'roles' || words == 'role') {
            if(keywords) {
                let object = msg.guild.roles.cache.find(r => r.toString() == keywords || r.name.toLowerCase() == keywords.toLowerCase() || r.id == keywords)
                if(!object) return msg.channel.send("Couldn't find that role.")
                let hasRole = object.members.map(r => r).join(`\n`)
                if(!hasRole) hasRole = 'Nobody'
                console.log(keywords)
                let embed = u.embed().setTitle(object.name)
                    .setColor(object.hexColor || null)
                    .addFields([
                        {name: 'ID', value: object.id || 'Unknown', inline: true},
                        {name: 'Created at', value: toEpoch(object.createdTimestamp) || 'Unknown', inline: true},
                        {name: 'Hoisted', value: object.hoist.toString(), inline: true},
                        {name: 'Mentionable', value: object.mentionable.toString(), inline: true},
                        {name: 'Who has it', value: msg.guild.roles.everyone == object ? 'Everyone' : hasRole || 'Nobody', inline: true},
                        {name: 'Position', value: (msg.guild.roles.cache.size - object.position).toString() || 'Unknown', inline: true},
                        {name: 'Color', value: object.hexColor.toString() || 'None', inline: true},
                    ])
                return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
                
            }
            else {
                let object = msg.guild.roles.cache.map(r => r).join("\n");
                let embed = u.embed().setTitle(`There are \`${msg.guild.roles.cache.size}\` roles in your server.`).setDescription(object)
                if(!object) return msg.channel.send("Looks like you don't have any roles.")
                else return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
            
        }
        else if(words == 'emojis' || words == 'emoji' || words == 'emotes' || words == 'emote')
        {
            if(keywords)
            {
                let object = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == keywords.replace(' ', '') || e.name.toLowerCase().replace(/~ /g, '') == keywords.toLowerCase().replace(/~ /g, '') || e.id == keywords) || msg.client.emojis.cache.find(e => `<:${e.name}:${e.id}>` == keywords.replace(' ', ''))
                if(!object) return msg.channel.send("Couldn't find that emoji.")
                let embed = u.embed()
                    .addFields([
                        {name: 'Name', value: object.name || 'Unknown', inline: true},
                        {name: 'ID', value: object.id || 'Unknown', inline: true},
                        {name: 'Guild', value: object.guild.name || 'Unknown', inline: true},
                        {name: 'Created by', value: object.author || 'Unknown', inline: true},
                        {name: 'Animated', value: object.animated, inline: true},
                        {name: 'Available', value: object.available, inline: true},
                        {name: 'Created at', value: toEpoch(object.createdTimestamp) || 'Unknown', inline: true},
                        {name: 'Exclusive to roles', value: object.roles.cache.map(r => r.name).join(`\n`) || 'None', inline: true},
                    ])
                if(object.url) embed.setImage(object.url)
                return msg.channel.send({embed, allowedMentions: {parse: []}})
            }
            else
            {
                let object = msg.guild.emojis.cache.map(e => e).join("  ");
                let embed = u.embed().setTitle(`There are \`${msg.guild.emojis.cache.values().length}\` emojis in your server.`).setDescription(object)
                if(!object) return msg.channel.send("Looks like your server doesn't have any emojis.")
                else return msg.channel.send({embed, allowedMentions: {parse: []}})
            }
        }
        else if(words == 'channels' || words == 'channel') {
            if(keywords) {
                let object = msg.guild.channels.cache.filter(b => b.type != 'GUILD_CATEGORY').find(c => c.name.toLowerCase() == keywords.toLowerCase() || c.id == keywords)
                if(!object) return msg.channel.send("I couldn't find that channel.")
                let embed = u.embed().setTitle(`#${object.name}`)
                    .addFields([
                        {name: 'ID', value: object.id, inline: true},
                        {name: 'Category', value: object.parent || 'None', inline: true},
                        {name: 'Created at', value: toEpoch(object.createdTimestamp) || 'Unknown', inline: true},
                        {name: 'Type', value: object.type, inline: true}
                    ])
                    if(object.isVoice()) {
                        embed.addFields([
                            {name: 'Bitrate', value: object.bitrate || 'Unknown', inline: true},
                            {name: 'User Limit', value: object.userLimit || 'None', inline: true},
                            {name: 'Members in the VC', value: object.members.map(m => m).join('\n') || 'None', inline: true}
                        ])
                    }
                    else if(object.isText()){
                        embed.addFields([
                            {name: 'Description' || 'Unknown', value: object.topic, inline: true},
                            {name: 'Last pin at', value: object.lastPinAt || 'N/A', inline: true},
                            {name: 'NSFW', value: object.nsfw ? 'true' : 'false' , inline: true},
                            {name: 'Slowmode', value: object.rateLimitPerUser || 'None', inline: true}
                        ])
                    }
                    else {
                        embed.addField('Lat pin at', `${object.lastPinAt || 'N/A'}`, true)
                    }
                return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})

            }
            else {
                let object = msg.guild.channels.cache.filter(b => b.type != 'GUILD_CATEGORY').filter(b => !b.isText()).map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join(`\n`)
                let vc = msg.guild.channels.cache.filter(b => b.isVoice()).map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join(`\n`)
                if(!vc) vc = ' '
                let embed = u.embed().setTitle(`There are \`${msg.guild.channels.cache.filter(b=> b.type !='GUILD_CATEGORY').values().length}\` channels in your server.`).setDescription(`${object} \n${vc}`)
                if(!object) return msg.channel.send("no channels found")
                else return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
        }
        else if(words == 'categories'||words == 'category')
        {
            if(keywords)
            {
                let object = msg.guild.channels.cache.filter(b => b.type == 'GUILD_CATEGORY').find(c => c.name.toLowerCase() == keywords.toLowerCase() || c.id == keywords)
                if(!object) return msg.channel.send("I couldn't find that category.")
                let textChildren = object.children.filter(b => b.isText()).map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join('\n')
                let voiceChildren = object.children.filter(b => b.isVoice()).map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join('\n')
                let embed = u.embed().setTitle(`${object.name}`)
                .addFields([
                    {name: 'ID', value: object.id, inline: true},
                    {name: 'Created at', value: toEpoch(object.createdTimestamp) || 'Unknown', inline: true},
                    {name: 'Permissions', value: object.permissionOverwrites.map(p => p.type).join(`\n`) ||'None', inline: true},
                    {name: 'Children', value: `**Text:** \n${textChildren} \n\n**Voice:**\n ${voiceChildren}` || 'None', inline: true},
                ])
                return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
            else
            {
                let object = msg.guild.channels.cache.filter(b => b.type == 'GUILD_CATEGORY').sort((a, d) => d.rawPosition - a.rawPosition).map(c => c.name).reverse().join(`\n`)
                let embed = u.embed().setTitle(`There are \`${msg.guild.channels.cache.filter(b =>b.type == 'GUILD_CATEGORY').values().length}\` categories in your server`).setDescription(`\`\`\`${object}\`\`\``)
                if(!object) return msg.channel.send("Looks like you don't have any categories.")
                else return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
        }
        else if(words == 'bans' || words == 'ban' || words == 'banned')
        {
            if(keywords)
            {
                let get = await msg.guild.bans.fetch()
                let object = get.find(b => b.user.username.toLowerCase() == keywords || b.user.id == keywords || b.user.tag.toLowerCase() == keywords.toLowerCase())
                if(!object) return msg.channel.send("I couldn't find that user.")
                let embed = u.embed().setTitle(object.user.username)
                .addFields([
                    {name: 'ID', value: object.user.id || 'Unknown', inline: true},
                    {name: 'Created at', value: toEpoch(object.user.createdTimestamp) , inline: true},
                    {name: 'Activity', value: object.user.presence?.status , inline: true},
                    {name: 'Bot', value: object.user.bot, inline: true},
                    {name: 'Partial user', value: object.user.partial , inline: true},
                    {name: 'Ban reason', value: object.reason ? object.reason : 'None given', inline: true}
                ]).setThumbnail(object.user.displayAvatarURL({size: 64}))
                msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
            else
            {
                msg.guild.bans.fetch().then(banned =>
                    {
                        let object = banned.map(u => u.user).join('\n');
                        let embed = u.embed().setTitle(`There ${banned.values().length == 1 ? 'is' : 'are'} \`${banned.values().length}\` banned user${banned.values().length == 1 ? '' : 's'} in your server`).setDescription(object)
                        return msg.channel.send({embeds: [embed]})
                    })
            }
        }
        else if(words == 'guild' || words == 'server')
        {
            try{

                let object = msg.guild
                if(keywords && msg.author.id == '337713155801350146') object = msg.client.guilds.cache.find(g => g.name.toLowerCase().startsWith(keywords) || g.id == keywords) || msg.guild
                let embed = u.embed().setTitle(object.name)
                    .addFields([
                        {name: 'Owner', value: object.members.cache.get(object.ownerId).displayName || 'Unknown' , inline: true},
                        {name: 'Description', value: object.description || 'None' , inline: true},
                        {name: 'Name Acronym', value: object.nameAcronym || 'Unknown', inline: true},
                        
                        {name: 'Created at', value: new Date(object.createdAt).toLocaleString() ?? 'Unknown' , inline: true}, 
                        {name: 'ID', value: object.id || 'Unknown' , inline: true},
                        
                        {name: 'Members', value: object.memberCount.toString() ?? 'Unknown' , inline: true},
                        {name: 'Online', value: object.presences.cache.filter(o => o.status == 'online').values().length?.toString() || 'Unknown' , inline: true},
                        {name: 'Large', value: object.large.toString() ?? 'Unknown', inline: true},
    
                        {name: 'Content Filter', value: object.explicitContentFilter.toString() || 'Unknown', inline: true},
                        {name: '2FA Level', value: object.mfaLevel.toString() ?? 'Unknown', inline: true},
                        {name: 'Verification Level', value: object.verificationLevel.toString() || 'Unknown', inline: true},
    
                        {name: 'Partnered', value: object.partnered.toString() || 'Unknown', inline: true},
                        {name: 'Boost Count', value: object.premiumSubscriptionCount.toString() || 'Unknown', inline: true},
                        {name: 'Boost Tier', value: object.premiumTier.toString() || 'Unknown', inline: true},
                        
                        {name: 'Verified', value: object.verified.toString() || 'Unknown', inline: true},
                        {name: 'Default Pings', value: object.defaultMessageNotifications == 0 ? 'All messages' : 'Mentions' || 'Unknown', inline: true},
                        {name: 'Vanity URL Code', value: object.vanityURLCode?.toString() || 'None' , inline: true},
                        
                        
                        {name: 'AFK timeout', value: `${(object.afkTimeout)/60} minute${(object.afkTimeout)/60 == 1 ? '' : 's'}` || 'Unknown', inline: true},
                        {name: 'AFK channel', value: object.afkChannel? object.afkChannel.name : 'None' || 'Unknown', inline: true},
                        {name: 'Rules Channel', value: object.rulesChannel ? object.rulesChannel.toString() : 'None' || 'Unknown', inline: true},
                        
                        {name: 'System Channel', value: object.systemChannel?object.systemChannel.toString():'None' || 'Unknown', inline: true},
                        {name: 'Public Updates Channel', value: object.publicUpdatesChannel?object.publicUpdatesChannel.toString():'None' || 'Unknown', inline: true},
                        {name: 'Widget Channel', value: object.widgetChannel?object.widgetChannel.toString():'None' || 'Unknown', inline: true},
                    ]).setThumbnail(object.iconURL({size: 128}))
                    if(object.discoverySplashURL) embed.setImage(object.discoverySplashURL())
                    return msg.channel.send({embeds: [embed], allowedMentions: {parse: []}})
            }
            catch(e){
                console.log(e)
            }
        }
        else return msg.channel.send("That's not a valid get command. Try specifying member, role, emoji, channel, category, ban, or guild.").then(u.clean)
    }
})

module.exports = Module