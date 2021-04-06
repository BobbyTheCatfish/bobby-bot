const Augur = require('augurbot'),
    u = require('../utils/utils'),
    discord = require('discord.js')

const Module = new Augur.Module();

Module.addCommand({name: 'embed',
    onlyGuild: true,
    permissions: ['MANAGE_WEBHOOKS'],
    category: "Moderation",
    process: async(msg, suffix) =>{
        let contentFilter = m => m.content
        let imageFilter = m => m.content || m.attachments.first()
        const time = 5000 * 60
        let fieldCount = 0
        let prompt = async(msg, embed)=>{
            let promptEmbed = u.embed().setTitle('What would you like to do?')
            .setDescription('Type in one of the following:\nSet Title\nSet Description\nAdd Field\nRemove Field\nSet Footer\nSet Timestamp\nSet Author\nSet Image\nSet Thumbnail\nSet Color\nPreview\nSend\nCancel')
            let options = ['title','description','add field','remove field','footer','timestamp','author','image','thumbnail','color','preview','send','cancel']
            await msg.author.send({embed: promptEmbed}).then(async m => {
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content.toLowerCase()
                          if(content.includes(options [0]) ) await titlePrompt(msg, embed)
                    else if (content.includes(options [1]) ) await descriptionPrompt(msg, embed)
                    else if (content.includes(options [2]) ) await addFieldPrompt(msg, embed)
                    else if (content.includes(options [3]) ) await removeFieldPrompt(msg, embed)
                    else if (content.includes(options [4]) ) await footerPrompt(msg, embed)
                    else if (content.includes(options [5]) ) await timestampPrompt(msg, embed)
                    else if (content.includes(options [6]) ) await authorPrompt(msg, embed)
                    else if (content.includes(options [7]) ) await imagePrompt(msg, embed)
                    else if (content.includes(options [8]) ) await thumbnailPrompt(msg, embed)
                    else if (content.includes(options [9]) ) await colorPrompt(msg, embed)
                    else if (content.includes(options [10]) ) await previewPrompt(msg, embed)
                    else if (content.includes(options [11]) ) await sendEmbed(msg, embed)
                    else if (content.includes(options [12]) ) return msg.author.send('Embed Canceled')

                })
            })
        }

        let titlePrompt = async(msg, embed)=>{
            let urlPrompt = async(msg, embed, promptEmbed)=>{
                promptEmbed.setTitle('What should the title URL be?')
                await msg.author.send({embed: promptEmbed}).then(async m =>{
                    let resend = async(msg, embed, promptEmbed) =>{
                        await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let url = collected.first().content
                            if(url.toLowerCase() == 'none') url = ''
                            else if(!u.validUrl(url) || (!url.startsWith('http') && !url.startsWith('https'))){
                                msg.author.send(`That isn't a link! Try again or type \`none\` for none.`)
                                await resend(msg, embed, promptEmbed)
                            }
                            let newEmbed = embed.setURL(url)
                            await prompt(msg, newEmbed)
                        })
                    }
                    await resend(msg, embed, promptEmbed)
                })
            }
            let promptEmbed = u.embed().setTitle('What should the title be?').setDescription('Type `none` for none')
            msg.author.send({embed: promptEmbed}).then(async(m)=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content == 'none'){
                        let newEmbed = embed.setTitle('')
                        await prompt(msg, newEmbed)
                    }
                    let newEmbed = embed.setTitle(content)
                    await urlPrompt(msg, newEmbed, promptEmbed)
                })
            })
        }
        let descriptionPrompt = async(msg, embed)=>{
            let promptEmbed = u.embed().setTitle('What should the description be?').setDescription('Type `none` for none')
            msg.author.send({embed: promptEmbed}).then(async(m)=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content == 'none') content = ''
                    let newEmbed = embed.setDescription(content)
                    await prompt(msg, newEmbed)
                })
            })
        }
        let addFieldPrompt = async(msg, embed)=>{
            fieldDesc = async(msg, embed, title, promptEmbed)=>{
                promptEmbed.setTitle('What should the field content be?')
                msg.author.send({embed: promptEmbed}).then(async(m)=>{
                    await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let content = collected.first().content
                        await inline(msg, embed, title, content, promptEmbed)
                    })
                })
            }
            inline = async(msg, embed, title, desc, promptEmbed)=>{
                let inline = false
                promptEmbed.setTitle('Should this be inline?')
                msg.author.send(promptEmbed).then(async bool =>{
                    const reactions = ['✅','❌']
                    const filter = (reaction, user) => reactions.includes(reaction.emoji.name)
                    for (let x of reactions) await bool.react(x)
                    await bool.awaitReactions(filter, {max: 1, time, errors: ['time']})
                    .then(async collected=>{
                        let reacted = collected.first().emoji.name
                        if(reacted == '✅') inline = true
                        let newEmbed = embed.addField(title, desc, inline)
                        fieldCount++
                        await prompt(msg, newEmbed)
                    })
                })
            }
            let promptEmbed = u.embed().setTitle('What should the field title be?')
            msg.author.send({embed: promptEmbed}).then(async(m)=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let title = collected.first().content
                    await fieldDesc(msg, embed, title, promptEmbed)
                })
            })
        }
        let deleteFieldPrompt = async(msg, embed)=>{
            confirmation = async(msg, embed, choice)=>{
                let promptEmbed = u.embed().setTitle("Are you sure you want to delete the following field(s)?").addFields(choice)
                let confirmEmbed = u.embed().setTitle("Field(s) deleted")
                let cancelEmbed = u.embed().setTitle("Field(s) were not deleted")
                let confirm = await u.confirmEmbed(msg, promptEmbed, confirmEmbed, cancelEmbed)
                let newEmbed = embed
                if(confirm == true){
                    for(x of choice){
                        let index = embed.fields.findIndex(choice)
                        newEmbed = embed.spliceFields(index, 1)
                    }
                }
                await prompt(msg, newEmbed)
            }
            let promptEmbed = u.embed().setTitle("Which field do you want to delete?").setDescription("Please specify the field name. If there are multiple with the same name, all with the name will be deleted.").addFields(embed.fields)
            msg.author.send({embed: promptEmbed}).then(async m =>{
                let resend = async (msg, embed) =>{
                    await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let selected = collected.first().content.toLowerCase()
                        let toRemove = embed.fields.filter(f => f.name.toLowerCase() == selected)
                        if(!toRemove){
                            msg.author.send("That's not one of the fields. Please try again")
                            await resend(msg, embed)
                        }
                        else await confirmation(msg, embed, toRemove)
                    })
                }
                await resend(msg, embed)
            })
        }
        let footerPrompt = async(msg, embed)=>{
            icon = async(msg, embed, title, promptEmbed)=>{
                promptEmbed.setTitle('What should the footer icon be?').setDescription('Type `none` for none. You can use a file or link')
                msg.author.send({embed: promptEmbed}).then(async m =>{
                    let resend = async(msg, embed, title, promptEmbed) =>{
                        await m.channel.awaitMessages(imageFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let content = collected.first().content
                            if(content){
                                if(content == 'none'){
                                    let newEmbed = embed.setFooter(title, '')
                                    await prompt(msg, newEmbed)
                                }
                                if(!u.validUrl(content)){
                                    msg.author.send("That's not a valid link!")
                                    await icon(msg, embed, title, promptEmbed)
                                }
                            }
                            else if(collected.first().attachments.size > 0){
                                console.log(collected.first().attachments)
                                let newEmbed = embed.setFooter(title, collected.first().attachments.first().url)
                                await prompt(msg, newEmbed)
                            }
                            else await icon(msg, embed, title, promptEmbed)
                        })
                    }
                    await resend(msg, embed, title, promptEmbed)
                })
            }
            let promptEmbed = u.embed().setTitle('What should the footer text be?').setDescription('Type `none` for none')
            msg.author.send({embed: promptEmbed}).then(async(m)=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let text = collected.first().content
                    if(text == 'none'){
                        let noFooter = embed.setFooter('','')
                        await prompt(msg, noFooter)
                    }
                    await icon(msg, embed, text, promptEmbed)
                })
            })
        }
        let timestampPrompt = async(msg, embed)=>{
            let promptEmbed = u.embed().setTitle('What should the timestamp be?').setDescription('Examples:\n`now`\n`December 17, 1995 03:24:00`\n1995-12-17T03:24:00`\n1995, 11, 17`\n`1995, 11, 17, 3, 24, 0`\nType `none` for none')
            msg.author.send({embed: promptEmbed}).then(async(m)=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = new Date(collected.first().content)
                    if(collected.first().content.toLowerCase() == 'none') content = ''
                    if(collected.first().content.toLowerCase() == 'now') content = new Date()
                    let newEmbed = embed.setTimestamp(content)
                    await prompt(msg, newEmbed)
                })
            })
        }
        let authorPrompt = async(msg, embed)=>{
            authorIcon = async(msg, embed, name, promptEmbed)=>{
                promptEmbed.setTitle("What should the author icon be?").setDescription("Type `none` for none. You can use a link or a file.")
                msg.author.send({embed: promptEmbed}).then(async (m)=>{
                    let resend = async(msg ,embed, name, promptEmbed)=>{
                        await m.channel.awaitMessages(imageFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let icon = collected.first().content
                            if(icon){
                                if(icon.toLowerCase() == 'none') icon = ''
                            }
                            else if(collected.first().attachments.first()) icon = collected.first().attachments.first().url
                            if(icon && !icon.toLowerCase().startsWith('http')){
                                msg.author.send("That's not a valid image URL")
                                await resend(msg, embed, name, promptEmbed)
                            }
                            await authorUrl(msg, embed, name, icon, promptEmbed)
                        })
                    }
                    await resend(msg, embed, name, promptEmbed)
                })
            }
            authorUrl = async(msg, embed, name, icon, promptEmbed) =>{
                promptEmbed.setTitle("What should the author URL be?")
                msg.author.send({embed: promptEmbed}).then(async m=>{
                    let resend = async(msg, embed, name, icon, promptEmbed) =>{
                        m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                        .then(async collected =>{
                            let url = collected.first().content
                            if(url.toLowerCase() == 'none') url = ''
                            if(url && !url.toLowerCase().startsWith('http')){
                                msg.author.send("That's not a valid link.")
                                await resend(msg, embed, name, icon, promptEmbed)
                            }
                            let newEmbed = embed.setAuthor(name, icon, url)
                            await prompt(msg, newEmbed)
                        })
                    }
                    await resend(msg ,embed, name, icon, promptEmbed)
                })
            }
            let promptEmbed = u.embed().setTitle('What should the author name be?').setDescription('Type `none` for none')
            msg.author.send(promptEmbed).then(async m =>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let name = collected.first().content
                    if(name == 'none'){
                        let newEmbed = embed.setAuthor('')
                        await prompt(msg, newEmbed)
                    }
                    await authorIcon(msg, embed, name, promptEmbed)
                })
            })
        }
        let imagePrompt = async(msg, embed)=>{
            let promptEmbed = u.embed().setTitle('What do you want to set as the image?').setDescription('Type `none` for none')
            msg.author.send({embed: promptEmbed}).then(async m=>{
                let resend = async(msg, embed) =>{
                    await m.channel.awaitMessages(imageFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let image = collected.first().content
                        if(collected.first().content == 'none'){
                            let newEmbed = embed.setImage()
                            await prompt(msg, newEmbed)
                        }
                        if(!image) image = collected.first().attachments.first()?.url
                        if(!u.validUrl(image)){
                            msg.author.send("That's not a valid image!")
                            await imagePrompt(msg, embed)
                        }
                        else{
                            let newEmbed = embed.setImage(image)
                            await prompt(msg, newEmbed)
                        }
                    })
                }
                await resend(msg, embed)
            })
        }
        let thumbnailPrompt = async(msg, embed)=>{
            let promptEmbed = u.embed().setTitle('What do you want to set as the thumbail?').setDescription('Type `none` for none')
            msg.author.send({embed: promptEmbed}).then(async m=>{
                let resend = async(msg, embed)=>{
                    await m.channel.awaitMessages(imageFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let icon = collected.first().content
                        if(collected.first().content == 'none'){
                            let newEmbed = embed.setThumbnail()
                            await prompt(msg, newEmbed)
                        }
                        if(!icon) icon = collected.first().attachments.first()?.url
                        if(!u.validUrl(icon)){
                            msg.author.send("That's not a valid image!")
                            await resend(msg, embed)
                        }
                        let newEmbed = embed.setThumbnail(icon)
                        await prompt(msg, newEmbed)
                    })
                }
                await resend(msg, embed)
            })
        }
        let colorPrompt = async(msg, embed)=>{
            let promptEmbed = u.embed().setTitle('What color do you want the embed to be?').setDescription('Type `none` for default')
            msg.author.send({embed: promptEmbed}).then(async (m)=>{
                await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                .then(async collected =>{
                    let content = collected.first().content
                    if(content == 'none') content = ''
                    let newEmbed = embed.setColor(content)
                    await prompt(msg, newEmbed)
                })
            })
        }
        let previewPrompt = async(msg,embed)=>{
            msg.author.send({embed})
            setTimeout(async() => {
                await prompt(msg, embed)
            }, 5000);
        }
        let sendEmbed = async(msg, embed) =>{
            let promptEmbed = u.embed().setTitle('What channel do you want me to send the embed to?').setDescription('Type the ID or name')
            msg.author.send({embed: promptEmbed}).then(async(m)=>{
                let resend = async(msg, embed)=>{
                    await m.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                    .then(async collected =>{
                        let content = collected.first().content
                        let channel = await msg.guild.channels.cache.filter(b => b.type != 'category').find(c => c.name.toLowerCase() == content.toLowerCase().replace(/ /g, '-').replace(/#/g, '') || c.id == content)
                        if(!channel){                    
                            msg.author.send("I couldn't find that channel. Try again.")
                            await sendEmbed(msg, embed)
                        }
                        else if(channel.length > 1){
                            promptEmbed.setTitle('Looks like there are multiple channels with that name. Which one do you want to send it in?').setDescription(`Each of the following is a number representing the order of the channel. Please select the correct one\n${channel.rawPosition.join('\n')} `)
                            author.send({embed: promptEmbed}).then(async ms=>{
                                let resend2 = async(msg, embed)=>{
                                    await ms.channel.awaitMessages(contentFilter, {max: 1, time, errors: ['time']})
                                    .then(async coll => {
                                        let content = coll.first().content
                                        channel = msg.guild.channels.cache.filter(b => b.type != 'category').find(c => c.rawPosition == content.replace(/^[0-9]/g))
                                        if(!channel){
                                            msg.author.send("That's not one of the channels. Please try again.")
                                            await resend2(msg, embed)
                                        }
                                    })
                                }
                                await resend2(msg, embed)
                            })
                        }
                        try{channel.send({embed})} catch{msg.author.send(`I couldn't send a message in that channel. Please change my permissions for that channel or select a different channel.`);await resend(msg, embed)}
                    })
                }
                await resend(msg, embed)
            })
        }
        let embed = new discord.MessageEmbed()
        u.clear(msg, 0)
        return await prompt(msg, embed)

    }
})
module.exports = Module