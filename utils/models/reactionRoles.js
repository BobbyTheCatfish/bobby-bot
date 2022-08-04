const rRoles = require('../../schemas/reactionRoles');

/**
 * @typedef Reaction
 * @prop {string} name
 * @prop {string} id
 * @prop {string} roleId
 *
 * @typedef Schema
 * @prop {string} guildId
 * @prop {string} channelId
 * @prop {string} messageId
 * @prop {Reaction[]} reactions
 * @prop {boolean} removeOnUnreact
 */

const model = {
  /** @returns {Promise<Schema>} */
  getByMessage: async (messageId) => {
    return await rRoles.findOne({ messageId })?.exec();
  },
  /** @returns {Promise<Schema[]>} */
  getAll: async () => {
    return await rRoles.find()?.exec();
  },
  /** @returns {Promise<Schema>} */
  getByGuild: async (guildId) => {
    return await rRoles.findOne({ guildId })?.exec();
  },
  /** @returns {Promise<Schema>} */
  save: async (msg, reactions, removeOnUnreact) => {
    const document = rRoles.findOne({ guildId: msg.guild.id })?.exec();
    if (document) return rRoles.findOneAndUpdate({ guildId: msg.guild.id }, { messageId: msg.id, channelId: msg.channel.id, reactions, removeOnUnreact }, { new: true });
    return rRoles.create({ guildId: msg.guild.id, channelId: msg.channel.id, messageId: msg.id, reactions, removeOnUnreact });
  },
  /** @returns {Promise<null>} */
  delete: async (messageId) => {
    const document = await rRoles.find({ messageId })?.exec();
    return document ? rRoles.findOneAndDelete({ messageId }) : null;
  },
  /** @returns {Promise<Schema>} */
  getRemovable: async (messageId) => {
    const document = await rRoles.find({ removeOnUnreact: true })?.exec();
    return document.find(r => r.messageId == messageId);
  }
};

module.exports = model;