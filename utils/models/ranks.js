const Ranks = require('../../schemas/ranks');

/**
 * @typedef exclude
 * @prop {string[]} channels
 * @prop {string[]} roles
 *
 * @typedef user
 * @prop {string} userId
 * @prop {number} xp
 * @prop {number} lifeXP
 * @prop {boolean} excludeXP
 * @prop {number} posts
 *
 * @typedef reward
 * @prop {string} id
 * @prop {number} level
 *
 * @typedef Schema
 * @prop {string} guildId
 * @prop {exclude} exclude
 * @prop {user[]} users
 * @prop {reward[]} roles
 * @prop {boolean} enabled
 * @prop {number} rate
 */
async function existsCheck(guildId, userId) {
  if (userId) {
    await model.addUser(guildId, userId);
    if (!await Ranks.exists({ userId })) throw new Error(`No user rank schema for ${userId} in ${guildId}`);
    else return true;
  }
  await model.addGuild(guildId);
  if (await Ranks.exists({ guildId })) return true;
  else throw new Error(`No rank schema for guild ${guildId}`);
}
const model = {
  /** @returns {Promise<Schema?>} */
  addGuild: async (guildId) => {
    const defaultRank = { guildId, exclude: { channels: [], roles: [] }, users: [], roles: [], enabled: true, rate: 2 };
    if (!await Ranks.exists({ guildId })) return await Ranks.create(defaultRank);
    else return null;
  },
  /** @returns {Promise<Schema?>} */
  addUser: async (guildId, userId) => {
    if (await existsCheck(guildId)) {
      if (Array.isArray(userId)) {
        const document = await Ranks.findOne({ guildId })?.exec();
        const users = userId.filter(u => !document.users.find(d => d.userId == u));
        const mapped = users.map(u => {return { userId: u, xp: 0, lifeXP: 0, excludeXP: false, posts: 0 };});
        if (mapped.length > 0) return await Ranks.findOneAndUpdate({ guildId }, { $push: { 'users': { $each: mapped } } }, { new: true })?.exec();
        else return null;
      }
      if (!await Ranks.exists({ guildId, 'users.$.userId': userId })) return await Ranks.findOneAndUpdate({ guildId }, { $push: { 'users': { userId, xp: 0, lifeXP: 0, excludeXP: false, posts: 0 } } }, { new: true })?.exec();
      else return null;
    }
  },
  /** @returns {Promise<Schema>} */
  getRank: async (guildId, userId) => {
    if (await existsCheck(guildId, userId)) {
      const document = await Ranks.findOne({ guildId })?.exec();
      return document.users.find(u => u.userId == userId);
    }
  },
  /** @returns {Promise<user[]>} */
  getGuild: async (guildId) => {
    if (await existsCheck(guildId)) {
      const document = await Ranks.findOne({ guildId })?.exec();
      return document;
    }
  },
  /** @returns {Promise<Schema[]>} */
  getAllDocuments: async () => {
    return await Ranks.find()?.exec();
  },
  /** @returns {Promise<Schema?>} */
  gStatusToggle: async (guildId, status = true) => {
    if (!status || await existsCheck(guildId)) {
      if (!await Ranks.findOne({ guildId })?.exec()) return null;
      return await Ranks.findOneAndUpdate({ guildId }, { enabled: status }, { new: true })?.exec();
    }
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
      if (guild.users.length > 0 && await existsCheck(guild.guild)) {
        await model.addUser(guild.guild, guild.users);
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
  /** @returns {Promise<Schema>} */
  updateRank: async (guildId, userId, xp, lifeXP, posts) => {
    if (await existsCheck(guildId, userId)) return await Ranks.findOneAndUpdate({ guildId, 'users.userId': userId }, { $set: { 'users.$': { xp, lifeXP, posts } } }, { new: true })?.exec();
  },
  /** @returns {Promise<Schema>} */
  resetRanks: async (guildId) => {
    if (await existsCheck(guildId)) return Ranks.findOneAndUpdate({ guildId }, { $set: { 'users.$[].xp': 0 } }, { new: true });
  },
  /** @returns {Promise<Schema>} */
  opt: async (guildId, userId, excludeXP) => {
    if (await existsCheck(guildId, userId)) return await Ranks.findOneAndUpdate({ guildId, 'users.userId': userId }, { $set: { 'users.$.excludeXP': excludeXP } }, { new: true })?.exec();
  },
  /** @returns {Promise<Schema>} */
  configGuild: async (guildId, newDoc) => {
    if (await existsCheck(guildId)) return await Ranks.findOneAndUpdate({ guildId }, newDoc, { new: true })?.exec();
  }
};

module.exports = model;