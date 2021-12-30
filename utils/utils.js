const {Util, WebhookClient, MessageButton, MessageActionRow, Message, MessageSelectMenu, MessageEmbed} = require("discord.js");
const {GuildMember, GuildChannel, GuildEmoji, Guild, Interaction, CommandInteraction} = require('discord.js')
const discord = require('discord.js')
const config = require("../config/config.json")
const validUrl = require('valid-url');
const jimp = require('jimp')
const errorLog = new WebhookClient({id: config.error.id, token: config.error.token})
const events = require('events')
const fs = require('fs')
const langFilter = fs.readFileSync('./jsons/naughty.txt', 'utf-8').split('\n')
const em = new events.EventEmitter()
const Utils = {
    /**
     * @param {string} name The type of mod action
     * Options should ideally be in this order (you can also add more)
     * @param {GuildMember} executor
     * @param {GuildMember[]|GuildChannel|GuildEmoji|Guild} targets
     * @param {string} reason
     * @param {string|number} statistic
     * @param {any[]} succeeded
     * @param {any[]} failed
     * @param {MessageEmbed} embed
     * @returns {em} Emits a modEvent
     */
    emit: (name, ...options) => em.emit(name, options),
    
    /**
     * @param data Action Row Data
     * @returns {MessageActionRow}
     */
    actionRow: (data) => new MessageActionRow(data),
    
    /**
     * @param data Message Embed Data
     * @returns {MessageEmbed}new MessageEmbed
     */
    embed: (data) => new MessageEmbed(data).setColor(config.color),
    
    /**
     * @param data Message Button Data
     * @returns new MessageButton
     */
    button: (data) =>  new MessageButton(data),
    
    /**
     * @param data Message Select Menu Data
     * @returns new MessageSelectMenu
     */
    selectMenu: (data) => new MessageSelectMenu(data),
    
    /**
     * Deletes 1 or more messages
     * @param {Message|Message[]} message Message Object(s)
     * @param {number} t Time in ms
     * @returns Message
     */
    clean: async (message, t = 20000)=>{
        if(message.length > 1){
            setTimeout((message) =>{
                message.forEach(m => {
                    if (m.deletable && !m.deleted) m.delete();
                });
            }, t, message);
            return Promise.resolve(message);
        }
        else{
            setTimeout((message) =>{
                    if (message.deletable && !message.deleted) message.delete();
            }, t, message);
            return Promise.resolve(message);
        }        
    },

    /**
     * @param {error} error error
     * @param {Message|Interaction|CommandInteraction} msg Message Object
     * @returns Handles the error (don't worry about it)
     */
    errorHandler: async (error, msg)=>{
        try{
            if (!error) return;
            console.error(Date());
            let embed = Utils.embed().setTitle(error.name);
            console.log(msg)
            if (msg instanceof Message) {
                console.error(`${msg.author.username} in ${(msg.guild ? `${msg.guild.name} > ${(msg.channel).name}` : "a DM")}: ${msg.cleanContent}`);
                msg.channel.send("I've run into an error. I've let my devs know.").then(Utils.clean);
                embed.addField("User", msg.author.username, true).addField("Location", (msg.guild ? `${msg.guild.name} > ${(msg.channel).name}` : "a DM"), true).addField("Command", msg.cleanContent ?? "`undefined`", true);
            } if(msg instanceof CommandInteraction){
                msg.client.interactionFailed(msg, "ERROR")
                let subcmd = `/${msg.commandName} ${msg.options.getSubcommand(false) ?? ''}`
                let options = msg.options.data.map(a => {return {name: a.name, value: a.value}})
                let location = `${msg.guild ? `${msg.guild.name} > ${msg.channel?.name}` : 'a DM'}`
                console.error(`${msg.user.username} in ${location}: ${subcmd} ${options.map(a => a.value).join(' ')}`)
                embed.addField("User", msg.user.username, true)
                .addField("Location", location, true)
                .addField("Command", subcmd, true)
                .addFields(options)
            }
            else if(msg instanceof Interaction ){
                let location = `${msg.guild ? `${msg.guild.name} > ${msg.channel?.name}` : 'a DM'}`
                console.error(`${msg.user.username} in ${location}: ${msg.type}: ${msg.valueOf()}`)
                msg.client.interactionFailed(msg, "ERROR")
                let {type} = msg
                if(msg.isMessageComponent()) type = msg.componentType
                embed.addField("User", msg.user.username, true)
                .addField("Location", location, true)
                .addField("Type", type, true)
                .addField("Full interaction", msg.valueOf(), true)
                console.error(`${msg.user.username} in ${location}: ${type}: ${msg.valueOf()}`)
            }
            
            else if (typeof msg === "string") {
                console.error(msg);
                embed.addField("Message", msg.replace(/\/Users\/bobbythecatfish\/Downloads\//gi, ''));
            }
            console.trace(error);
            
            let stack = (error.stack ? error.stack : error.toString());
            if (stack.length > 1024) stack = stack.slice(0, 1000);
        
            embed.addField("Error", stack.replace(/\/Users\/bobbythecatfish\/Downloads\//gi, ''));
            return errorLog.send({embeds: [embed]});
        } catch(e){console.log(e)}
    },

    /**
     * 
     * @param {Message} msg 
     * @param {string} content 
     */
    hasLang: async(msg, content)=>{
        let status = 0//await msg.client.db.guildconfig.getLanguageFilter(msg.guild.id)
        if(status == 0) return false
        let filter
        if(status == 1) filter = langFilter[0].split(',')
        else if(status == 2) filter = langFilter[1].split(',')
        else filter = langFilter.join(',').split(',')
        let filtered = filter.filter(a => content.includes(a)).filter(a => a.length > 0)
        console.log(filtered)
        if(filtered.length > 0) return filtered
        else return false
    },

    /**
     * @param {string} string 
     */
    getEmoji: (string) =>{
        let parsed = discord.Util.parseEmoji(string)
        if(!parsed?.id) return null
        parsed.link = `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}`
        return parsed
    },

    /**
     * @param {Message} message Message Object
     * @param {MessageEmbed}promptEmbed Initial embed to send
     * @param {MessageEmbed}confirmEmbed Embed to send if the user reacts with ✅
     * @param {MessageEmbed}cancelEmbed Embed to send if the user reacts with 🛑
     * @param {MessageEmbed}timeoutEmbed Embed to send if the user runs out of time
     * @param {number} time Time in ms
     * @returns boolean/null
     */
    confirmEmbed: async (message, promptEmbed, confirmEmbed, cancelEmbed, timeoutEmbed, time = 300000)=>{
        if(!timeoutEmbed) timeoutEmbed = Utils.embed().setTitle('Timed out').setDescription('You ran out of time!')
        let confirmButton = Utils.button().setStyle('SUCCESS').setLabel('Confirm').setCustomId('confirm')
        let cancelButton = Utils.button().setStyle('DANGER').setLabel('Cancel').setCustomId('cancel')
        let buttons = Utils.actionRow().addComponents([confirmButton, cancelButton])
        let msg
        if(message instanceof discord.User || message instanceof discord.GuildMember) msg = await message.send({embeds: [promptEmbed], components: [buttons], allowedMentions: {parse: []}})
        else msg = await message.reply({embeds: [promptEmbed], components: [buttons], allowedMentions: {parse: []}})
        
        let filter = m => m.user.id == (message.author?.id ?? m.user.id) && m.componentType == 'BUTTON'
        const int = await msg.awaitMessageComponent({filter, componentType: 'BUTTON', time}).catch(e =>{console.log(e);return msg.edit({embeds: [timeoutEmbed]})})
        let status = (int.customId == 'confirm')
        int.update({embeds: [status ? confirmEmbed : cancelEmbed]})
        return status
    },

    /**
     * 
     * @param {Message} msg 
     * @param {discord.MessageActionRow[]} actionRows 
     * @returns {Promise<discord.MessageComponentInteraction>}
     */
    awaitButton: async(msg, time = 5000 * 60) =>{
        let filter = m => m.user.id == (msg.user ?? msg.author)?.id
        try{
            let int = await msg.awaitMessageComponent({filter: filter, componentType: 'BUTTON', time: time})
            return int
        } catch(e){
            let er = new Error()
            if(er.stack.includes('ending with reason: time')) return {customId: 'time'}
            else return u.errorHandler(e, msg)
        }
    },

    /**
     * @param {string} text Text to escape
     * @param {{}} options EscapeMarkdownOptions
     * @returns {string} Escaped Text
     */
    escape: (text, options = {}) => Util.escapeMarkdown(text, options),
    
    /**
     * @param {string} txt Text to escape
     * @returns {string} Escaped Text
     */
    escapeText: (txt) => txt.replace(/(\*|_|`|~|\\|\|)/g, '\\$1'),
    
    /**
     * @returns {function} null function
     */
    noop: () => {},
    
    /**
     * @param {any[]} array Array
     * @returns {any} Random entry from the array
     */
    rand: (array) => array[Math.floor(Math.random() * array.length)],
    
    /**
     * Kinda borked, I wouldnt use tbh
     */
    getMention: async (message, parse='', getMember = true)=>{
        try
        {
            message
            if(!parse){
                let {suffix} = await Utils.parse(message)
                if (message.guild){
                    let memberMentions = message.mentions.members;
                    if (memberMentions.size > 0) return (getMember ? memberMentions.first() : memberMentions.first().user);
                    
                    else if (suffix){
                    let member = (await message.guild.members.fetch({query: suffix})).first();
                    if (member) return (getMember ? member : member.user);
                    else return getMember ? message.member : message.author;
                    }
                    else return (getMember ? message.member : message.author);
                }
                else{
                    let userMentions = message.mentions.users;
                    return userMentions.first() || message.author;
                }
            }
            else{
                if(message.guild){
                    let memberMentions = message.mentions.members
                    if(memberMentions.size > 0) return (getMember ? memberMentions.first() : memberMentions.first().user)
                
                    else if(parse){
                        let member = (await message.guild.members.fetch({query: parse})).first()
                        if(member) return (getMember ? member : member.user)
                        else return getMember ? message.member : message.author
                    }
                    else return getMember ? message.member : message.author
                }
            }
        }catch(error) {return null;}
    },
    
    /**
     * @param {string} str String to find mentions in
     * @returns {{targets: GuildMember[], reason: string}} Guild members
     */
    parseTargets: (msg, str)=>{
        let regex = /(<@!?\d+>)/g
        let list = str.split(regex).filter(a => !['', ' '].includes(a))
        let targets = []
        for(x of list){
            if(!x.match(regex)) break
            else targets.push(x)
        }
        let reason = list.slice(targets.length).join('')
        target.map(a => msg.guild.members.cache.get(a))
        return {targets, reason}
    },
    
    /**
     * @param {Message} msg Message Object
     * @returns {Promise<string>} Prefix
     */
    prefix: async (msg)=>{
        try {
            if(msg.channel?.parentId == '813847559252344862') return '>'
            else if (msg.guild) return await msg.client.db.guildconfig.getPrefix(msg.guild.id);
            else return config.prefix;
        } catch(e) {
            Utils.errorHandler(e, msg.content);
            return config.prefix;
        }
    },
    
    /**
     * @param {Message} msg Message Object
     * @returns {Promise<{command: string, suffix:string, params: []}>} Parsed message content
     */
    parse: async (msg)=>{
        try {
            let prefix = await Utils.prefix(msg),
            message = msg.content,
            parse;
            if (msg.author.bot) parse = null;
            else if (message.startsWith(prefix)) parse = message.slice(prefix.length);
            else if (message.startsWith(`<@${msg.client.user.id}>`)) parse = message.slice((`<@${msg.client.user.id}>`).length);
            else if (message.startsWith(`<@!${msg.client.user.id}>`)) parse = message.slice((`<@!${msg.client.user.id}>`).length);
            if (parse) {
                parse = parse.trim().split(" ");
                return {
                    command: parse.shift().toLowerCase(),
                    suffix: parse.join(" "),
                    params: parse
                };
            } else return null;
        } catch(e) {
            Utils.errorHandler(e, msg);
            return null;
        }
    },
    
    /**
     * @param {...string} segments
     * @returns {Promise<string>} idk the path? i've never used this before
     */
    path: async (...segments)=>{
        const path = require("path");
        return path.resolve(path.dirname(require.main.filename), ...segments);
    },
    
    /**
     * @param {string} txt Text to put into proper case
     * @param {boolean} replace Replace _ with spaces
     * @returns {string} Proper case string
     */
    properCase: (txt, replace = false)=>{
        if(!txt) return txt
        if(replace) txt = txt.replace(/_/g, ' ')
        return txt.split(" ").map(word => (word[0].toUpperCase() + word.substr(1).toLowerCase())).join(" ")
    },
    
    /**
     * Kidna pointless but helps in low-traffic scenarios
     * @param {Message} message Message Object
     * @param {string} reactions Reaction ID/name
     * @returns {Promise<null>}
     */
    react: async (message, reactions)=>{
        let i = 0
        let x = setInterval(()=>{
            message.react(reactions[i])
            i++
            if(i == reactions.length) clearInterval(x)
        }, 1500)
        return null
    },
    
    /**
     * @param {Message} msg Message to reply to
     * @param {string} content What to reply with
     * @param {boolean} clean Use u.clean or not
     * @param {boolean} mention Mention the user
     */
    reply: async(msg, content, clean = false, mention = false,)=>{
        if(!msg) return Utils.errorHandler(new Error('u.reply needs a message object'), `Reply content: ${content}`)
        else msg.reply({content, allowedMentions: {repliedUser: mention}, failIfNotExists: false}).then(m => {if(clean) Utils.clean(m)})
    },
    
    /**
     * @param {string} txt text to verify
     * @returns {boolean} is link or not
     */
    validUrl: (txt)=>{
        return validUrl.isWebUri(txt)
    },
    
    /**
     * @param {string} image Image URL
     * @returns {Promise<jimp>} is image or not
     */
    validImage: async(image)=>{
        try{
            let img = await jimp.read(image)
            if(img.bitmap.data.byteLength >= 7500000) return null
            return img
        } catch{
            return false
        }
    },
    
    /**
     * @param {Message} msg Message Object
     * @returns {Promise<GuildChannel>} Botspam or current channel
     */
    botSpam: async (msg)=>{
        if(!msg.guild) return msg.channel
        let channel = await msg.client.db.guildconfig.getBotLobby(msg.guild.id)
        return msg.client.channels.cache.get(channel) ?? msg.channel
    },
    
    /**
     * @param {Message} msg Message Object
     * @returns {Promise<GuildChannel>} error channel or current channel
     */
    errorChannel: async (msg)=>{
        if(!msg.guild) return msg.channel
        let channel = await msg.client.db.guildconfig.getErrorChannel(msg.guild.id)
        return msg.client.channels.cache.get(channel) ?? msg.channel
    },
    
    
    
    /**
     * @param {{category: string, int: number}[]} flags Array of flag categories and ints
     * @returns {number} encoded number
     */
    encodeLogEvents: (flags)=>{
        let reduce = function(flags) {
            let numbers =  flags.map(f => f.int)
            let reduced = numbers.length > 1 ? numbers.reduce(function(a, b){return a+b}) : numbers
            if(numbers.length > 1) reduced++
            return reduced.toString()
        }
        let channel = reduce(flags.filter(f => f.category == 'channel'))
        let message = reduce(flags.filter(f => f.category == 'message'))
        let emoji = reduce(flags.filter(f => f.category == 'emoji'))
        let member = reduce(flags.filter(f => f.category == 'member'))
        let other = reduce(flags.filter(f => f.category == 'other'))
        let server = reduce(flags.filter(f => f.category == 'server'))
        let role = reduce(flags.filter(f => f.category == 'role'))
        return channel + message + emoji + member + other + server + role
    },
    
    /**
     * @param {Guild} guild Guild Object
     * @returns {Promise<string[]>} Array of flag names
     */
    decodeLogEvents: async (guild)=>{
        let events = require('../jsons/events.json').events
        let decrypt = function(int, category){
            let filtered = events.filter(f => f[2] == category)
            if(int == 0) return []
            if(int == 7) return filtered.map(f => f[0])
            if(int <= 3) return filtered.find(f => f[1] == int)[0]
            if(int == 4) return filtered.filter(f =>  f[1] == 1 || f[1] == 2).map(f => f[0])
            if(int == 5) return filtered.filter(f =>  f[1] == 1 || f[1] == 3).map(f => f[0])
            if(int == 6) return filtered.filter(f =>  f[1] == 2 || f[1] == 3).map(f => f[0])
        }
        let bytefield = await guild.client.db.guildconfig.getLogFlags(guild.id)
        if(!bytefield) return []
        let channel = decrypt(bytefield[0], 'channel')
        let message = decrypt(bytefield[1], 'message')
        let emoji = decrypt(bytefield[2], 'emoji')
        let member = decrypt(bytefield[3], 'member')
        let other = decrypt(bytefield[4], 'other')
        let server = decrypt(bytefield[5], 'server')
        let role = decrypt(bytefield[6], 'role')
        return channel.concat(message, emoji, member, other, server, role)
    }
};

module.exports = Utils;