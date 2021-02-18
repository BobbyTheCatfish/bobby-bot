const Discord = require("discord.js")
const config = require("../config/config.json")
const colors = require('colors');
const FileSync = require("lowdb/adapters/FileSync");
const db = require(`../${config.db.model}`);
const validUrl = require('valid-url');
const errorLog = new Discord.WebhookClient(config.error.id, config.error.token)
const Utils = {

    Collection: Discord.Collection,

    clean: function(message, t = 20000)
    {
        if(message.length > 1){
            setTimeout((message) =>{
                message.forEach(m => {
                    if (m.deletable && !m.deleted) m.delete();
                });
            }, t, message);
            return Promise.resolve(message);
        }
        else
        {
            setTimeout((message) =>{
                    if (message.deletable && !message.deleted) message.delete();
            }, t, message);
            return Promise.resolve(message);
        }
        
    },
    confirmEmbed: async function(message, promptEmbed, confirmEmbed, cancelEmbed, timeoutEmbed = Utils.embed().setTitle('Timed out').setDescription('Your request timed out'), time = 6000)
    {
            let msg = await message.channel.send({embed: promptEmbed, disableMentions: "all"})
            await msg.react('✅');
            await msg.react('🛑');
            
            const filter = (reaction, user) => ['✅', '🛑'].includes(reaction.emoji.name) && user.id === message.author.id;
          
            try {
              const collected = await msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] });
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
              return null;
            }
    },

    embed: (data) => new Discord.MessageEmbed(data).setColor(config.color).setTimestamp(),
    
    escape: (text, options = {}) => Discord.escapeMarkdown(text, options),

    escapeText: (txt) => txt.replace(/(\*|_|`|~|\\|\|)/g, '\\$1'),

    getUser: function(message, user, strict = false)
    {
        // Finds a user in the same guild as the message.
        // If no user to look for, return message author.
        if (user.length == 0 || !message.guild) return (message.guild ? message.member : message.author);
        let lcUser = user.toLowerCase();
        let memberCollection = message.guild.members.cache;
        let myFn = (element) => false;
        // If there's a discriminator given, look for exact match
        if (lcUser.length > 5 && lcUser.charAt(lcUser.length-5) === "#") myFn = (element) => element.user.tag.toLowerCase() === lcUser;
        // Otherwise look for exact match of either nickname or username
        else if (!strict) myFn = (element) => (element.displayName.toLowerCase() === lcUser || element.user.username.toLowerCase() === lcUser);

        let foundUser = memberCollection.find(myFn);

        // If no exact match, find a user whose nick or username begins with the query
        /*
        if (!foundUser && !strict) {
        myFn = (element) => (element.displayName.toLowerCase().startsWith(lcUser) || element.user.username.toLowerCase().startsWith(lcUser));
        foundUser = memberCollection.find(myFn);
        }
        */
        // If still no match, search by ID
        if (!foundUser)
        foundUser = memberCollection.get(user);

        // If still no match, return message author
        if (!foundUser && !strict)
        foundUser = message.member;

        return foundUser;
    },
    getMention: async function(message, parse=false, getMember = true) {
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
    paginator: async function(message, pager, elements, page = 0, perPage = 1)
    {
        try
        {
            let totalPages = Math.ceil(elements.length / perPage);
            if (totalPages > 1)
            {
                let embed = pager(elements, page, message).setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
                let m = await message.channel.send({embed});
                await m.react("⏪");
                await m.react("⏩");
                let reactions;

                do
                {
                    reactions = await m.awaitReactions(
                    (reaction, user) => (user.id == message.author.id) && ["⏪", "⏩"].includes(reaction.emoji.name),
                    { time: 300000, max: 1 });

                    if (reactions.size > 0)
                    {
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
                for (const [rid, r] of m.reactions.cache)
                {
                    if (!r.me) continue;
                    else r.remove();
                }
            } else await message.channel.send({embed: pager(elements, page, message)});
        } catch(e) { Utils.alertError(e, message); }
    },
    parse: async function(msg) {
        try {
          let prefix = await Utils.prefix(msg);
          let message = msg.content;
          let parse;
            if (msg.author.bot) parse = null;
            else if (message.startsWith(prefix)) parse = message.slice(prefix.length);
            else if (message.startsWith(`<@${msg.client.user.id}>`)) parse = message.slice((`<@${msg.client.user.id}>`).length);
            else if (message.startsWith(`<@!${msg.client.user.id}>`)) parse = message.slice((`<@!${msg.client.user.id}>`).length);
            if (parse) {
                parse = parse.trim().split(" ");
                return {
                command: parse.shift().toLowerCase(),
                suffix: parse.join(" ")
                };
            } else return null;
        } catch(e) {
          Utils.alertError(e, msg);
          return null;
        }
    },
    prefix: async function(msg) {
        try {
            if (msg.guild) return await db.guildconfig.getPrefix(msg.guild.id);
            else return config.prefix;
        } catch(e) {
            console.log(e, msg);
            return config.prefix;
        }
    },
    path: (...segments) => {
        const path = require("path");
        return path.resolve(path.dirname(require.main.filename), ...segments);
    },
    properCase: (txt) => txt.split(" ").map(word => (word[0].toUpperCase() + word.substr(1).toLowerCase())).join(" "),
    
    rand: (array) => array[Math.floor(Math.random() * array.length)],
    
    userMentions: (message, member = false) =>
    {
        // Useful to ensure the bot isn't included in the mention list, such as when the bot mention is the command prefix
        let userMentions = (member ? message.mentions.members : message.mentions.users);
        if (userMentions.has(message.client.user.id)) userMentions.delete(message.client.user.id);

        // Now, if mentions don't exist, run queries until they fail
        /*if (userMentions.size == 0) {
        guildMembers = message.guild.members;
        let parse = message.content.trim().split(" ");
        parse.shift(); // Ditch the command
        do {
            let q = parse.shift(); // Get next potential user/member
            let keepGoing = false;
            try {
            // Query it as a Snowflake first, otherwise search by username
            let mem = (await guildMembers.fetch(q)) || (await guildMembers.fetch({query: q}));
            if (mem instanceof Discord.Collection && mem.size == 1) {
                // Treat a multiple-match search result as a failed search
                mem = mem.first(); // Convert the Collection into a GuildMember
            }
            if (mem instanceof Discord.GuildMember) {
                // Either the Snowflake search worked, or there was exactly one username match
                userMentions.set(mem.id, member ? mem : mem.user);
                keepGoing = true;
            }
            } catch (e) {
            Utils.errorHandler(e, message);
            }
        } while (keepGoing && parse.length > 0);
        }*/
        return userMentions;
    },
    validUrl: (message) =>{
        if(validUrl.isUri(message)) return true
        else return undefined
    },
    botSpam: (message) =>
    {
        if (message.guild && (message.guild.id == config.bobbyGuild) && (message.channel.id != "209046676781006849") && (message.channel.id != config.channels.botspam))
        {
            message.reply(`I've placed your results in <#${config.channels.botspam}> to keep things nice and tidy in here. Hurry before they get cold!`).then(Utils.clean);
            return message.guild.channels.cache.get(config.channels.botspam);
        }
        else return message.channel;
    },    
    errorHandler: function(error, msg = null) {
        if (!error) return;
        console.error(Date());
    
        let embed = Utils.embed().setTitle(error.name);
    
        if (msg instanceof Discord.Message) {
          console.error(`${msg.author.username} in ${(msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "DM")}: ${msg.cleanContent}`);
          const client = msg.client;
          msg.channel.send("I've run into an error. I've let my devs know.")
            .then(Utils.clean);
          embed.addField("User", msg.author.username, true)
            .addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "DM"), true)
            .addField("Command", msg.cleanContent || "`undefined`", true);
        } else if (typeof msg === "string") {
          console.error(msg);
          embed.addField("Message", msg.replace(/\/Users\/bobbythecatfish\/Desktop\//gi, ''));
        }
    
        console.trace(error);
    
        let stack = (error.stack ? error.stack : error.toString());
        if (stack.length > 1024) stack = stack.slice(0, 1000);
    
        embed.addField("Error", stack.replace(/\/Users\/bobbythecatfish\/Desktop\//gi, ''));
        errorLog.send(embed);
    }

    
};

module.exports = Utils;