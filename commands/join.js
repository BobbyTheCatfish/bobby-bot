const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Module = new Augur.Module()

//Join message
Module.addEvent('guildMemberAdd', async member => {
    try {
        let preferences = await Module.db.welcome.getWelcome(member.guild.id)
        if(!preferences || preferences.enabled == false) return
        let general = preferences.channel
        let ruleChannel = preferences.ruleChannel
        let welcomeEmoji = preferences.emoji
        let joinRole = preferences.roles
        let custom = preferences.custom
        var r = (parts) => parts[Math.floor(Math.random() * parts.length)];
        let welcome = [
            "Welcome",
            "Hi there",
            "Glad to have you here",
            "Ahoy",
            "Howdy",
            "Sup",
            "Salutations",
            "Greetings",
            "Hi",
            "Bonjour",
            "Buenos dias",
            "Hey",
            "Howdy-do",
            "What's up",
            "Aloha",
        ];
        let info1 = [
            "Take a look at",
            "Check out",
            "Head on over to",
        ];
        let info2 = [
            "to get started.",
            "for some basic community rules.",
            "and join in on the fun!"
        ];
        let welcomeString = `${r(welcome)}, ${member}! ${welcomeEmoji ? `${welcomeEmoji} ` : ''} ${ruleChannel ? `${r(info1)} <#${ruleChannel}> ${r(info2)}`:''}`
        if(custom) welcomeString = `${custom.replace(/<@member>/gi, member)}`
        for(r of joinRole){
            try{
                await member.roles.add(member.guild.roles.cache.get(r))
            }
            catch{
                general.send(`I couldn't add the role ${joinRole} to ${member}! Please reconfigure the welcome procedure with !welcome.`)
            }
            
        }
        return member.guild.channels.cache.get(general).send(welcomeString)
    } catch (error) {
        u.errorHandler(member, error)
    }
})
.addCommand({name: 'welcome',
    onlyGuild: true,
    memberPermissions: ['MANAGE_GUILD'],
    process: async (msg, suffix) =>{
        let welcome = {channel: null, role: null, emoji: null, ruleChannel: null}
        let channelFilter = m => (m.content.startsWith('<#') && m.content.endsWith('>') || m.content.toLowerCase() == 'none') && m.author == msg.author
        let contentFilter = m => m.content && m.author == msg.author
        let time = 5000 * 60
        let rolesArray = []
        let customOrRandom = async(msg, welcome)=>{
            let promptEmbed = u.embed().setTitle("Do you want a custom message or a randomized one?").setDescription("Randomized messages can include a rules channel and emoji")
            msg.channel.send({embeds: [promptEmbed]}).then(async m=>{
                let choices = ['🔀','🇨']
                let reactionFilter = (reaction, user) => choices.includes(reaction.emoji.name) && user.id == msg.author.id
                for(x of choices) await m.react(x)
                await m.awaitReactions({filter: reactionFilter, max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let reaction = collected.first().emoji.name
                    let custom = false
                    if(reaction == choices[1]) custom = true 
                    await welcomeChannel(msg, welcome, custom)
                })
            })
        }
        let welcomeChannel = async(msg, welcome, custom = false)=>{
            let promptEmbed = u.embed().setTitle('What channel should I send it in?').setDescription('Type it in the format of #channel-name\nType `none` to disable welcome messages')
            msg.channel.send({embeds: [promptEmbed]}).then( async m=>{
                await m.channel.awaitMessages({filter: channelFilter, max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'none') Module.db.welcome.disableWelcome(msg.guild.id)
                    else if(!msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))){
                        msg.channel.send("I couldn't find that channel. Please try again")
                        await welcomeChannel(msg, welcome)
                    }else{
                        if(custom) await customMessage(msg, content.replace(/[^0-9]/g, ''))
                        else{
                            newWelcome = {channel: content.replace(/[^0-9]/g, ''), role: null, emoji: null, ruleChannel: null}
                            await role(msg, newWelcome)
                        }
                    }
                })
            })
        }
        let customMessage = async(msg, channel)=>{
            let promptEmbed = u.embed().setTitle("What do you want the message to say?").setDescription("Type `<@member>` in place of mentioning the new member")
            msg.channel.send({embeds: [promptEmbed]}).then(async m=>{
                await m.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']})
                .then(async collected =>{
                    await role(msg, collected.first().content, channel)
                })
            })
        }
        let role = async(msg, welcome, custom = false)=>{
            let promptEmbed = u.embed().setTitle("What roles should I add?").setDescription(`Type \`done\` to stop adding roles. You can add up to 5. (${5-rolesArray.length} left)`)
            msg.channel.send({embeds: [promptEmbed]}).then(async m=>[
                await m.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    let fetchRole = await msg.guild.roles.cache.find(r => r.id == content || r.name.toLowerCase() == content.toLowerCase())
                    if(content.toLowerCase() == 'done'){
                        if(custom){
                            let newWelcome = {channel: custom, role: rolesArray, welcome}
                            await finished(msg, newWelcome, true)
                        }
                        else{
                            let newWelcome = {channel: welcome.channel, role: rolesArray, emoji: null, ruleChannel: null}
                            await emoji(msg, newWelcome)
                        }
                    }
                    else if(!fetchRole){
                        msg.channel.send("I couldn't find that role! Please try again.")
                        await role(msg, welcome)
                    }
                    else if(rolesArray.length == 4){
                        rolesArray.push(fetchRole.id)
                        if(custom){
                            let newWelcome = {channel: custom, role: rolesArray, welcome}
                            await finished(msg, newWelcome, true)
                        }
                        else{
                            let newWelcome = {channel: welcome.channel, role: rolesArray, emoji: null, ruleChannel: null}
                            await emoji(msg, newWelcome)
                        }
                        
                    }
                    else{
                        rolesArray.push(fetchRole.id)
                        await role(msg, welcome, custom)
                    }
                })
            ])
        }

        let emoji = async(msg, welcome)=>{
            let promptEmbed = u.embed().setTitle('What emoji should I use?').setDescription('Type `none` for none')
            msg.channel.send({embeds: [promptEmbed]}).then(async m =>{
                await m.channel.awaitMessages({filter: contentFilter, max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content.toLowerCase() == 'none'){
                        let newWelcome = {channel: welcome.channel, role: rolesArray, emoji: null, ruleChannel: null}
                        await rules(msg, newWelcome)
                    }
                    let newWelcome
                    let emoji = msg.guild.emojis.cache.find(e => `<:${e.name.toLowerCase()}:${e.id}>` == content.toLowerCase())
                    if(!emoji) newWelcome ={channel: welcome.channel, role: welcome.role, emoji: content, ruleChannel: null} 
                    else newWelcome = {channel: welcome.channel, role: welcome.role, emoji: `<:${emoji.name}:${emoji.id}>`, ruleChannel: null}
                    await rules(msg, newWelcome)
                    })
                })
            }

        let rules = async(msg, welcome)=>{
            if(msg.guild.rulesChannel){
                msg.channel.send("Looks like you have a rules channel set up, so we can skip this step")
                let newWelcome = {channel: welcome.channel, role: welcome.role, emoji: welcome.emoji, ruleChannel: msg.guild.ruleChannel}
                finished(msg, newWelcome)
            }
            let promptEmbed = u.embed().setTitle("What is the rule channel?").setDescription("Type `none` for none")
            msg.channel.send({embeds: [promptEmbed]}).then(async m=>{
                await m.channel.awaitMessages({filter: channelFilter, max: 1, time, errors: ['time']})
                .then(async collected=>{
                    let content = collected.first().content
                    let channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''))
                    if(content.toLowerCase() == 'none'){
                        await finished(msg, welcome)
                    }
                    else if(!channel){
                        msg.channel.send("I can't find that channel! Please try again.")
                        await rules(msg, welcome)
                    }
                    else{
                        let newWelcome = {channel: welcome.channel, role: welcome.role, emoji: welcome.emoji, ruleChannel: content.replace(/[^0-9]/g, '')}
                        await finished(msg, newWelcome)
                    }
                })  
            })
        }
        let finished = async(msg, welcome, custom = false)=>{
            if(custom){
                let welcomeString = welcome.welcome
                let welcomeRoleArray = []
                for(x of welcome.role){
                    welcomeRoleArray.push(`<@&${x}>`)
                }
                let finalEmbed = u.embed().setTitle(`The following will be sent in #${msg.guild.channels.cache.get(welcome.channel).name} every time someone joins`).setDescription(`${welcomeString.replace(/<@member>/gi, msg.member)}${welcomeRoleArray.size > 0? `\n\n**The following roles will be assigned:**\n${welcomeRoleArray.join('\n')}`:''}`)
                msg.channel.send({embeds: [finalEmbed]})
                if(Module.db.welcome.saveWelcome(msg.guild.id, welcome.channel, welcome.role, null, null, welcome.welcome) == null) return msg.channel.send("I ran into an error while saving.").then(u.errorHandler(msg, 'welcome saving'))
            }
            else{
                let welcomeString = `Welcome, ${msg.author}! ${welcome.emoji ? welcome.emoji+' ' : ''}${welcome.ruleChannel ? `Check out <#${welcome.ruleChannel}> to get started!` : ''}`
                let welcomeRoleArray = []
                for(x of welcome.role){
                    welcomeRoleArray.push(`<@&${x}>`)
                }
                let finalEmbed = u.embed().setTitle(`The following will be sent in #${msg.guild.channels.cache.get(welcome.channel).name} every time someone joins`).setDescription(`${welcomeString}${welcomeRoleArray.size > 0?`\n\n**The following roles will be assigned:**\n ${welcomeRoleArray.join('\n')}`: ''}`)     
                msg.channel.send({embeds: [finalEmbed]})   
                if(Module.db.welcome.saveWelcome(msg.guild.id, welcome.channel, welcome.role, welcome.emoji, welcome.ruleChannel, null) == null) return msg.channel.send("I ran into an error while saving.").then(u.errorHandler(msg ,'welcome saving'))
            }
        }
        await customOrRandom(msg, welcome)
    }
})

module.exports = Module