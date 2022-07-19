const mongoose = require('mongoose');

const InfractionSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  infractions: {
    type: Array,
    required: true,
    discordId: {
      type: String,
      required: true
    },
    channel: {
      type: String
    },
    message: {
      type: String
    },
    description: {
      type: String,
      required: true,
    },
    mod: {
      type: String
    },
    value: {
      type: Number
    },
    timestamp: {
      type: Date
    }
  }
});
module.exports = mongoose.model('Infractions', InfractionSchema);