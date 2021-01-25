const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors')

const Module = new Augur.Module();

Module.addCommand({name: "get",
    syntax: "<type>",
    description: "Gets info about the server/server members",
    info: "Lots of sub commands (will describe later)",
    category: "Mod",
    permissions: ['MANAGE_GUILD'],
    process: async (msg, suffix) =>{
        let words = suffix.split(' ')[0]
        let keywords = suffix.split(' ').slice(1).join(' ')
        msg.guild.members.fetch()
        if(words == 'members' || words == 'member' || words == 'user' || words == 'users')
        {
            if(keywords)
            {
                const low = require('lowdb')
                const FileSync = require('lowdb/adapters/FileSync')
                const adapter = new FileSync('jsons/verify.json')
                const db = low(adapter)
                let object = msg.mentions.members.first() || (await msg.guild.members.fetch({query: keywords})).first() || msg.member
                let embed = u.embed();
                let abc = db.get("Verify").find({id: object.id});
                if(msg.guild.id == '765669316217143315' && abc.get('email').value()) embed.addFields({name: 'Email', value: abc.get('email').value()?abc.get('email').value():'None'})
                embed.setTitle(`${object.displayName  || 'Unknown'} (${object.user.tag  || ''})`)
                .setColor(object.displayColor || '')
                .setThumbnail(object.user.displayAvatarURL({size: 32, dynamic: true}))
                .addFields(
                    {name: 'Roles', value: object.roles.cache.map(r => r).sort((d, a) => a.rawPosition - d.rawPosition).join("\n") || 'None', inline: true},
                    {name: 'Joined', value: object.joinedAt || 'Unknown', inline: true},
                    {name: 'Account Created', value: object.user.createdAt || 'Unknown', inline: true},
                    {name: 'Bannable', value: object.bannable, inline: true},
                    {name: 'Kickable', value: object.kickable, inline: true},
                    {name: 'Managable', value: object.manageable, inline: true},
                    {name: 'Partial Member', value: object.partial, inline: true},
                    {name: 'ID', value: object.id || 'Unknown', inline: true},
                    {name: 'Activity', value: object.presence.status || 'Unknown', inline: true},
                    {name: 'Bot', value: object.user.bot, inline: true},
                    {name: 'Last message at', value: object.lastMessage ? object.lastMessage.createdAt : 'Unknown', inline: true}
                )
                
                return msg.channel.send({embed, disableMentions: "all"})
            }
            else
            {
                let object = msg.guild.memberCount
                let bots = msg.guild.members.cache.filter(o => o.user.bot).array().length
                let embed = u.embed().setTitle(`There are \`${object}\` members in your server, \`${bots}\` of which are bots`)
                .addFields(
                    {name: 'Online', value: msg.guild.members.cache.filter(o => o.presence.status == 'online').array().length},
                    {name: 'Idle', value: msg.guild.members.cache.filter(o => o.presence.status == 'idle').array().length},
                    {name: 'Do Not Disturb', value: msg.guild.members.cache.filter(o => o.presence.status == 'dnd').array().length},
                    {name: 'Offline/Invis', value: msg.guild.members.cache.filter(o => o.presence.status == 'offline').array().length},
                )
                if(msg.guild.id == '765669316217143315' && msg.guild.members.cache.size - msg.guild.roles.cache.get('771907940470358046').members.size > 0)
                {
                    let unverifiedPpl = msg.guild.members.cache.filter(m => !m.roles.cache.has('771907940470358046')).map(r=>r).join(`\n`)
                    embed.addFields({name: `Unverified: ${msg.guild.members.cache.size - msg.guild.roles.cache.get('771907940470358046').members.size}`, value: `${unverifiedPpl}`})
                }
                if(!object) return msg.channel.send("While theoretically impossible, it appears that there aren't any members in your server...").then(u.clean)
                else return msg.channel.send({embed, disableMentions: "all"});
            }
        }
        else if(words == 'roles' || words == 'role')
        {
            if(keywords)
            {
                let object = msg.guild.roles.cache.find(r => r.name.toLowerCase() == keywords.toLowerCase() || r.id == keywords)
                if(keywords.toLowerCase() == 'everyone' || keywords.toLowerCase() == 'here') object = msg.guild.roles.everyone
                if(!object) return msg.channel.send("Couldn't find that role.")
                let hasRole = object.members.map(r => r).join(`\n`)
                if(!hasRole) hasRole = 'Nobody'
                let embed = u.embed().setTitle(object.name)
                    .setColor(object.hexColor)
                    .addFields(
                        {name: 'ID', value: object.id || 'Unknown', inline: true},
                        {name: 'Created at', value: object.createdAt || 'Unknown', inline: true},
                        {name: 'Deletable', value: object.deletable, inline: true},
                        {name: 'Editable', value: object.editable, inline: true},
                        {name: 'Hoisted', value: object.hoist, inline: true},
                        {name: 'Mentionable', value: object.mentionable, inline: true},
                        {name: 'Who has it', value: hasRole || 'Nobody', inline: true},
                        {name: 'Position', value: object.position || 'Unknown', inline: true},
                        {name: 'Color', value: object.hexColor || 'None', inline: true},
                    )
                return msg.channel.send({embed, disableMentions: "all"})
                
            }
            else
            {
                let object = msg.guild.roles.cache.map(r => r).join("\n");
                let embed = u.embed().setTitle(`There are \`${msg.guild.roles.cache.array().length}\` roles in your server.`).setDescription(object)
                if(!object) return msg.channel.send("Looks like you don't have any roles.")
                else return msg.channel.send({embed, disableMentions: "all"})
            }
            
        }
        else if(words == 'emojis' || words == 'emoji' || words == 'emotes' || words == 'emote')
        {
            if(keywords)
            {
                let object = msg.guild.emojis.cache.find(e => `<:${e.name}:${e.id}>` == keywords.replace(' ', '') || e.name.toLowerCase().replace(/~ /g, '') == keywords.toLowerCase().replace(/~ /g, '') || e.id == keywords) || msg.client.emojis.cache.find(e => `<:${e.name}:${e.id}>` == keywords.replace(' ', ''))
                if(!object) return msg.channel.send("Couldn't find that emoji.")
                let embed = u.embed()
                    .addFields(
                        {name: 'Name', value: object.name || 'Unknown', inline: true},
                        {name: 'ID', value: object.id || 'Unknown', inline: true},
                        {name: 'Guild', value: object.guild.name || 'Unknown', inline: true},
                        {name: 'Created by', value: object.author || 'Unknown', inline: true},
                        {name: 'Animated', value: object.animated, inline: true},
                        {name: 'Available', value: object.available, inline: true},
                        {name: 'Deletable', value: object.deletable, inline: true},
                        {name: 'Created at', value: object.createdAt || 'Unknown', inline: true},
                        {name: 'Exclusive to roles', value: object.roles.cache.map(r => r.name).join(`\n`) || 'None', inline: true},
                    )
                if(object.url) embed.setImage(object.url)
                return msg.channel.send({embed, disableMentions: "all"})
            }
            else
            {
                let object = msg.guild.emojis.cache.map(e => e).join("  ");
                let embed = u.embed().setTitle(`There are \`${msg.guild.emojis.cache.array().length}\` emojis in your server.`).setDescription(object)
                if(!object) return msg.channel.send("Looks like your server doesn't have any emojis.")
                else return msg.channel.send({embed, disableMentions: "all"})
            }
        }
        else if(words == 'channels' || words == 'channel')
        {
            if(keywords)
            {
                let object = msg.guild.channels.cache.filter(b => b.type != 'category').find(c => c.name.toLowerCase() == keywords.toLowerCase() || c.id == keywords)
                if(!object) return msg.channel.send("I couldn't find that channel.")
                let embed = u.embed().setTitle(`#${object.name}`)
                    .addFields(
                        {name: 'ID', value: object.id, inline: true},
                        {name: 'Category', value: object.parent || 'None', inline: true},
                        {name: 'Created at', value: object.createdAt || 'Unknown', inline: true},
                        {name: 'Deletable', value: object.deletable, inline: true},
                        {name: 'Manageable', value: object.manageable, inline: true},
                        {name: 'Viewable', value: object.viewable, inline: true},
                    )
                    if(object.type == 'voice')
                    {
                        embed.addFields(
                            {name: 'Bitrate', value: object.bitrate || 'Unknown', inline: true},
                            {name: 'Editable', value: object.editable, inline: true},
                            {name: 'Joinable', value: object.joinable, inline: true},
                            {name: 'User Limit', value: object.userLimit || 'None', inline: true},
                            {name: 'Speakable', value: object.speakable, inline: true},
                            {name: 'Type', value: 'voice', inline: true},
                            {name: 'Members in the VC', value: object.members.map(m => m).join('\n') || 'None', inline: true},
                        )
                    }
                    else if(object.type == 'text')
                    {
                        embed.addFields(
                            {name: 'Description' || 'Unknown', value: object.topic, inline: true},
                            {name: 'Last pin at', value: object.lastPinAt || 'N/A', inline: true},
                            {name: 'Last message at', value: object.lastMessage ? object.lastMessage.createdAt : 'Unknown', inline: true},
                            {name: 'NSFW', value: object.nsfw ? 'true' : 'false' , inline: true},
                            {name: 'Slowmode', value: object.rateLimitPerUser || 'None', inline: true},
                            {name: 'Type', value: 'text', inline: true}
                    )}
                    else
                    {
                        embed.addFields(
                            {name: 'Last message at', value: object.lastMessage.createdAt || 'Unknown', inline: true},
                            {name: 'Lat pin at', value: object.lastPinAt || 'N/A', inline: true},
                        )
                    }
                return msg.channel.send({embed, disableMentions: "all"})

            }
            else
            {
                let object = msg.guild.channels.cache.filter(b => b.type != 'category').filter(b => b.type != 'voice').map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join(`\n`)
                let vc = msg.guild.channels.cache.filter(b => b.type == 'voice').map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join(`\n`)
                if(!vc) vc = ' '
                let embed = u.embed().setTitle(`There are \`${msg.guild.channels.cache.filter(b=> b.type !='category').array().length}\` channels in your server.`).setDescription(`${object} \n${vc}`)
                if(!object) return msg.channel.send("no channels found")
                else return msg.channel.send({embed, disableMentions: 'all'})
            }
        }
        else if(words == 'categories'||words == 'category')
        {
            if(keywords)
            {
                let object = msg.guild.channels.cache.filter(b => b.type == 'category').find(c => c.name.toLowerCase() == keywords.toLowerCase() || c.id == keywords)
                if(!object) return msg.channel.send("I couldn't find that category.")
                let textChildren = object.children.filter(b => b.type != 'voice').map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join('\n')
                let voiceChildren = object.children.filter(b => b.type == 'voice').map(c => c).sort((a, d) => a.rawPosition - d.rawPosition).join('\n')
                let embed = u.embed().setTitle(`${object.name}`)
                .addFields(
                    {name: 'ID', value: object.id, inline: true},
                    {name: 'Created at', value: object.createdAt || 'Unknown', inline: true},
                    {name: 'Deletable', value: object.deletable, inline: true},
                    {name: 'Manageable', value: object.manageable, inline: true},
                    {name: 'Permissions', value: object.permissionOverwrites.map(p => p.type).join(`\n`) ||'None', inline: true},
                    {name: 'Viewable', value: object.viewable, inline: true},
                    {name: 'Children', value: `**Text:** \n${textChildren} \n\n**Voice:**\n ${voiceChildren}` || 'None', inline: true},
                )
                return msg.channel.send({embed, disableMentions: 'all'})
            }
            else
            {
                let object = msg.guild.channels.cache.filter(b => b.type == 'category').sort((a, d) => d.rawPosition - a.rawPosition).map(c => c.name).reverse().join(`\n`)
                let embed = u.embed().setTitle(`There are \`${msg.guild.channels.cache.filter(b =>b.type == 'category').array().length}\` categories in your server`).setDescription(`\`\`\`${object}\`\`\``)
                if(!object) return msg.channel.send("Looks like you don't have any categories.")
                else return msg.channel.send({embed, disableMentions: 'all'})
            }
        }
        else if(words == 'bans' || words == 'ban' || words == 'banned')
        {
            if(keywords)
            {
                let get = await msg.guild.fetchBans()
                let object = get.find(b => b.user.username.toLowerCase() == keywords || b.user.id == keywords || b.user.tag.toLowerCase() == keywords.toLowerCase())
                if(!object) return msg.channel.send("I couldn't find that user.")
                let embed = u.embed().setTitle(object.user.username)
                .addFields(
                    {name: 'ID', value: object.user.id || 'Unknown', inline: true},
                    {name: 'Created at', value: object.user.createdAt , inline: true},
                    {name: 'Activity', value: object.user.presence.status , inline: true},
                    {name: 'Bot', value: object.user.bot, inline: true},
                    {name: 'Partial user', value: object.user.partial , inline: true},
                    {name: 'Ban reason', value: object.reason ? object.reason : 'None given', inline: true}
                ).setThumbnail(object.user.displayAvatarURL({size: 64}))
                msg.channel.send({embed, disableMentions: 'all'})
            }
            else
            {
                msg.guild.fetchBans().then(banned =>
                    {
                        let object = banned.map(u => u.user).join('\n');
                        let embed = u.embed().setTitle(`There ${banned.array().length == 1 ? 'is' : 'are'} \`${banned.array().length}\` banned user${banned.array().length == 1 ? '' : 's'} in your server`).setDescription(object)
                        return msg.channel.send(embed)
                    })
            }
        }
        else if(words == 'guild' || words == 'server')
        {
            let object = msg.guild
            if(keywords && msg.author.id == '337713155801350146') object = msg.client.guilds.cache.find(g => g.name.toLowerCase().startsWith(keywords) || g.id == keywords) || msg.guild
            let embed = u.embed().setTitle(object.name)
                .addFields(
                    {name: 'Owner', value: object.owner.displayName || 'Unknown' , inline: true},
                    {name: 'Description', value: object.description || 'None' , inline: true},
                    {name: 'Name Acronym', value: object.nameAcronym , inline: true},
                    
                    {name: 'Created at', value: object.createdAt || 'Unknown' , inline: true}, 
                    {name: 'ID', value: object.id || 'Unknown' , inline: true},
                    {name: 'Region', value: object.region.toUpperCase() , inline: true},
                    
                    {name: 'Members', value: object.memberCount , inline: true},
                    {name: 'Online', value: object.presences.cache.filter(o => o.status == 'online').array().length , inline: true},
                    {name: 'Large', value: object.large , inline: true},

                    {name: 'Content Filter', value: object.explicitContentFilter , inline: true},
                    {name: '2FA Level', value: object.mfaLevel , inline: true},
                    {name: 'Verification Level', value: object.verificationLevel , inline: true},

                    {name: 'Partnered', value: object.partnered , inline: true},
                    {name: 'Boost Count', value: object.premiumSubscriptionCount , inline: true},
                    {name: 'Boost Tier', value: object.premiumTier , inline: true},
                    
                    {name: 'Verified', value: object.verified , inline: true},
                    {name: 'Default Pings', value: object.defaultMessageNotifications == 0 ? 'All messages' : 'Mentions' , inline: true},
                    {name: 'Vanity URL Code', value: object.vanityURLCode || 'None' , inline: true},
                    
                    
                    {name: 'AFK timeout', value: `${(object.afkTimeout)/60} minute${(object.afkTimeout)/60 == 1 ? '' : 's'}` , inline: true},
                    {name: 'AFK channel', value: object.afkChannel? object.afkChannel.name : 'None' , inline: true},
                    {name: 'Rules Channel', value: object.rulesChannel ? object.rulesChannel : 'None' , inline: true},
                    
                    {name: 'System Channel', value: object.systemChannel?object.systemChannel:'None' , inline: true},
                    {name: 'Public Updates Channel', value: object.publicUpdatesChannel?object.publicUpdatesChannel:'None' , inline: true},
                    {name: 'Widget Channel', value: object.widgetChannel?object.widgetChannel:'None' , inline: true},
                ).setThumbnail(object.iconURL({size: 128}))
                if(object.discoverySplashURL) embed.setImage(object.discoverySplashURL())
                return msg.channel.send({embed, disableMentions: 'all'})
        }
        else return msg.channel.send("That's not a valid get command. Try specifying member, role, emoji, channel, category, ban, or guild.").then(u.clean)
    }
})

module.exports = Module