const Infractions = require("../../schemas/infractions");
/**
 * @typedef infraction
 * @prop {string} discordId
 * @prop {string} channel
 * @prop {string} message
 * @prop {string} description
 * @prop {string} mod
 * @prop {number} value
 * @prop {Date} timestamp
 *
 * @typedef Summary
 * @prop {string} discordId
 * @prop {number} count
 * @prop {number} points
 * @prop {number} time
 * @prop {infraction[]} detail
 *
 * @typedef Schema
 * @prop {string} guildId
 * @prop {infraction[]} infractions
 */
const model = {
  /** @returns {Promise<Schema>} */
  addGuild: async (guildId) => {
    if (!await Infractions.exists({ guildId })) return Infractions.create({ guildId, infractions: [] });
    else return null;
  },
  /** @returns {Promise<infraction>} */
  getByFlag: async (guildId, flag) => {
    await model.addGuild(guildId);
    const document = await Infractions.findOne({ guildId }).exec();
    return document?.infractions.find(d => d.flag == flag);
  },
  /** @returns {Promise<Summary>} */
  getSummary: async (guildId, discordId, time = 90) => {
    const since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
    await model.addGuild(guildId);
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
  /** @returns {Promise<infraction[]>} */
  remove: async (guildId, flag) => {
    const newDoc = Infractions.findOneAndUpdate({ guildId, 'infractions.$.flag': flag }, { $pull: { flag } }, { new: true }).exec();
    return newDoc?.infractions;
  },
  /** @returns {Promise<infraction[]>} */
  save: async (guildId, infraction) => {
    infraction.timestamp = new Date();
    await model.addGuild(guildId);
    const newDoc = await Infractions.findOneAndUpdate({ guildId }, { $push: { 'infractions': infraction } }, { new: true })?.exec();
    return newDoc?.infractions;
  },
  /** @returns {Promise<infraction[]>} */
  update: async (guildId, flag, infraction) => {
    await model.addGuild(guildId);
    const newDoc = await Infractions.findOneAndUpdate({ guildId, 'infractions.$.flag': flag }, { 'infractions.$': infraction }, { new: true });
    return newDoc?.infractions;
  }
};
module.exports = model;