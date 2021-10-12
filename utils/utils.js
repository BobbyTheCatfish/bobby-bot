const {Util, WebhookClient, MessageButton, MessageActionRow, Message, MessageSelectMenu, MessageEmbed} = require("discord.js");
const {GuildMember, GuildChannel, GuildEmoji, Guild} = require('discord.js')
const config = require("../config/config.json")
const validUrl = require('valid-url');
const jimp = require('jimp')
const errorLog = new WebhookClient({id: config.error.id, token: config.error.token})
const events = require('events'),
    em = new events.EventEmitter()
const Utils = {
    /**
     * @param {string} type The type of mod action
     * @param {GuildMember} executor Who executed the command
     * @param {GuildMember[]|GuildChannel[]|GuildEmoji[]} target Array of targets
     * @param {string|number} [reason] Reason
     * @returns {em} Emits a modEvent
     */
    modEvent: (type, executor, target, reason) => em.emit('modEvent', [type, executor, target, reason]),
    
    /**
     * @param data Action Row Data
     * @returns new MessageActionRow
     */
    actionRow: (data) => new MessageActionRow(data),
    
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
     * @param {Message} message Message Object
     * @param {MessageEmbed}promptEmbed Initial embed to send
     * @param {MessageEmbed}confirmEmbed Embed to send if the user reacts with ✅
     * @param {MessageEmbed}cancelEmbed Embed to send if the user reacts with 🛑
     * @param {MessageEmbed}timeoutEmbed Embed to send if the user runs out of time
     * @param {number} time Time in ms
     * @returns boolean/null
     */
    confirmEmbed: async (message, promptEmbed, confirmEmbed, cancelEmbed, timeoutEmbed = embed().setTitle('Timed out').setDescription('You ran out of time!'), time = 6000)=>{
            let msg = await message.channel.send({embeds: [promptEmbed], allowedMentions: {parse: []}})
            await msg.react('✅');
            await msg.react('🛑');
            
            const filter = (reaction, user) => ['✅', '🛑'].includes(reaction.emoji.name) && user.id === (message.author ? message.author : message).id;
            
            try {
                const collected = await msg.awaitReactions({filter, max: 1, time, errors: ['time'] });
                const reaction = collected.first();
                if (reaction.emoji.name === '✅') {
                msg.edit({embeds: [confirmEmbed]});
                return true;
                } else {
                msg.edit({embeds: [cancelEmbed]});
                return false;
                }
            } catch(error) {
                msg.edit({embeds: [timeoutEmbed]});
                return null
            }
    },
    
    /**
     * @param data Message Embed Data
     * @returns {MessageEmbed}new MessageEmbed
     */
    embed: (data) => new MessageEmbed(data).setColor(config.color),
    
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
     * Kinda borked, I wouldn't use tbh
     */
    getMentions: async (msg, member = false)=>{
        let users = Utils.parse(msg).suffix.match(/<@!?[0-9]*>/g).join('\n').replace(/[^0-9\n]/g, '').split('\n')
        let userArray = []
        if(member) for(let u of users) userArray.push(msg.guild.members.cache.get(u))
        else for (let u of users) userArray.push(msg.client.users.cache.get(u))
        return userArray
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
        if(validUrl.isWebUri(txt)) return true
        else return false
    },
    
    /**
     * @param {string} image Image URL
     * @returns {Promise<boolean>} is image or not
     */
    validImage: async(image)=>{
        try{
            await jimp.read(image)
            return true
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
     * @param {error} error error
     * @param {Message} msg Message Object
     * @returns Handles the error (don't worry about it)
     */
    errorHandler: async (error, msg = null)=>{
        try{

            if (!error) return;
            console.error(Date());
            let embed = Utils.embed().setTitle(error.name);
        
            if (msg instanceof Message) {
                console.error(`${msg.author.username} in ${(msg.guild ? `${msg.guild.name} > ${(msg.channel).name}` : "DM")}: ${msg.cleanContent}`);
                const client = msg.client;
                msg.channel.send("I've run into an error. I've let my devs know.").then(Utils.clean);
                embed.addField("User", msg.author.username, true).addField("Location", (msg.guild ? `${msg.guild.name} > ${(msg.channel).name}` : "DM"), true).addField("Command", msg.cleanContent ?? "`undefined`", true);
            } else if (typeof msg === "string") {
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