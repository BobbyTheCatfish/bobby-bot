const { escapeMarkdown, parseEmoji, WebhookClient, ButtonBuilder, ActionRowBuilder, Message, SelectMenuBuilder, EmbedBuilder, Embed } = require("discord.js");
const { GuildChannel, BaseInteraction, CommandInteraction, ButtonStyle } = require('discord.js');
const discord = require('discord.js');
const config = require("../config/config.json");
const validUrl = require('valid-url');
const jimp = require('jimp');
const errorLog = new WebhookClient({ id: config.error.id, token: config.error.token });
const db = require('./dbModels');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const lang = require('../jsons/badwords.json');
const sites = require('../jsons/blockedsites.json');

const Utils = {
  db,
  lowdb: (filePath) => low(new FileSync(filePath)),

  /** @param {discord.EmbedData} data */
  embed: (data) => {
    if (data?.author) {
      if (data.author instanceof discord.GuildMember) data.author = { name: data.author.displayName, iconURL: data.author.displayAvatarURL() };
      else if (data.author instanceof discord.User) data.author = { name: data.author.displayName, iconURL: data.author.displayAvatarURL() };
    }
    return new EmbedBuilder(data).setColor(data?.color ?? config.color).setTimestamp(data?.timestamp ?? new Date());
  },

  /** @param {discord.ActionRowData} data */
  actionRow: (data) => new ActionRowBuilder(data),
  /** @param {discord.ButtonComponentData} data */
  button: (data) => new ButtonBuilder(data),
  /** @param {discord.SelectMenuComponentData} data */
  selectMenu: (data) => new SelectMenuBuilder(data),
  /** @param {[string, any]} data */
  collection: (data) => new discord.Collection(data),
  /** @param {discord.ModalComponentData} data */
  modal: (data) => new discord.ModalBuilder(data),
  /** @param {discord.APITextInputComponent} data */
  textInput: (data) => new discord.TextInputBuilder(data),

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
          if (m.deletable) m.delete().catch(() => Utils.noop());
        });
      }, t, message);
      return Promise.resolve(message);
    } else {
      setTimeout(() => {
        if (message.deletable) message.delete().catch(() => Utils.noop());
      }, t, message);
      return Promise.resolve(message);
    }
  },

  /**
   * @param {Error} error error
   * @param {Message|BaseInteraction|CommandInteraction} msg Message Object
   * @returns Handles the error (don't worry about it)
   */
  errorHandler: async (error, msg) => {
    try {
      if (!error || msg?.webhookId || (msg?.author?.bot && msg?.content == `I've run into an error. I've let my devs know.`)) return;
      if (!error || (error.name === "AbortError")) return;

      console.error(Date());

      const embed = Utils.embed().setTitle(error?.name?.toString() ?? "Error");

      if (msg instanceof discord.Message) {
        const loc = (msg.guild ? `${msg.guild?.name} > ${msg.channel?.name}` : "DM");
        console.error(`${msg.author.username} in ${loc}: ${msg.cleanContent}`);

        msg.channel.send("I've run into an error. I've let my devs know.")
        .then(Utils.clean);
        embed.addFields([
          { name: "User", value: msg.author.username, inline: true },
          { name: "Location", value: loc, inline: true },
          { name: "Command", value: msg.cleanContent || "`undefined`", inline: true }
        ]);
      } else if (msg?.type == discord.InteractionType) {
        const loc = (msg.guild ? `${msg.guild?.name} > ${msg.channel?.name}` : "DM");
        console.error(`Interaction by ${msg.user.username} in ${loc}`);

        msg[((msg.deferred || msg.replied) ? "editReply" : "reply")]({ content: "I've run into an error. I've let my devs know.", ephemeral: true }).catch(Utils.noop);
        embed.addFields([
          { name: "User", value: msg.user?.username, inline: true },
          { name: "Location", value: loc, inline: true }
        ]);

        const descriptionLines = [msg.commandId || msg.customId || "`undefined`"];
        const { command, data } = Utils.parseInteraction(msg);
        descriptionLines.push(command);
        for (const datum of data) {
          descriptionLines.push(`${datum.name}: ${datum.value}`);
        }
        embed.addFields({ name: "Interaction", value: descriptionLines.join("\n") });
      } else if (typeof msg === "string") {
        console.error(msg);
        embed.addFields({ name: "Message", value: msg });
      }

      console.trace(error);

      let stack = (error.stack ? error.stack : error.toString());
      if (stack.length > 4096) stack = stack.slice(0, 4000);

      embed.setDescription(stack);
      return errorLog.send({ embeds: [embed] });
    } catch (e) {console.log(e.stack ?? e);}
  },

  harshFilter: (str) => {
    return lang.find(l => str.includes(l));
  },

  siteFilter: (str) => {
    for (const category in sites) {
      const site = sites[category].find(c => str.includes(c));
      if (site) return { category, site };
    }
  },

  /**
   * @param {string} string
   */
  getEmoji: (string) => {
    const parsed = parseEmoji(string);
    if (!parsed?.id) return null;
    parsed.link = `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? 'gif' : 'png'}`;
    return parsed;
  },

  /**
   * @param {Message} message Message Object
   * @param {Embed}promptEmbed Initial embed to send
   * @param {Embed}confirmEmbed Embed to send if the user reacts with ✅
   * @param {Embed}cancelEmbed Embed to send if the user reacts with 🛑
   * @param {Embed}timeoutEmbed Embed to send if the user runs out of time
   * @param {number} time Time in ms
   * @returns {boolean|null}
   */
  confirmEmbed: async (message, promptEmbed, confirmEmbed, cancelEmbed, timeoutEmbed, time = 300000) => {
    if (!timeoutEmbed) timeoutEmbed = Utils.embed().setTitle('Timed out').setDescription('You ran out of time!');
    const confirmButton = Utils.button().setStyle(ButtonStyle.Success).setLabel('Confirm').setCustomId('confirm');
    const cancelButton = Utils.button().setStyle(ButtonStyle.Danger).setLabel('Cancel').setCustomId('cancel');
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
    const confirmButton = Utils.button().setStyle(ButtonStyle.Success).setLabel('Confirm').setCustomId(`confirm${int.id}`);
    const cancelButton = Utils.button().setStyle(ButtonStyle.Danger).setLabel('Cancel').setCustomId(`cancel${int.id}`);
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

  blocked: (member, logs, extra) => logs.send({ embeds: [
    Utils.embed().setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
      .setDescription(extra ?? null)
      .setColor(0x00ffff)
      .setTitle(`${member.displayName} has me blocked. *sadface*`)
  ] }),

  /**
   *
   * @param {Message} msg
   * @param {Message|BaseInteraction} initMessage
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
   * @param {BaseInteraction} msg
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

  escape: (text, options = {}) => escapeMarkdown(text, options),
  escapeText: (txt) => txt.replace(/(\*|_|`|~|\\|\|)/g, '\\$1'),
  rand: (array) => array[Math.floor(Math.random() * array.length)],

  /**
   * @param {Message} msg Message Object
   * @returns {Promise<string>} Prefix
   */
  prefix: async (msg) => {
    try {
      if (msg.channel?.parent?.id == '813847559252344862') return '>';
      else if (msg.guild) return await Utils.db.guildConfig.prefix.get(msg.guild.id);
      else return config.prefix;
    } catch (e) {
      Utils.errorHandler(e, msg.content);
      return config.prefix;
    }
  },

  /**
   * @param {Message} msg Message Object
   * @returns {Promise<{command: string, suffix: string, params: []}>} Parsed message content
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
   * @param {Message} msg Message to reply to
   * @param {string} content What to reply with
   * @param {boolean} clean Use u.clean or not
   * @param {boolean} mention Mention the user
   */
  reply: async (msg, content, clean = false, mention = false,) => {
    if (!msg) return Utils.errorHandler(new Error('u.reply needs a message object'), `Reply content: ${content}`);
    else msg.reply({ content, allowedMentions: { repliedUser: mention }, failIfNotExists: false }).then(m => {if (clean) Utils.clean(m);});
  },

  validUrl: (txt) => validUrl.isWebUri(txt),

  /**
   * @param {string} image Image URL
   * @param {boolean} size Determine if file size is > 7.5MB
   * @param {boolean} resize Whether or not to resize large images to 256p max
   * @returns {Promise<jimp|null>} is image or not
   */
  validImage: async (image, size = true, resize = true) => {
    try {
      const img = await jimp.read(image);
      if (size && img.bitmap.data.byteLength >= 7500000) return null;

      // resize large images so that the largest dimension is 256p
      if (resize && img.getWidth() > 256 || img.getHeight() > 256) {
        const w = img.getWidth(), h = img.getHeight();
        const largest = Math.max(w, h);
        img.resize(w == largest ? 256 : jimp.AUTO, w == largest ? jimp.AUTO : 256);
      }
      return img;
    } catch {
      return null;
    }
  },

  /**
   * @param {Message} msg Message Object
   * @returns {Promise<GuildChannel>} Botspam or current channel
   */
  botSpam: async (msg) => {
    if (!msg.guild) return msg.channel;
    const channel = await Utils.db.guildConfig.snowflakes.getChannel(msg.guild.id, 'botLobby');
    return msg.client.channels.cache.get(channel) ?? msg.channel;
  },

  noop: () => null
};

module.exports = Utils;