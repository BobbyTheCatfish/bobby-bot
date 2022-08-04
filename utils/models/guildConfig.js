const GuildConfig = require('../../schemas/guildconfig');
/**
 * @typedef Welcome
 * @prop {boolean} enabled If the board is enabled or not
 * @prop {string} channel The channel to send welcome messages to
 * @prop {string[]} roles The roles to apply to the new member
 * @prop {string} emoji An emoji for the random message
 * @prop {string} ruleChannel The rule channel for the random message
 * @prop {string} custom A custom message
 *
 * @typedef GuildChannels
 * @prop {string} error
 * @prop {string} botLobby
 * @prop {string} modCategory
 * @prop {string} muteChannel
 * @prop {string} modLogs
 *
 * @typedef GuildRoles
 * @prop {string} muted
 * @prop {string} trusted
 * @prop {string} trustPlus
 * @prop {string} untrusted
 * @prop {string} mods
 *
 * @typedef StarBoard
 * @property {string} channel The channel to send starred posts to
 * @property {string[]} reactions The reactions to trigger the board
 * @property {string[]} whitelist The channels with priority
 * @property {number} toPost The number of required reactions
 *
 * @typedef {GuildChannels & {starboards: StarBoard[], botLobby: string}} AllChannels
 * @typedef {{id: string, createdTimestamp: number}} StarMsg
 * @typedef Schema
 * @prop {string} prefix
 * @prop {number} filter
 * @prop {StarMsg[]} starredMsgs
 * @prop {string} __id
 * @prop {string} guildId
 * @prop {string} __v
 * @prop {Welcome} welcome
 * @prop {AllChannels} channels
 * @prop {GuildRoles} roles
 */
async function configCheck(guildId) {
  await model.config.create(guildId);
  if (await GuildConfig.exists({ guildId })) return true;
  else throw new Error(`No guildconfig for guild ${guildId}`);
}
const model = {
  welcome: {
    /** @returns {Promise<Welcome>}*/
    get: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId })?.exec();
        return document.welcome;
      }
    },
    /**
     * @param {Welcome} welcome
     * @returns {Promise<Welcome>}
     */
    save: async (guildId, welcome) => {
      if (await configCheck(guildId)) return GuildConfig.findOneAndUpdate({ guildId }, { welcome }, { new: true });
    },
    toggle: async (guildId, state = false) => {return GuildConfig.findOneAndUpdate({ guildId }, { 'welcome.enabled': state });},
  },
  config: {
    /** @returns {Promise<Schema>} */
    create: async (guildId) => {
      if (!await GuildConfig.exists({ guildId })) return GuildConfig.create({ guildId });
      else return null;
    },
    /** @returns {Promise<Schema>} */
    get: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document;
      }
    },
    /** @returns {Promise<Schema[]>} */
    getAll: async () => {
      return await GuildConfig.find().exec();
    }
  },
  prefix: {
    /** @returns {Promise<string>} */
    get: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document.prefix;
      }
    },
    /** @returns {Promise<Schema>} */
    save: async (guildId, prefix) => {
      if (await configCheck(guildId)) return await GuildConfig.findOneAndUpdate({ guildId }, { prefix }, { new: true });
    }
  },
  snowflakes: {
    /**
     * @param {keyof GuildChannels} channelType
     * @returns {Promise<Schema>}
     */
    saveChannel: async (guildId, channel, channelType) => {
      if (await configCheck(guildId)) return GuildConfig.findOneAndUpdate({ guildId }, { [`channels.${channelType}`]: channel }, { new: true });
    },
    /**
     * @param {keyof GuildChannels} channelType
     * @returns {Promise<string>}
     */
    getChannel: async (guildId, channelType) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document.channels?.[channelType];
      }
    },
    /**
     * @param {string} guildId
     * @returns {Promise<GuildChannels>}
     */
    getChannels: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document.channels;
      }
    },

    /**
     * @param {string} roleId
     * @param {keyof GuildRoles} roleType
     * @returns {Promise<Schema>}
     */
    saveRole: async (guildId, roleId, roleType) => {
      if (await configCheck(guildId)) return GuildConfig.findOneAndUpdate({ guildId }, { [`roles.${roleType}`]: roleId }, { new: true });
    },
    /**
     * @param {keyof GuildRoles} roleType
     * @returns {Promise<string>}
     */
    getRole: async (guildId, roleType) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document.roles?.[roleType];
      }
    },
    /** @returns {Promise<GuildRoles>}*/
    getRoles: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document.roles;
      }
    },
  },
  starboards: {
    /** @returns {Promise<StarBoard[]>} */
    get: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId }).exec();
        return document.channels?.starboards;
      }
    },
    /**
     * @param {StarBoard} theBoard
     * @returns {Promise<Schema>}
     */
    save: async (guildId, theBoard) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId });
        const board = document.channels?.starboards?.find(c => c.channel == theBoard.channel);
        if (board) return GuildConfig.findOneAndUpdate({ guildId, 'channels.starboards.channel': theBoard.channel }, { $set: { 'channels.starboards.$': theBoard } });
        else return GuildConfig.updateOne({ guildId }, { $push: { 'channels.starboards': theBoard } });
      }
    },
    /** @returns {Promise<Schema>} */
    delete: async (guildId, channelId) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId });
        const board = document.channels?.starboards?.find(c => c.channel == channelId);
        if (board) return GuildConfig.findOneAndUpdate({ guildId, 'channels.starboards.channel': channelId }, { $pull: { channel: channelId } }, { new: true });
      }
    },
    /** @returns {Promise<Schema>} */
    saveMsg: async (guildId, msg) => {
      if (await configCheck(guildId)) return await GuildConfig.findOneAndUpdate({ guildId }, { $push: { 'starredMsgs': { id: msg.id, createdTimestamp: msg.createdTimestamp } } });
    },
    /** @returns {Promise<StarMsg>} */
    getMsg: async (guildId, messageId) => {
      if (await configCheck(guildId)) {
        const document = GuildConfig.findOne({ guildId }).exec();
        return document.starredMsgs?.find(s => s.id == messageId);
      }
    },
    /** @returns {Promise<StarMsg[]>} */
    getAllMsgs: async () => {
      const documents = await GuildConfig.find().exec();
      return documents?.map(d => {return { msgs: d.starredMsgs, guild: d.guildId };}).filter(a => a.msgs.length > 0);
    },
    /** @returns {Promise<Schema>} */
    cullMsgs: async (guildId, messageIds) => {
      if (await configCheck(guildId)) {
        const document = await GuildConfig.findOne({ guildId });
        const real = messageIds.filter(m => document?.starredMsgs.find(s => s.id == m));
        if (real.length > 0) return GuildConfig.findOneAndUpdate({ guildId }, { $pull: { "starredMsgs": { "id": { $in: messageIds } } } }, { new: true });
      }
    }
  },
  filter: {
    /** @returns {Promise<Number>} */
    get: async (guildId) => {
      if (await configCheck(guildId)) {
        const document = GuildConfig.findOne({ guildId }).exec();
        return document.filter;
      }
    },
    /** @returns {Promise<Schema>} */
    save: async (guildId, status) => {
      if (await configCheck(guildId)) return GuildConfig.findOneAndUpdate({ guildId }, { filter: status }, { new: true });
    }
  }
};

module.exports = model;