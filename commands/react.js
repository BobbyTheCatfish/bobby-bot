const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors')

const Module = new Augur.Module();

Module.addEvent('message', async (msg) =>{
    let parsed = await u.parse(msg)
    if(parsed && msg.guild){
        let read = (await Module.db.tags.getTag(msg.guild.id, parsed.command.toLowerCase()))
        if(await Module.db.tags.globalStatus(msg.guild.id)) read = await Module.db.globalTags.getTag(parsed.command)
        if(read){
            if(msg.client.commands.has(read.name) && await Module.db.tags.globalStatus(msg.guild.id)) await Module.db.globalTags.removeTag(read.name)
            else{
                let replaceContent
                if(read.text){
                    let temp, match, regex = /\<([^)]+)\>/
                    if(match = regex.exec(read.text)){
                        temp = match[1].split('|')
                        if(temp[1]) replaceContent = read.text.replace(match[0], temp[Math.floor(Math.random() * temp.length)])
                    }
                    replaceContent = (replaceContent ? replaceContent : read.text).replace(/<@author>/ig, `<@${msg.author.id}>`).replace(/<@authorname>/ig, msg.member.displayName)
                    if ((/(<@target>)|(<@targetname>)/i).test(replaceContent)) {
                        if (msg.mentions.members.first()) replaceContent = replaceContent.replace(/<@target>/ig, `<@${target.id}>`).replace(/<@targetname>/ig, msg.mentions.members.first().displayName);
                        else return msg.reply("You need to `@mention` a user with that tag!").then(u.clean);
                    }
                }
                return msg.channel.send(replaceContent, {files: [read.file]})
            }
        }
    }
})

.addCommand({name: 'tag',
    guildOnly: true,
    otherPerms: (msg) =>  msg.member.hasPermission('ADMINISTRATOR') || msg.author.id == Module.config.ownerId,
    process: async(msg, args) =>{
        if(await Module.db.tags.globalStatus(msg.guild.id)){
            if(!args) return msg.channel.send("What tag do you want to create/modify?")
            if(msg.client.commands.has(args.split(' ')[0].toLowerCase())) return msg.channel.send(`You can't replace commands with global tags enabled`)
            let tag = await Module.db.globalTags.getTag(args.toLowerCase().split(' ')[0])
            if(!tag || tag.user == msg.author.id || (tag.guildId == msg.guild.id && msg.member.hasPermission('ADMINISTRATOR'))){
                if(!args.split(' ')[1] && msg.attachments.size == 0){
                    await Module.db.globalTags.removeTag(args.split(' ')[0].toLowerCase())
                    return await msg.react('🗑️')
                }
                else{
                    await Module.db.globalTags.saveTag(msg.guild.id, msg.author.id, args.split(' ')[0], args.split(' ').slice(1).join(' '), msg.attachments.size > 0 ? msg.attachments.first().url : null)
                    return await msg.react('👍')
                }
            }
            else return msg.channel.send("You don't have permission to modify that tag.")
        }
        else{
            if(!(msg.member.hasPermission('ADMINISTRATOR') || msg.author.id == Module.config.ownerId)) return
            if(!args) return msg.channel.send("What tag do you want to create/modify?")
            if(args.split(' ')[0].toLowerCase() == 'tag' || args.split(' ')[0].toLowerCase() == 'tags') return msg.channel.send("You can't replace the tag command.")
            if(!args.split(' ')[1] && msg.attachments.size == 0){
                if(await Module.db.tags.getTag(msg.guild.id, args)){
                    await Module.db.tags.removeTag(msg.guild.id, args.split(' ')[0])
                    return await msg.react('🗑️')
                }
                else return msg.channel.send("I can't remove a non-existant tag")
            }
            else{
                await Module.db.tags.saveTag(msg.guild.id, args.split(' ')[0], args.split(' ').slice(1).join(' ') , msg.attachments.size > 0 ? msg.attachments.first().url : null)
                return await msg.react('👍')
            }
        }
    }
})
.addCommand({name: 'tags',
    guildOnly: true,
    process: async(msg,args)=>{
        let tags = await Module.db.tags.getAllTags(msg.guild.id)
        if(args.toLowerCase() == 'global' && ((msg.member && msg.member.hasPermission('ADMINISTRATOR')|| msg.author.id == Module.config.ownerId))){
        let list = []
            if(!await Module.db.tags.globalStatus(msg.guild.id))
            {
                if(tags){
                    for (let t of tags.tags){
                        let tag = await Module.db.globalTags.getTag(t.name)
                        if(tag) list.push(t.name)
                    }}
                    let promptEmbed = u.embed().setTitle('Are you sure you want to go global?').setDescription(list.length > 0 ? `All but the following tags will be brought over: \n${list.join('\n')}`:`All of your tags will be brought over.`)
                    let confirmEmbed = u.embed().setTitle("You've gone global!").setDescription("You now have access to all the other global server's tags!")
                    let cancelEmbed = u.embed().setTitle("Canceled").setDescription("You didn't go global, and the tags weren't erased")
                    let decision = await u.confirmEmbed(msg,promptEmbed,confirmEmbed,cancelEmbed)
                    if(decision == true) return await Module.db.tags.setGlobal(msg.guild.id, msg.guild.owner.id)
                    else return                
            }
            else{
                let promptEmbed = u.embed().setTitle("Are you sure you want to disable global tags?")
                let confirmEmbed = u.embed().setTitle("Global tags disabled")
                let cancelEmbed = u.embed().setTitle("Canceled")
                let decision = await u.confirmEmbed(msg,promptEmbed,confirmEmbed,cancelEmbed)
                if(decision == true) return await Module.db.tags.setLocal(msg.guild.id)
                else return
            }
        }
        else if(await Module.db.tags.globalStatus){
            let gtags = await Module.db.globalTags.getAllTags()
            let map = gtags.map(t => t.name)
            msg.author.send(`The following are all the global tags:\n${map.join('\n')}`)
            return await msg.react('👌')
        }
        else if(!tags) return msg.channel.send('Looks like this server doesn\'t have any tags.')
        let list = tags.tags.map(t=>t.name)
        if(await Module.db.tags.globalStatus(msg.guild.id)) list.push()
        return msg.channel.send(list.join('\n'))
    }
})

module.exports = Module