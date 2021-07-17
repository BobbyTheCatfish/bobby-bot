const Discord = require("discord.js")
const config = require("../config/config.json")
const colors = require('colors');
const FileSync = require("lowdb/adapters/FileSync");
const db = require(`../${config.db.model}`);
const validUrl = require('valid-url');
const errorLog = new Discord.WebhookClient(config.error.id, config.error.token)

const Utils = {

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
    confirmEmbed: async (message, promptEmbed, confirmEmbed, cancelEmbed, timeoutEmbed = Utils.embed().setTitle('Timed out').setDescription('You ran out of time!'), time = 6000)=>{
            let msg = await (message.channel ? message.channel : message).send({embed: promptEmbed, disableMentions: "all"})
            await msg.react('✅');
            await msg.react('🛑');
            
            const filter = (reaction, user) => ['✅', '🛑'].includes(reaction.emoji.name) && user.id === (message.author ? message.author : message).id;
          
            try {
              const collected = await msg.awaitReactions(filter, { max: 1, time, errors: ['time'] });
              const reaction = collected.first();
              if (reaction.emoji.name === '✅') {
                msg.edit({embed: confirmEmbed});
                return true;
              } else {
                msg.edit({embed: cancelEmbed});
                return false;
              }
            } catch(error) {
              msg.edit({embed: timeoutEmbed});
              return null
            }
    },

    embed: (data) => new Discord.MessageEmbed(data).setColor(config.color),
    
    escape: (text, options = {}) => Discord.escapeMarkdown(text, options),

    escapeText: (txt) => txt.replace(/(\*|_|`|~|\\|\|)/g, '\\$1'),

    getMention: async (message, parse=false, getMember = true) =>{
        try
        {
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
    getMentions: async(msg, member = false) =>{
        let users = Utils.parse(msg).suffix.match(/<@!?[0-9]*>/g).join('\n').replace(/[^0-9\n]/g, '').split('\n')
        let userArray = []
        if(member) for(u of users) userArray.push(msg.guild.members.cache.get(u))
        else for (u of users) userArray.push(msg.client.users.cache.get(u))
        return userArray
    },
    noop: () => {},

    time: ()=> {
        let date = new Date
        let m = date.getMonth()+1, d = date.getDate(), y = date.getFullYear(), h = date.getHours(), mi = date.getMinutes(), s = date.getSeconds()
        if(m < 10) m = '0'+m
        if(d < 10) d = '0'+d
        if(h < 10) h = '0'+h
        if(mi < 10) mi = '0'+mi
        if(s < 10) s = '0'+s
        let give = `${m}/${d}/${y} @ ${h}:${m}:${s}`
        return `[${give}] `.magenta
    },

    paginator: async (message, pager, elements, page = 0, perPage = 1) =>{
        try{
            let totalPages = Math.ceil(elements.length / perPage);
            if (totalPages > 1){
                let embed = pager(elements, page, message).setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
                let m = await message.channel.send({embed});
                await m.react("⏪");
                await m.react("⏩");
                let reactions;

                do{
                    reactions = await m.awaitReactions(
                    (reaction, user) => (user.id == message.author.id) && ["⏪", "⏩"].includes(reaction.emoji.name),
                    { time: 300000, max: 1 });

                    if (reactions.size > 0){
                        let react = reactions.first().emoji.name;
                        if (react == "⏪") page--;
                        else if (react == "⏩") page++;
                        if (page < 0 || page >= totalPages) page = (page + totalPages) % totalPages;
                        reactions.first().remove(message.author.id);
                        embed = pager(elements, page, message).setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
                        m = await m.edit({embed});
                    }
                } while (reactions.size > 0);

                embed.setFooter(`Page ${page + 1} / ${totalPages}`);
                m.edit({embed});
                for (const [rid, r] of m.reactions.cache){
                    if (!r.me) continue;
                    else r.remove();
                }
            } else await message.channel.send({embed: pager(elements, page, message)});
        } catch(e) { Utils.alertError(e, message); }
    },
    parse: async (msg) => {
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
          Utils.errorHandler(e, msg.content);
          return null;
        }
    },
    prefix: async (msg) => {
        try {
            if(msg.channel.parentID == '813847559252344862') return '>'
            else if (msg.guild) return await msg.client.db.guildconfig.getPrefix(msg.guild.id);
            else return config.prefix;
        } catch(e) {
            Utils.errorHandler(e, msg.content);
            return config.prefix;
        }
    },
    path: async (...segments) => {
        const path = require("path");
        return path.resolve(path.dirname(require.main.filename), ...segments);
    },
    properCase: (txt) => txt.split(" ").map(word => (word[0].toUpperCase() + word.substr(1).toLowerCase())).join(" "),
    
    rand: (array) => array[Math.floor(Math.random() * array.length)],
    
    react: async (message, reactions) => {
        let i = 0
        let x = setInterval(()=>{
            message.react(reactions[i])
            i++
            if(i == reactions.length) clearInterval(x)
        }, 1500)
    },

    validUrl: async (message) =>{
        if(validUrl.isUri(message)) return true
        else return undefined
    },
    botSpam: async (msg) =>{
        if(!msg.guild) return msg.channel
        let channel = await msg.client.db.guildconfig.getBotLobby(msg.guild.id)
        return channel ?? msg.channel
    },
    errorChannel: async(msg) =>{
        if(!msg.guild) return msg.channel
        let channel = await msg.client.db.guildconfig.getErrorChannel(msg.guild.id)
        return msg.client.channels.cache.get(channel) ?? msg.channel
    },
    errorHandler: async (error, msg = null) => {
        if (!error) return;
        console.error(Date());
    
        let embed = Utils.embed().setTitle(error.name);
    
        if (msg instanceof Discord.Message) {
          console.error(`${msg.author.username} in ${(msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "DM")}: ${msg.cleanContent}`);
          const client = msg.client;
          msg.channel.send("I've run into an error. I've let my devs know.").then(Utils.clean);
          embed.addField("User", msg.author.username, true).addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "DM"), true).addField("Command", msg.cleanContent ?? "`undefined`", true);
        } else if (typeof msg === "string") {
          console.error(msg);
          embed.addField("Message", msg.replace(/\/Users\/bobbythecatfish\/Desktop\//gi, ''));
        }
    
        console.trace(error);
    
        let stack = (error.stack ? error.stack : error.toString());
        if (stack.length > 1024) stack = stack.slice(0, 1000);
    
        embed.addField("Error", stack.replace(/\/Users\/bobbythecatfish\/Desktop\//gi, ''));
        errorLog.send(embed);
    },
    encodeLogEvents: (flags) => {
        let reduce = function(flags) {
            let numbers =  flags.map(f => f.int)
            let reduced = numbers.reduce(function(a, b){return a+b})
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
    decodeLogEvents: async(guild) =>{
        let events = [
    
            ['Channel Created', 1, 'channel'],
            ['Channel Deleted', 2, 'channel'],
            ['Channel Updated', 3, 'channel'],
    
            ['Message Delete', 1, 'message'],
            ['Messages Bulk Deleted', 2, 'message'],
            ['Message Pinned', 3, 'message'],
    
            ['Emoji Created', 1, 'emoji'],
            ['Emoji Deleted', 2, 'emoji'],
            ['Emoji Updated', 3, 'emoji'],
    
            ['Member Joined', 1, 'member'],
            ['Member Left', 2, 'member'],
            ['Member Updated', 3, 'member'],
    
            ['Member Banned', 1, 'other'],
            ['Member Unbanned', 2, 'other'],
            ['Inegrations Updated', 3, 'other'],
    
            ['Invite Created', 2, 'server'],
            ['Invite Deleted', 3, 'server'],
            ['Server Updated', 1, 'server'],
    
            ['Role Created', 1, 'role'],
            ['Role Deleted', 2, 'role'],
            ['Role Updated', 3, 'role'],
    
            ['Enable All', 7, 'all'] //777777
    ]
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