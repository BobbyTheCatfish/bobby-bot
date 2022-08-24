const Tags = require('../../schemas/tags');
/**
 * @typedef Tag
 * @prop {string} name
 * @prop {string} text
 * @prop {string} file
 * @prop {number} time
 *
 * @typedef Schema
 * @prop {string} guildId
 * @prop {Tag[]} tags
 * @prop {boolean} global
 */
async function checkExists(guildId) {
  await model.addGuild(guildId);
  if (await Tags.exists({ guildId })) return true;
  else throw new Error(`No tag schema for ${guildId}`);
}
const model = {
  /** @returns {Promise<Tag>} */
  addGuild: async (guildId) => {
    if (!await Tags.exists({ guildId })) return await Tags.create({ guildId, tags: [], global: false });
    else return null;
  },
  /** @returns {Promise<Tag>} */
  getTag: async (guildId, name) => {
    if (await checkExists(guildId)) {
      const document = await Tags.findOne({ guildId }).exec();
      if (document.global) {
        const global = await Tags.find({ global: true });
        return global?.map(a => a.tags)?.flat()?.filter(t => t.name == name)?.sort((a, b) => a.time - b.time)[0];
      }
      return document.tags?.find(t => t.name == name);
    }
  },
  /** @returns {Promise<Tag[]>} */
  getAllTags: async (guildId) => {
    if (await checkExists(guildId)) {
      const document = await Tags.findOne({ guildId }).exec();
      return document.tags;
    }
  },
  /** @returns {Promise<Tag[]>} */
  getAllGlobalTags: async () => {
    const document = await Tags.find({ global: true })?.exec();
    const filtered = document?.map(a => a.tags)?.flat()?.sort((a, b) => a.time - b.time).filter((v, i, a) => a.map(b => b.name).indexOf(v.name) == i);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
  /** @returns {Promise<Schema>} */
  saveTag: async (guildId, name, text, file) => {
    if (await checkExists(guildId)) {
      const document = await Tags.findOne({ guildId })?.exec();
      const time = Date.now();
      const tag = document.tags.find(t => t.name == name);
      if (tag) return Tags.updateOne({ guildId, "tags.name": name }, { $set: { "tags.$.text": text, "tags.$.file": file } });
      else return Tags.updateOne({ guildId }, { $push: { tags: { name, text, file, time } } });
    }
  },
  /** @returns {Promise<Schema?>} */
  removeTag: async (guildId, name) => {
    if (await checkExists(guildId)) {
      const document = await Tags.findOne({ guildId })?.exec();
      const tag = document?.tags.find(t => t.name == name);
      if (tag) return Tags.findOneAndUpdate({ guildId }, { $pull: { "tags": { name } } });
    }
  },
  /** @returns {Promise<boolean>} */
  globalStatus: async (guildId) => {
    if (await checkExists(guildId)) {
      const document = await Tags.findOne({ guildId })?.exec();
      return document?.global;
    }
  },
  /** @returns {Promise<Schema>} */
  setGlobalStatus: async (guildId, status) => {
    if (await checkExists(guildId)) await Tags.updateOne({ guildId }, { global: status });
  }
};

module.exports = model;