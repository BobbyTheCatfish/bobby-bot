const { Util, WebhookClient, MessageButton, MessageActionRow, Message, MessageSelectMenu, MessageEmbed } = require("discord.js");
const { GuildMember, GuildChannel, GuildEmoji, Guild, Interaction, CommandInteraction } = require('discord.js');
const discord = require('discord.js');
const config = require("../config/config.json");
const validUrl = require('valid-url');
const jimp = require('jimp');
const errorLog = new WebhookClient({ id: config.error.id, token: config.error.token });
const events = require('events');
const fs = require('fs');
const db = require('./dbModels');
const langFilter = fs.readFileSync('./jsons/naughty.txt', 'utf-8').split('\n');
const em = new events.EventEmitter();
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

  db,
  /** @param {discord.MessageActionRowOptions} data */
  actionRow: (data) => new MessageActionRow(data),
  /** @param {discord.MessageEmbedOptions} data */
  embed: (data) => new MessageEmbed(data).setColor(config.color),
  /** @param {discord.MessageButtonOptions} data */
  button: (data) => new MessageButton(data),
  /** @param {discord.MessageSelectMenuOptions} data */
  selectMenu: (data) => new MessageSelectMenu(data),
  /** @param {[string, any]} data */
  collection: (data) => new discord.Collection(data),
  toEpoch: (date = new Date(), format = 'f') => `<t:${Math.floor(date.getTime() / 1000)}:${format}>`,
  /**
     * Deletes 1 or more messages
     * @param {Message|Message[]} message Message Object(s)
     * @param {number} t Time in ms
     * @returns Message
     */
  clean: async (message, t = 20000) => {
    if (message.length > 1) {
      setTimeout(() => {
        message.forEach(m => {
          if (m.deletable) m.delete();
        });
      }, t, message);
      return Promise.resolve(message);
    } else {
      setTimeout(() => {
        if (message.deletable) message.delete();
      }, t, message);
      return Promise.resolve(message);
    }
  },

  /**
     * @param {error} error error
     * @param {Message|Interaction|CommandInteraction} msg Message Object
     * @returns Handles the error (don't worry about it)
     */
  errorHandler: async (error, msg) => {
    try {
      if (!error || msg?.webhookId || (msg?.author?.bot && msg?.content == `I've run into an error. I've let my devs know.`)) return;
      if (typeof error != Error) error = new Error(error);
      console.error(Date());
      const embed = Utils.embed().setTitle(error.name);
      if (msg instanceof Message) {
        console.error(`${msg.author.username} in ${(msg.guild ? `${msg.guild.name} > ${(msg.channel).name}` : "a DM")}: ${msg.cleanContent}`);
        msg.channel.send("I've run into an error. I've let my devs know.").then(Utils.clean);
        embed.addField("User", msg.author?.username || 'Unknown', true).addField("Location", (msg.guild ? `${msg.guild.name} > ${(msg.channel).name}` : "a DM"), true).addField("Command", msg.cleanContent ?? "`undefined`", true);
      } if (msg instanceof CommandInteraction) {
        msg.client.interactionFailed(msg, "ERROR");
        const subcmd = `/${msg.commandName} ${msg.options.getSubcommand(false) ?? ''}`;
        const options = msg.options.data.map(a => {return { name: a.name ?? "Unknown Name", value: a.value ?? 'Unkonwn Value' };});
        const location = `${msg.guild ? `${msg.guild.name} > ${msg.channel?.name}` : 'a DM'}`;
        console.error(`${msg.user.username} in ${location}: ${subcmd} ${options.map(a => a.value).join(' ')}`);
        embed.addField("User", msg.user?.username ?? "Unknown", true)
          .addField("Location", location, true)
          .addField("Command", subcmd, true)
          .addFields(options);
      } else if (msg instanceof Interaction) {
        const location = `${msg.guild ? `${msg.guild.name} > ${msg.channel?.name}` : 'a DM'}`;
        console.error(`${msg.user.username} in ${location}: ${msg.type}: ${msg.valueOf()}`);
        msg.client.interactionFailed(msg, "ERROR");
        let { type } = msg;
        if (msg.isMessageComponent()) type = msg.componentType;
        embed.addField("User", msg.user.username, true)
                .addField("Location", location, true)
                .addField("Type", type, true)
                .addField("Full interaction", msg.valueOf(), true);
        console.error(`${msg.user.username} in ${location}: ${type}: ${msg.valueOf()}`);
      } else if (typeof msg === "string") {
        console.error(msg);
        embed.addField("Message", msg.replace(/\/Users\/bobbythecatfish\/Downloads\//gi, ''));
      }
      console.trace(error);

      let stack = (error.stack ? error.stack : error.toString());
      if (stack.length > 1024) stack = stack.slice(0, 1000);

      embed.addField("Error", stack.replace(/\/Users\/bobbythecatfish\/Downloads\//gi, ''));
      return errorLog.send({ embeds: [embed] });
    } catch (e) {console.log(e);}
  },

  /**
     *
     * @param {Message} msg
     * @param {string} content
     */
  hasLang: async (msg, content) => {
    const status = 0;// await Utils.db().guildconfig.getLanguageFilter(msg.guild.id)
    if (status == 0) return false;
    let filter;
    if (status == 1) filter = langFilter[0].split(',');
    else if (status == 2) filter = langFilter[1].split(',');
    else filter = langFilter.join(',').split(',');
    const filtered = filter.filter(a => content.includes(a)).filter(a => a.length > 0);
    console.log(filtered);
    if (filtered.length > 0) return filtered;
    else return false;
  },

  /**
     * @param {string} string
     */
  getEmoji: (string) => {
    const parsed = discord.Util.parseEmoji(string);
    if (!parsed?.id) return null;
    parsed.link = `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}`;
    return parsed;
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
  confirmEmbed: async (message, promptEmbed, confirmEmbed, cancelEmbed, timeoutEmbed, time = 300000) => {
    if (!timeoutEmbed) timeoutEmbed = Utils.embed().setTitle('Timed out').setDescription('You ran out of time!');
    const confirmButton = Utils.button().setStyle('SUCCESS').setLabel('Confirm').setCustomId('confirm');
    const cancelButton = Utils.button().setStyle('DANGER').setLabel('Cancel').setCustomId('cancel');
    const buttons = Utils.actionRow().addComponents([confirmButton, cancelButton]);
    let msg;
    if (message instanceof discord.User || message instanceof discord.GuildMember) msg = await message.send({ embeds: [promptEmbed], components: [buttons], allowedMentions: { parse: [] } });
    else msg = await message.reply({ embeds: [promptEmbed], components: [buttons], allowedMentions: { parse: [] } });
    const filter = m => m.user.id == (message.author?.id ?? m.user.id) && m.componentType == 'BUTTON';
    const int = await msg.awaitMessageComponent({ filter, componentType: 'BUTTON', time });
    const status = (int.customId == 'confirm');
    int.reply({ embeds: [status ? confirmEmbed : cancelEmbed], components: [] });
    return status;
  },
  /**
   * @param {discord.CommandInteraction} int MAKE SURE IT'S BEEN REPLIED TO OR DEFERRED
   * @param {string} description
   * @param {string} title
   * @param {number} time
   */
  confirmInt: async (int, description, title, time = 300000) => {
    const reply = (int.deferred || int.replied) ? "editReply" : "reply";
    const confirmButton = Utils.button().setStyle('SUCCESS').setLabel('Confirm').setCustomId(`confirm${int.id}`);
    const cancelButton = Utils.button().setStyle('DANGER').setLabel('Cancel').setCustomId(`cancel${int.id}`);
    const buttons = Utils.actionRow().addComponents([confirmButton, cancelButton]);

    const embed = Utils.embed({ author: int.member ?? int.user })
      .setColor(0xff0000)
      .setTitle(title)
      .setDescription(description);
    await int[reply]({ embeds: [embed], components: [buttons], ephemeral: true, content: null, allowedMentions: { parse: [] } });
    const filter = m => m.user.id == (int.user.id) && m.customId.includes(int.id);
    const res = await int.channel.awaitMessageComponent({ filter, componentType: 'BUTTON', time }).catch(() => {return null;});
    const status = (res.customId == `confirm${int.id}`);
    await res.reply({ content: status ? "Confirmed" : "Canceled", components: [], ephemeral: true });
    return status;
  },
  /** @param {discord.ModalOptions} data */
  modal: (data) => new discord.Modal(data),
  /** @param {discord.TextInputComponentOptions} data */
  textInput: (data) => new discord.TextInputComponent(data),
  blocked: (member, logs, extra) => logs.send({ embeds: [
    Utils.embed().setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
      .setDescription(extra ?? null)
      .setColor(0x00ffff)
      .setTitle(`${member.displayName} has me blocked. *sadface*`)
  ] }),
  /**
     *
     * @param {Message} msg
     * @param {Message|Interaction} initMessage
     * @param {discord.MessageActionRow[]} actionRows
     * @returns {Promise<discord.MessageComponentInteraction>}
     */
  awaitButton: async (msg, initMessage, time = 5000 * 60) => {
    const filter = m => m.user.id == (initMessage.user ?? initMessage.author)?.id;
    try {
      const int = await msg.awaitMessageComponent({ filter: filter, componentType: 'BUTTON', time: time });
      return int;
    } catch (e) {
      if (e.stack.includes('ending with reason: time')) return { customId: 'time' };
      else return Utils.errorHandler(e, msg);
    }
  },
  /**
   *
   * @param {Interaction} msg
   * @param {discord.AwaitMessageCollectorOptionsParams} options
   * @returns {Promise<discord.Collection<string, Message> | null>}
   */
  awaitMessage: async (msg, options) => {
    if (!options?.filter) options.filter = m => m.author.id == (msg.user ?? msg.author)?.id;
    try {
      const messages = await msg.channel.awaitMessages(options);
      return messages;
    } catch (e) {
      if (e.stack.includes('ending with reason: time')) return null;
      else return Utils.errorHandler(e, msg);
    }
  },
  escape: (text, options = {}) => Util.escapeMarkdown(text, options),

  escapeText: (txt) => txt.replace(/(\*|_|`|~|\\|\|)/g, '\\$1'),
  rand: (array) => array[Math.floor(Math.random() * array.length)],

  /**
     * Kinda borked, I wouldnt use tbh
     */
  getMention: async (message, parse = '', getMember = true) => {
    try {
      message;
      if (!parse) {
        const { suffix } = await Utils.parse(message);
        if (message.guild) {
          const memberMentions = message.mentions.members;
          if (memberMentions.size > 0) {
            return (getMember ? memberMentions.first() : memberMentions.first().user);
          } else if (suffix) {
            const member = (await message.guild.members.fetch({ query: suffix })).first();
            if (member) return (getMember ? member : member.user);
            else return getMember ? message.member : message.author;
          } else {return (getMember ? message.member : message.author);}
        } else {
          const userMentions = message.mentions.users;
          return userMentions.first() || message.author;
        }
      } else if (message.guild) {
        const memberMentions = message.mentions.members;
        if (memberMentions.size > 0) {
          return (getMember ? memberMentions.first() : memberMentions.first().user);
        } else if (parse) {
          const member = (await message.guild.members.fetch({ query: parse })).first();
          if (member) return (getMember ? member : member.user);
          else return getMember ? message.member : message.author;
        } else {return getMember ? message.member : message.author;}
      }
    } catch (error) {return null;}
  },

  /**
     * @param {string} str String to find mentions in
     * @returns {{targets: GuildMember[], reason: string}} Guild members
     */
  parseTargets: (msg, str) => {
    const regex = /(<@!?\d+>)/g;
    const list = str.split(regex).filter(a => !['', ' '].includes(a));
    const targets = [];
    for (const x of list) {
      if (!x.match(regex)) break;
      else targets.push(x);
    }
    const reason = list.slice(targets.length).join('');
    targets.map(a => msg.guild.members.cache.get(a));
    return { targets, reason };
  },

  /**
     * @param {Message} msg Message Object
     * @returns {Promise<string>} Prefix
     */
  prefix: async (msg) => {
    try {
      if (msg.channel?.parentId == '813847559252344862') return '>';
      else if (msg.guild) return await Utils.db.guildconfig.getPrefix(msg.guild.id);
      else return config.prefix;
    } catch (e) {
      Utils.errorHandler(e, msg.content);
      return config.prefix;
    }
  },

  /**
     * @param {Message} msg Message Object
     * @returns {Promise<{command: string, suffix:string, params: []}>} Parsed message content
     */
  parse: async (msg) => {
    try {
      const prefix = await Utils.prefix(msg),
        message = msg.content;
      let parse;
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
      } else {return null;}
    } catch (e) {
      Utils.errorHandler(e, msg);
      return null;
    }
  },

  /**
     * @param {...string} segments
     * @returns {Promise<string>} idk the path? i've never used this before
     */
  path: async (...segments) => {
    const path = require("path");
    return path.resolve(path.dirname(require.main.filename), ...segments);
  },

  /**
     * @param {string} txt Text to put into proper case
     * @param {boolean} replace Replace _ with spaces
     * @returns {string} Proper case string
     */
  properCase: (txt, replace = false) => {
    if (!txt) return txt;
    if (replace) txt = txt.replace(/_/g, ' ');
    return txt.split(" ").map(word => (word[0].toUpperCase() + word.substr(1).toLowerCase())).join(" ");
  },

  /**
     * Kidna pointless but helps in low-traffic scenarios
     * @param {Message} message Message Object
     * @param {string} reactions Reaction ID/name
     * @returns {Promise<null>}
     */
  react: async (message, reactions) => {
    let i = 0;
    const x = setInterval(() => {
      message.react(reactions[i]);
      i++;
      if (i == reactions.length) clearInterval(x);
    }, 1500);
    return null;
  },

  /**
     * @param {Message} msg Message to reply to
     * @param {string} content What to reply with
     * @param {boolean} clean Use u.clean or not
     * @param {boolean} mention Mention the user
     */
  reply: async (msg, content, clean = false, mention = false,) => {
    if (!msg) return Utils.errorHandler(new Error('u.reply needs a message object'), `Reply content: ${content}`);
    else msg.reply({ content, allowedMentions: { repliedUser: mention }, failIfNotExists: false }).then(m => {if (clean) Utils.clean(m);});
  },

  /**
     * @param {string} txt text to verify
     * @returns {boolean} is link or not
     */
  validUrl: (txt) => {
    return validUrl.isWebUri(txt);
  },

  /**
     * @param {string} image Image URL
     * @returns {Promise<jimp>} is image or not
     */
  validImage: async (image) => {
    try {
      const img = await jimp.read(image);
      // if (img.bitmap.data.byteLength >= 7500000) return null;
      return img;
    } catch {
      return false;
    }
  },

  /**
     * @param {Message} msg Message Object
     * @returns {Promise<GuildChannel>} Botspam or current channel
     */
  botSpam: async (msg) => {
    if (!msg.guild) return msg.channel;
    const channel = await Utils.db.guildconfig.getBotLobby(msg.guild.id);
    return msg.client.channels.cache.get(channel) ?? msg.channel;
  },

  /**
     * @param {Guild} guild Message Object
     * @returns {Promise<GuildChannel>} error channel or current channel
     */
  errorChannel: async (guild) => {
    if (!guild) return null;
    const channel = await Utils.db.guildconfig.getErrorChannel(guild.id);
    return guild.channels.cache.get(channel) ?? null;
  },

  /**
     * @param {{category: string, int: number}[]} flags Array of flag categories and ints
     * @returns {number} encoded number
     */
  encodeLogEvents: (flags) => {
    const reduce = function(fl) {
      const numbers = fl.map(f => f.int);
      let reduced = numbers.length > 1 ? numbers.reduce(function(a, b) {return a + b;}) : numbers;
      if (numbers.length > 1) reduced++;
      return reduced.toString();
    };
    const channel = reduce(flags.filter(f => f.category == 'channel'));
    const message = reduce(flags.filter(f => f.category == 'message'));
    const emoji = reduce(flags.filter(f => f.category == 'emoji'));
    const member = reduce(flags.filter(f => f.category == 'member'));
    const other = reduce(flags.filter(f => f.category == 'other'));
    const server = reduce(flags.filter(f => f.category == 'server'));
    const role = reduce(flags.filter(f => f.category == 'role'));
    return channel + message + emoji + member + other + server + role;
  },

  /**
     * @param {Guild} guild Guild Object
     * @returns {Promise<string[]>} Array of flag names
     */
  decodeLogEvents: async (guild) => {
    const eventList = require('../jsons/events.json').events;
    const decrypt = function(int, category) {
      const filtered = eventList.filter(f => f[2] == category);
      if (int == 0) return [];
      if (int == 7) return filtered.map(f => f[0]);
      if (int <= 3) return filtered.find(f => f[1] == int)[0];
      if (int == 4) return filtered.filter(f => f[1] == 1 || f[1] == 2).map(f => f[0]);
      if (int == 5) return filtered.filter(f => f[1] == 1 || f[1] == 3).map(f => f[0]);
      if (int == 6) return filtered.filter(f => f[1] == 2 || f[1] == 3).map(f => f[0]);
    };
    const bytefield = await Utils.db.guildconfig.getLogFlags(guild.id);
    if (!bytefield) return [];
    const channel = decrypt(bytefield[0], 'channel');
    const message = decrypt(bytefield[1], 'message');
    const emoji = decrypt(bytefield[2], 'emoji');
    const member = decrypt(bytefield[3], 'member');
    const other = decrypt(bytefield[4], 'other');
    const server = decrypt(bytefield[5], 'server');
    const role = decrypt(bytefield[6], 'role');
    return channel.concat(message, emoji, member, other, server, role);
  },
  noop: () => null
};

module.exports = Utils;