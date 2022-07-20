const GuildConfig = require('../schemas/guildconfig');
const Tags = require('../schemas/tags');
const rRoles = require('../schemas/reactionRoles');
const Ranks = require('../schemas/ranks');
const Infractions = require("../schemas/infractions");
const mongoose = require('mongoose');
const config = require('../config/config.json');
const converter = require('fast-b64');
// const { Module } = require('augurbot');
mongoose.connect(config.db.db, config.db.settings);
const models = {
  guildconfig: {
    createConfig: async (guildId, commands = []) => {
      if (!await GuildConfig.exists({ guildId })) GuildConfig.create({ guildId, commands: converter.bitstobase64(commands.map(() => '1').join('')) });
      else return null;
    },
    getConfig: async (guildId) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        if (document) return document;
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    getAllConfigs: async () => {
      return await GuildConfig.find().exec();
    },
    getPrefix: async (guildId) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        if (document) return document.prefix;
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    savePrefix: async (guildId, prefix) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) return await GuildConfig.findOneAndUpdate({ guildId }, { prefix }, { new: true });
      else throw new Error(`No guildconfig for guild ${guildId}`);
    },
    saveChannel: async (guildId, channel, channelType) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) return GuildConfig.findOneAndUpdate({ guildId }, { [`channels.${channelType}`]: channel }, { new: true });
      else throw new Error(`No guildconfig for guild ${guildId}`);
    },
    getChannel: async (guildId, channelType) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        const channel = document?.channels?.[channelType];
        if (channel) return channel;
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    getRole: async (guildId, roleType) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        const role = document?.roles?.[roleType];
        if (role) return role;
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    saveRole: async (guildId, role, roleType) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) return GuildConfig.findOneAndUpdate({ guildId }, { [`roles.${roleType}`]: role }, { new: true });
      else throw new Error(`No guildconfig for guild ${guildId}`);
    },
    getStarBoards: async (guildId) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document?.channels?.starboards;
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    /**
     * @typedef StarBoard
     * @property {string} channel
     * @property {string[]} reactions
     * @property {string[]} whitelist
     * @property {number} toPost
     * @param {StarBoard} theBoard
     */
    saveStarBoard: async (guildId, theBoard) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId });
        const board = document?.channels?.starboards?.find(c => c.channel == theBoard.channel);
        if (board) return GuildConfig.findOneAndUpdate({ guildId, 'channels.starboards.channel': theBoard.channel }, { $set: { 'channels.starboards.$.channel': theBoard.channel, 'channels.starboards.$.reactions': theBoard.reactions, 'channels.starboards.$.whitelist': theBoard.whitelist, 'channels.starboards.$.toPost': theBoard.toPost } });
        else return GuildConfig.updateOne({ guildId }, { $push: { 'channels.starboards': theBoard } });
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    removeStarBoard: async (guildId, channel) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = await GuildConfig.findOne({ guildId });
        const board = document?.channels?.starboards?.find(c => c.channel == channel);
        if (board) return GuildConfig.findOneAndUpdate({ guildId, 'channels.starboards.channel': channel }, { $pull: { channel } }, { new: true });
      }
    },
    getLangFilter: async (guildId) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) {
        const document = GuildConfig.findOne({ guildId }).exec();
        return document?.filter;
      } else {throw new Error(`No guildconfig for guild ${guildId}`);}
    },
    saveLangFilter: async (guildId, status) => {
      await models.guildconfig.createConfig(guildId);
      if (await GuildConfig.exists({ guildId })) return GuildConfig.findOneAndUpdate({ guildId }, { filter: status }, { new: true });
      else throw new Error(`No guildconfig for guild ${guildId}`);
    }
  },
  infraction: {
    addGuild: async (guildId) => {
      if (!await Infractions.exists({ guildId })) return Infractions.create({ guildId, infractions: [] });
      else return null;
    },
    getByFlag: async (guildId, flag) => {
      await models.infraction.addGuild(guildId);
      const document = await Infractions.findOne({ guildId }).exec();
      return document?.infractions.find(d => d.flag == flag);
    },
    getSummary: async (guildId, discordId, time = 90) => {
      const since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
      await models.infraction.addGuild(guildId);
      const document = await Infractions.findOne({ guildId });
      if (!document) return null;
      const records = document.infractions.filter(i => i.discordId == discordId && i.timestamp >= since);
      if (!records) return { time };
      return {
        discordId,
        count: records.length,
        points: records.reduce((c, r) => c + r.value, 0),
        time,
        detail: records
      };
    },
    remove: async (guildId, flag) => {
      const newDoc = Infractions.findOneAndUpdate({ guildId, 'infractions.$.flag': flag }, { $pull: { flag } }, { new: true }).exec();
      return newDoc?.infractions;
    },
    save: async (guildId, infraction) => {
      infraction.timestamp = new Date();
      await models.infraction.addGuild(guildId);
      const newDoc = await Infractions.findOneAndUpdate({ guildId }, { $push: { 'infractions': infraction } }, { new: true })?.exec();
      return newDoc?.infractions;
    },
    update: async (guildId, flag, infraction) => {
      await models.infraction.addGuild(guildId);
      const newDoc = await Infractions.findOne({ guildId, 'infractions.$.flag': flag }, { 'infractions.$': infraction }, { new: true });
      return newDoc?.infractions[0];
    }
  },
  tags: {
    getTag: async (guildId, name) => {
      const document = await Tags.findOne({ guildId })?.exec();
      return document?.tags?.find(t => t.name == name);
    },
    getGlobalTag: async (name) => {
      /** @type {{tags: [{name: string, time: Date}]}[]} */
      const document = await Tags.find({ global: true })?.exec();
      return document?.map(a => a.tags)?.flat()?.filter(t => t.name == name)?.sort((a, b) => a.time - b.time)[0];
    },
    getAllTags: async (guildId) => {
      const document = await Tags.findOne({ guildId })?.exec();
      return document?.tags;
    },
    getAllGlobalTags: async () => {
      const document = await Tags.find({ global: true })?.exec();
      const filtered = document?.map(a => a.tags)?.flat()?.sort((a, b) => a.time - b.time).filter((v, i, a) => a.map(b => b.name).indexOf(v.name) == i);
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },
    saveTag: async (guildId, name, text, file) => {
      const document = await Tags.findOne({ guildId })?.exec();
      const time = Date.now();
      if (document) {
        const tag = document.tags.find(t => t.name == name);
        if (tag) return Tags.updateOne({ guildId, "tags.name": name }, { $set: { "tags.$.text": text, "tags.$.file": file } });
        else return Tags.updateOne({ guildId }, { $push: { tags: { name, text, file, time } } });
      } else {return Tags.create({ guildId, tags: [{ name, text, file, time }] });}
    },
    removeTag: async (guildId, name) => {
      const document = await Tags.findOne({ guildId })?.exec();
      if (document) {
        const tag = document?.tags.find(t => t.name == name);
        if (tag) return Tags.findOneAndUpdate({ guildId }, { $pull: { "tags": { name } } });
      }
      return null;
    },
    // addTimestamps: async(guildId, name) =>{
    //    return await Tags.updateMany({tags: {$gte: {$size: 1}}}, {$set: {"tags.$[].time": Date.now()}})
    // },
    globalStatus: async (guildId) => {
      const document = await Tags.findOne({ guildId })?.exec();
      return document?.global;
    },
    setGlobal: async (guildId) => {
      if (!await Tags.exists({ guildId })) await Tags.create({ guildId, tags: [] });
      const document = await Tags.findOne({ guildId })?.exec();
      if (document) {
        await Tags.updateOne({ guildId }, { global: true });
      } else {
        throw new Error(`No tag document for guild ${guildId}`);
      }
    },
    setLocal: async (guildId) => {
      if (!await Tags.exists({ guildId })) await Tags.create({ guildId, tags: [] });
      const document = await Tags.findOne({ guildId })?.exec();
      if (document) {
        await Tags.updateOne({ guildId }, { global: false });
      } else {
        throw new Error(`No tag document for guild ${guildId}`);
      }
    },
  },
  welcome: {
    getWelcome: async (guildId) => {
      await models.guildconfig.createConfig(guildId);
      const document = await GuildConfig.findOne({ guildId })?.exec();
      if (document) return document.welcome;
      else throw new Error(`No guildconfig for guild ${guildId}`);
    },
    saveWelcome: async (guildId, channel, roles, emoji, ruleChannel, custom) => {
      await models.guildconfig.createConfig(guildId);
      if (GuildConfig.exists({ guildId })) return GuildConfig.findOneAndUpdate({ guildId }, { welcome: { enabled: true, channel, emoji, roles, ruleChannel, custom } }, { new: true });
      else throw new Error(`No guildconfig for guild ${guildId}`);
    },
    disableWelcome: async (guildId) => {return GuildConfig.findOneAndUpdate({ guildId }, { 'welcome.enabled': false });}
  },
  reactionRoles: {
    getReactionRole: async (messageId) => {
      return await rRoles.find({ messageId })?.exec();
    },
    getAllReactionRoles: async () => {
      return await rRoles.find()?.exec();
    },
    getGuildReactionRole: async (guildId) => {
      return await rRoles.find({ guildId })?.exec();
    },
    saveReactionRoles: async (msg, reactions, removeOnUnreact) => {
      const document = rRoles.findOne({ guildId: msg.guild.id })?.exec();
      if (document) return rRoles.findOneAndUpdate({ guildId: msg.guild.id }, { messageId: msg.id, channelId: msg.channel.id, reactions, removeOnUnreact }, { new: true });
      return rRoles.create({ guildId: msg.guild.id, channelId: msg.channel.id, messageId: msg.id, reactions, removeOnUnreact });
    },
    removeReactionRoles: async (messageId) => {
      const document = await rRoles.find({ messageId })?.exec();
      return document ? rRoles.findOneAndDelete({ messageId }) : null;
    },
    getRemoveableRoles: async (messageId) => {
      const document = await rRoles.find({ removeOnUnreact: true })?.exec();
      return document.find(r => r.messageId == messageId);
    }
  },
  ranks: {
    addGuild: async (guildId) => {
      if (!await Ranks.exists({ guildId })) {
        await Ranks.create({ guildId, exclude: { channels: [], roles: [] }, users: [], roles: [], enabled: true, rate: 2 });
        return await Ranks.findOne({ guildId })?.exec();
      } else {
        return null;
      }
    },
    addUser: async (guildId, userId) => {
      if (Array.isArray(userId)) {
        await models.ranks.addGuild(guildId);
        const document = await Ranks.findOne({ guildId })?.exec();
        const users = userId.filter(u => !document.users.find(d => d.userId == u));
        const mapped = users.map(u => {return { userId: u, xp: 0, lifeXP: 0, excludeXP: false, posts: 0 };});
        if (mapped.length > 0) return await Ranks.findOneAndUpdate({ guildId }, { $push: { 'users': { $each: mapped } } }, { new: true })?.exec();
        else return null;
      }
      if (!await Ranks.exists({ guildId, 'users.$.userId': userId })) return await Ranks.findOneAndUpdate({ guildId }, { $push: { 'users': { userId, xp: 0, lifeXP: 0, excludeXP: false, posts: 0 } } }, { new: true })?.exec();
      else return null;
    },
    getRank: async (guildId, userId) => {
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      const user = document.users.find(u => u.userId == userId);
      if (user) return user;
      else return await models.ranks.addUser(guildId, userId);
    },
    getAllRanks: async (guildId) => {
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      return document;
    },
    getAllDocuments: async () => {
      return await Ranks.find()?.exec();
    },
    gStatusToggle: async (guildId, status = true) => {
      if (status) await models.ranks.addGuild(guildId);
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      return await Ranks.findOneAndUpdate({ guildId }, { enabled: status }, { new: true })?.exec();
    },
    addXP: async (active, xp, lifeXP) => {
      const guilds = [];
      xp ??= Math.floor(Math.random() * 11) + 15;
      lifeXP ??= xp;
      for (const [guild, users] of active) {
        guilds.push({ guild, users });
      }
      const response = { guilds: [], xp: 0 };
      if (active.size == 0) return response;
      response.xp = xp;
      let i = 0;
      do {
        const guild = guilds[i];
        if (guild.users.length > 0) {
          await models.ranks.addUser(guild.guild, guild.users);
          await Ranks.findOneAndUpdate({ guildId: guild.guild, 'users.userId': { $in: guild.users } }, { $inc: { 'users.$.posts': 1 } }).exec();
          await Ranks.findOneAndUpdate({ guildId: guild.guild, 'users.userId': { $in: guild.users } }, { $inc: { 'users.$.xp': xp, 'users.$.lifeXP': lifeXP } }).exec();
          const userDocs = await Ranks.findOne({ guildId: guild.guild }).exec();
          userDocs.users = userDocs?.users.filter(u => guild.users.includes(u.userId));
          response.guilds.push(userDocs);
        }
        i++;
      } while (i < guilds.length);
      return response;
    },
    updateRank: async (guildId, userId, xp, lifeXP, posts) => {
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      const user = document.users.find(u => u.userId == userId);
      if (user) return await Ranks.findOneAndUpdate({ guildId, 'users.userId': userId }, { $set: { 'users.$.xp': xp, 'users.$.lifeXP': lifeXP, 'users.$.posts': posts } }, { new: true })?.exec();
      else return await Ranks.findOneAndUpdate({ guildId }, { $push: { 'users': { userId, xp, lifeXP, posts } } }, { new: true })?.exec();
    },
    resetRanks: async (guildId) => {
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      return Ranks.findOneAndUpdate({ guildId }, { $set: { 'users.$[].xp': 0 } }, { new: true });
    },
    opt: async (guildId, userId, excludeXP) => {
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      const user = document.users.find(u => u.userId == userId);
      if (user) return await Ranks.findOneAndUpdate({ guildId, 'users.userId': userId }, { $set: { 'users.$.excludeXP': excludeXP } }, { new: true })?.exec();
      else return await Ranks.findOneAndUpdate({ guildId }, { $push: { 'users': { userId, excludeXP } } }, { new: true })?.exec();
    },
    configGuild: async (guildId, newDoc) => {
      await models.ranks.addGuild(guildId);
      const document = await Ranks.findOne({ guildId })?.exec();
      if (!document) return null;
      const updated = await Ranks.findOneAndUpdate({ guildId }, newDoc, { new: true })?.exec();
      return updated;
    }
  },
};

module.exports = models;