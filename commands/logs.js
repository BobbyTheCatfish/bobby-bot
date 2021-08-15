const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Module = new Augur.Module()
    const flags = async(guild) => await u.decodeLogEvents(guild)
    //const flags = async(guild) => await Module.db.guildconfig.getLogFlags(guild.id)
    const logChannel = async (guild)=> Module.client.channels.cache.get(await Module.db.guildconfig.getLogChannel(guild.id))
    let cu = ['n','p','po','pl','po','ns','s','t','b']
    let gu = ['afkc','afkt','ba','dmn','d','ds','ecf','i','mfa','n','p','psc','pt','puc','r','rc','s','sc','vu','vl','v','wc','we']
    let gmu = ['n','r']
    let ru = ['c','h','pe','po']
    let low = '#0fe300', med = '#e3d000', high = '#ff0000' 
    Module.addEvent('channelCreate', async channel =>{
        if(channel.guild){
            let enabled = await flags(channel.guild)
            if(enabled?.includes('Channel Created')){
                let embed = u.embed().setTitle(`The channel \`#${channel.name}\` was created`).setColor(low);
                (await logChannel(channel.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('channelDelete', async channel =>{
        if(channel.guild){
            let enabled = await flags(channel.guild)
            if(enabled?.includes('Channel Deleted')){
                let embed = u.embed().setTitle(`The channel \`#${channel.name}\` was deleted`).setColor(high);
                (await logChannel(channel.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('channelUpdate', async (oldChannel, newChannel) =>{
        if(oldChannel.guild){
            let enabled = await flags(oldChannel.guild)
            if(enabled?.includes('Channel Updated')){
                let embed = u.embed().setTitle(`\`#${oldChannel.name}\` was updated`).setColor(med)
                if(oldChannel.name != newChannel.name) embed.addField(`Name`,`Old: ${oldChannel.name}\nNew: ${newChannel.name}`)
                if(oldChannel.parent != newChannel.parent) embed.addField(`Category`,`Old: ${oldChannel.category}\nNew: ${newChannel.category}`)
                if(oldChannel.permissionOverwrites != newChannel.permissionOverwrites) embed.addField(`Permission Overwrites`,`Coming Soon`)
                if(oldChannel.permissionsLocked != newChannel.permissionsLocked) embed.addField(`Permissions Synced`,`Old: ${oldChannel.permissionsLocked}\nNew: ${newChannel.permissionsLocked}`)
                if(oldChannel.position != newChannel.position) embed.addField(`Position`,`Old: ${oldChannel.position}\nNew: ${newChannel.position}`)
                if(oldChannel.type == 'text'){
                    if(oldChannel.nsfw != newChannel.nsfw) embed.addField(`NSFW`,`Old: ${oldChannel.nsfw}\nNew: ${newChannel.nsfw}`)
                    if(oldChannel.rateLimitPerPerson != newChannel.rateLimitPerPerson) embed.addField(`Slowmode`,`Old: ${oldChannel.rateLimitPerPerson}\nNew: ${newChannel.rateLimitPerPerson}`)
                    if(oldChannel.topic != newChannel.topic) embed.addField(`Topic`,`Old: ${oldChannel.topic}\nNew: ${newChannel.topic}`)
                }
                if(oldChannel.type == 'voice' && oldChannel.bitrate != newChannel.bitrate) embed.addField(`Bitrate`,`Old: ${oldChannel.bitrate}\nNew: ${newChannel.bitrate}`);
                if(embed.fields.length > 0) (await logChannel(oldChannel.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('channelPinsUpdate', async channel =>{
        if(channel.guild){
            let enabled = await flags(channel.guild)
            if(enabled?.includes('Message Pinned')){
                let embed = u.embed().setTitle(`A message was pinned (or unpinned) in \`#${channel.name}\``).setColor(low);
                (await logChannel(channel.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('emojiCreate', async emoji =>{
        if(emoji.guild){
            let enabled = await flags(emoji.guild)
            if(enabled?.includes('Emoji Created')){
                let embed = u.embed().setTitle(`The emoji \`:${emoji.name}:\` was created`).setImage(emoji.url).setColor(low);
                (await logChannel(emoji.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('emojiDelete', async emoji =>{
        if(emoji.guild){
            let enabled = await flags(emoji.guild)
            if(enabled?.includes(('Emoji Deleted'))){
                let embed = u.embed().setTitle(`The emoji \`:${emoji.name}:\` was deleted`).setImage(emoji.url).setColor(high);
                (await logChannel(emoji.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('emojiUpdate', async (oldEmoji, newEmoji)=>{
        if(oldEmoji.guild){
            let enabled = await flags(oldEmoji.guild)
            if(enabled?.includes('Emoji Updated')){
                let embed = u.embed().setTitle(`The emoji \`:${oldEmoji.name}:\` was updated`).setColor(med)
                if(oldEmoji.name != newEmoji.name) embed.addField(`Name`,`Was: ${oldEmoji.name}\nIs: ${newEmoji.name}`);
                (await logChannel(oldEmoji.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('guildBanAdd', async (guild, user)=>{
        let enabled = await flags(guild)
        if(enabled?.includes('Member Banned')){
            let embed = u.embed().setTitle(`\`${user.name}\` was banned`).setColor(high);
            (await logChannel(guild)).send({embeds: [embed]})
        }
    })
    .addEvent('guidBanRemove', async (guild, user)=>{
        let enabled = await flags(guild)
        if(enabled?.includes('Member Unbanned')){
            let embed = u.embed().setTitle(`\`${user.name}\` was unbanned`).setColor(high);
            (await logChannel(guild)).send({embeds: [embed]})
        }
    })
    .addEvent('guildIntegrationUpdate', async guild =>{
        let enabled = await flags(guild)
        if(enabled?.includes('Integrations Updated')){
            let embed = u.embed().setTitle('An integration was updated').setDescription("Unfortunately, I don't have a way to check what was modified").setColor(med);
            (await logChannel(guild)).send({embeds: [embed]})
        }
    })
    .addEvent('guildMemberAdd', async member =>{
        let enabled = await flags(member.guild)
        if(enabled?.includes('Member Joined')){
            let embed = u.embed().setTitle(`\`${member.displayName}\` joined the server`).setColor(low);
            (await logChannel(member.guild)).send({embeds: [embed]})
        }
    })
    .addEvent('guildMemberRemove', async member =>{
        let enabled = await flags(member.guild)
        if(enabled?.includes('Member Left')){
            let embed = u.embed().setTitle(`\`${member.displayName}\` left the server`).setColor(med);
            (await logChannel(member.guild)).send({embeds: [embed]})
        }
    })
    .addEvent('guildMemberUpdate', async(oldMember, newMember)=>{
        let enabled = await flags(oldMember.guild)
        if(enabled?.includes('Member Updated')){
            let embed = u.embed().setTitle(`\`${oldMember.user.tag}\` was updated`).setColor(med)
            if(oldMember.nickname != newMember.nickname) embed.addField(`Nickname`,`Was: ${oldMember.nickname ? oldMember.nickname : 'None'}\nIs: ${newMember.nickname?newMember.nickname:'None'}`).setColor(med)
            if(oldMember.roles.cache != newMember.roles.cache){
                let removed = oldMember.roles.cache.filter(r=> !newMember.roles.cache.array().includes(r) && r.name != 'Heckerman').map(r => `<@&${r.id}>`)
                let added = newMember.roles.cache.filter(r => !oldMember.roles.cache.array().includes(r) && r.name != 'Heckerman').map(r => `<@&${r.id}>`)
                if(added.length > 0) embed.addField(`Roles Added`,`${added.join('\n')}`)
                if(removed.length > 0) embed.addField(`Roles Removed`, `${removed.join('\n')}`)
            }
            if(embed.fields.length > 0)( await logChannel(oldMember.guild)).send({embed, disableMentions: 'all'})
        }
    })
    .addEvent('guildUpdate', async (oldGuild, newGuild)=>{
        let enabled = await flags(oldGuild)
        if(enabled?.includes('Server Updated')){
            let embed = u.embed().setTitle(`The server was modified`).setColor(high)
            if(oldGuild.afkChannelID != newGuild.afkChannelID) embed.addField(`AFK Channel`,`Was: ${oldGuild.afkChannel ? oldGuild.afkChannel: 'None'}\nIs: ${newGuild.afkChannel ? newGuild.afkChannel : 'None'}`)
            if(oldGuild.afkTimeout != newGuild.afkTimeout) embed.addField(`AFK Timeout`,`Was: ${oldGuild.afkTimeout}\nIs: ${newGuild.afkTimeout}`)
            if(oldGuild.banner != newGuild.banner) embed.addField(`Banner`,`No information`)
            if(oldGuild.defaultMessageNotifications != newGuild.defaultMessageNotifications) embed.addField(`Default Notifications`,`Was: ${oldGuild.defaultMessageNotifications}\nIs:${newGuild.defaultMessageNotifications}`)
            if(oldGuild.description != newGuild.description) embed.addField(`Description`,`Was: ${oldGuild.description ? oldGuild.description : 'None'}\nIs: ${newGuild.description ? newGuild.description : 'None'}`)
            if(oldGuild.discoverySplash != newGuild.discoverySplash) embed.addField(`Discovery Splash`,`No information`)
            if(oldGuild.explicitContentFilter != newGuild.explicitContentFilter) embed.addField(`Explicit Content Filter`,`Was: ${oldGuild.explicitContentFilter}\nIs: ${newGuild.explicitContentFilter}`)
            if(oldGuild.icon != newGuild.icon) embed.addField(`Icon`,`No information`)
            if(oldGuild.mfaLevel != newGuild.mfaLevel) embed.addField(`MFA Level`,`Was: ${oldGuild.mfaLevel}\nIs: ${newGuild.mfaLevel}`)
            if(oldGuild.name != newGuild.name) embed.addField(`Name`,`Was: ${oldGuild.name}\nIs: ${newGuild.name}`)
            if(oldGuild.partnered != newGuild.partnered) embed.addField(`Partnered`,`Was: ${oldGuild.partnered}\nIs: ${newGuild.partnered}`)
            if(oldGuild.preferredLocale != newGuild.preferredLocale) embed.addField(`Preferred Locale`,`Was: ${oldGuild.preferredLocale}\nIs: ${newGuild.preferredLocale}`)
            if(oldGuild.premiumSubsciptionCount != newGuild.premiumSubsciptionCount) embed.addField(`Boosts`,`Was: ${oldGuild.premiumSubsciptionCount}\nIs: ${newGuild.premiumSubsciptionCount}`)
            if(oldGuild.premiumTier != newGuild.premiumTier) embed.addField(`Premium Tier`,`Was: ${oldGuild.premiumTier}\nIs: ${newGuild.premiumTier}`)
            if(oldGuild.publicUpdatesChannelID != newGuild.publicUpdatesChannelID) embed.addField(`Public Updates Channel`,`Was: ${oldGuild.publicUpdatesChannel}\nIs: ${newGuild.publicUpdatesChannel}`)
            if(oldGuild.region != newGuild.region) embed.addField(`Region`,`Was: ${oldGuild.region}\nIs: ${newGuild.region}`)
            if(oldGuild.rulesChannelID != newGuild.rulesChannelID) embed.addField(`Rules Channel`,`Was: ${oldGuild.rulesChannel}\nIs: ${newGuild.rulesChannel}`)
            if(oldGuild.splash != newGuild.splash) embed.addField(`Splash Image`,`No information`)
            if(oldGuild.systemChannelID != newGuild.systemChannelID) embed.addField(`System Channel`,`Was: ${oldGuild.systemChannel}\nIs: ${newGuild.systemChannel}`)
            if(oldGuild.vanityURLCode != newGuild.vanityURLCode) embed.addField(`Vanity URL`,`Was: ${oldGuild.vanityURLCode ? oldGuild.vanityURLCode : 'None'}\nIs: ${newGuild.vanityURLCode ? newGuild.vanityURLCode : 'None'}`)
            if(oldGuild.verificationLevel != newGuild.verificationLevel) embed.addField(`Verification Level`,`Was: ${oldGuild.verificationLevel}\nIs: ${newGuild.verificationLevel}`)
            if(oldGuild.verified != newGuild.verified) embed.addField(`Verified`,`Was: ${oldGuild.verified}\nIs: ${newGuild.verified}`)
            if(oldGuild.widgetChannelID != newGuild.widgetChannelID) embed.addField(`Widget Channel`,`Was: ${oldGuild.widgetChannel}\nIs: ${newGuild.widgetChannel}`)
            if(oldGuild.widgetEnabled != newGuild.widgetEnabled) embed.addField(`Widget Enabled`,`Was: ${oldGuild.widgetEnabled}\nIs: ${newGuild.widgetEnabled}`)
            if(embed.fields.length > 0) (await logChannel(oldGuild)).send({embeds: [embed]})
        }
    })
    .addEvent('inviteCreate', async invite =>{
        if(invite.guild){
            let enabled = await flags(invite.guild)
            if(enabled?.includes('Invite Created')){
                let embed = u.embed().setTitle(`An invite was created: \`${invite}\``).setColor(low).addField('Created by', invite.inviter.tag)
                if(invite.temporary){
                    if(invite.maxUses > 0) embed.addField('Max Uses',invite.maxUses)
                    if(invite.maxAge > 0) embed.addField('Expires',invite.expiresAt)
                }
                if(invite.targetUser) embed.addField('Target User', invite.targetUser.tag)

                (await logChannel(invite.guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('inviteDelete', async invite =>{
        if(invite.guild){
            if(invite.expiresAt > new Date())
            {let enabled = await flags(invite.guild)
            if(enabled?.includes('Invite Deleted')){
                let embed = u.embed().setTitle(`An invite was deleted: \`${invite}\``).setColor(med);
                (await logChannel(invite.guild)).send({embeds: [embed]})
            }}
        }
    })
    .addEvent('messageDeleteBulk', async messages =>{
        if(messages.first().guild){
            let enabled = await flags(messages.first().guild)
            if(enabled?.includes('Messages Bulk Deleted')){
                let embed = u.embed().setTitle(`Messages were bulk deleted in \`#${messages.first().channel.name}\``).setColor(med);
                (await logChannel(messages.first().guild)).send({embeds: [embed]})
            }
        }
    })
    .addEvent('roleCreate', async role =>{
        let enabled = await flags(role.guild)
        if(enabled?.includes('Role Created') && role.name != 'Heckerman'){
            let embed = u.embed().setTitle(`The \`${role.name}\` role was created`).setDescription(`${role}`).setColor(low);
            (await logChannel(role.guild)).send({embeds: [embed]})
        }
    })
    .addEvent('roleDelete', async role =>{
        let enabled = await flags(role.guild)
        if(enabled?.includes('Role Deleted')){
            let embed = u.embed().setTitle(`The \`${role.name}\` role was deleted`).setColor(high);
            (await logChannel(role.guild)).send({embeds: [embed]})
        }
    })
    .addEvent('roleUpdate', async (oldRole, newRole)=>{
        let enabled = await flags(oldRole.guild)
        if(enabled?.includes('Role Updated') && oldRole.name != 'Heckerman'){
            let embed = u.embed().setTitle(`The \`${oldRole.name}\` role was modified`).setColor(med)
            if(oldRole.hexColor != newRole.hexColor) embed.addField(`Color`,`Was: ${oldRole.hexColor}\nIs: ${newRole.hexColor}`).setColor(newRole.hexColor)
            if(oldRole.hoist != newRole.hoist) embed.addField(`Hoist`, `Was: ${oldRole.hoist}\nIs: ${newRole.hoist}`)
            if(oldRole.permissions != newRole.permissions)embed.addField(`Permissions`, `No information`)
            if(oldRole.position != newRole.position) embed.addField(`Position`, `Was: ${oldRole.position}\nIs: ${newRole.position}`);
            if(embed.fields.length > 0) (await logChannel(oldRole.guild)).send({embeds: [embed]})
        }
    })
    .addEvent('rateLimit', async (rateLimitInfo)=>{console.log(rateLimitInfo)})
module.exports = Module