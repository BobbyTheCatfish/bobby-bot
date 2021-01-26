const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    mongoose = require('mongoose')

const Module = new Augur.Module();

Module.addEvent('message', async (message) =>{
    let parsed = await u.parse(message)
    if(parsed && message.guild){
        let read = (await Module.db.tags.getTag(message.guild.id, parsed.command))
        if(await Module.db.tags.globalStatus(message.guild.id)) read = await Module.db.globalTags.getTag(parsed.command)
        if(read){
            if(message.client.commands.has(read.name) && await Module.db.tags.globalStatus(message.guild.id)){
                await Module.db.globalTags.removeTag(message.guild.id, read.name)
            }
            else{
                let replaceContent
                if(read.text){
                    replaceContent = read.text.replace(/<@author>/ig, message.author).replace(/<@authorname>/ig, message.member.displayName)
                    if ((/(<@target>)|(<@targetname>)/i).test(replaceContent)) {
    
                        if (message.mentions.members.size > 0) {
                            let target = message.mentions.members.first()
                            replaceContent = replaceContent.replace(/<@target>/ig, target.toString()).replace(/<@targetname>/ig, target.displayName);
                        }
                        else return message.reply("You need to `@mention` a user with that tag!").then(u.clean);
                    }
                    let temp, match
                    let regex = /\<([^)]+)\>/
                    if(match = regex.exec(replaceContent)){
                        temp = match[1]
                        if(temp.split('|')[1]){
                            let parts = []
                            for (y of temp.split('|')) parts.push(y)
                            replaceContent = replaceContent.replace(match[0], parts[Math.floor(Math.random() * parts.length)])
                        }
                    }
                }
                if(read.text && read.file) return message.channel.send(replaceContent, {files: [read.file]})
                if(read.text) return message.channel.send(replaceContent)
                if(read.file) return message.channel.send({files: [read.file]})
            }
        }
    }
    
})
.addCommand({name: 'tag',
    otherPerms: (msg) =>  msg.guild && (msg.member.hasPermission('ADMINISTRATOR') || msg.author.id == Module.config.ownerId),
    process: async(message, args) =>{
        if(await Module.db.tags.globalStatus(message.guild.id)){
            if(!args) return message.channel.send("What tag do you want to create/modify?")
            if(message.client.commands.has(args.split(' ')[0].toLowerCase())){
                return message.channel.send(`You can't replace commands with global tags enabled`)
            }
            let tag = await Module.db.globalTags.getTag(args.split(' ')[0])
            if(!tag || tag.user == message.author.id || (tag.guildId == message.guild.id && message.author.hasPermission('ADMINISTRATOR'))){
                if(!args.split(' ')[1] && message.attachments.size == 0){
                    await Module.db.globalTags.removeTag(message.author.id, args.split(' ')[0])
                    return await message.react('🗑️')
                }
                else{
                    await Module.db.globalTags.saveTag(message.guild.id, message.author.id, args.split(' ')[0], args.split(' ').slice(1).join(' '), message.attachments.size > 0 ? message.attachments.first().url : null)
                    return await message.react('👍')
                }
            }
            else return message.channel.send("You don't have permission to modify that tag.")
        }
        else{
            if(!(message.member.hasPermission('ADMINISTRATOR') || message.author.id == Module.config.ownerId)) return
            if(!args) return message.channel.send("What tag do you want to create/modify?")
            if(args.split(' ')[0].toLowerCase() == 'tag' || args.split(' ')[0].toLowerCase() == 'tags') return message.channel.send("You can't replace the tag command.")
            if(!args.split(' ')[1] && message.attachments.size == 0){
                if(await Module.db.tags.getTag(message.guild.id, args)){
                    await Module.db.tags.removeTag(message.guild.id, args.split(' ')[0])
                    return await message.react('🗑️')
                }
                else return message.channel.send("I can't remove a non-existant tag")
            }
            else{
                await Module.db.tags.saveTag(message.guild.id, args.split(' ')[0], args.split(' ').slice(1).join(' ') , message.attachments.size > 0 ? message.attachments.first().url : null)
                return await message.react('👍')
            }
        }
    }
})
.addCommand({name: 'tags',
    process: async(message,args)=>{
        let tags = await Module.db.tags.getAllTags(message.guild.id)
        if(args.toLowerCase() == 'global' && ((message.member && message.member.hasPermission('ADMINISTRATOR')|| message.author.id == Module.config.ownerId))){
            let list = []
            if(!await Module.db.tags.globalStatus(message.guild.id))
            {
                if(tags){
                    for (let t of tags.tags){
                        let tag = await Module.db.globalTags.getTag(t.name)
                        if(tag) list.push(t.name)
                    }
                    let promptEmbed = u.embed().setTitle('Are you sure you want to go global?').setDescription(list.length > 0 ? `All but the following tags will be brought over: \n${list.join('\n')}`:`All of your tags will be brought over.`)
                    let confirmEmbed = u.embed().setTitle("You've gone global!").setDescription("You now have access to all the other global server's tags!")
                    let cancelEmbed = u.embed().setTitle("Canceled").setDescription("You didn't go global, and the tags weren't erased")
                    let decision = await u.confirmEmbed(message,promptEmbed,confirmEmbed,cancelEmbed)
                    if(decision == true) return await Module.db.tags.setGlobal(message.guild.id, message.guild.owner.id)
                    else return
                }
                //console.log(list)
                
            }
            else{
                
                let promptEmbed = u.embed().setTitle("Are you sure you want to disable global tags?")
                let confirmEmbed = u.embed().setTitle("Global tags disabled")
                let cancelEmbed = u.embed().setTitle("Canceled")
                let decision = await u.confirmEmbed(message,promptEmbed,confirmEmbed,cancelEmbed)
                if(decision == true) return await Module.db.tags.setLocal(message.guild.id)
                else return
            }
        }
        if(!tags) return message.channel.send('Looks like this server doesn\'t have any tags.')
        let list = []
        tags.tags.forEach(t => {
            list.push(t.name)
        });
        return message.channel.send(list.join('\n'))
    }
})

module.exports = Module