const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  prefix: {
    type: String,
    required: true,
    default: '!',
  },
  filter: {
    type: Boolean,
    default: false
  },
  roles: {
    type: Object,
    muted: {
      type: String
    },
    trusted: {
      type: String
    },
    trustedplus: {
      type: String
    },
    untrusted: {
      type: String
    }
  },
  welcome: {
    type: Object,
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    channel: {
      type: String,
      required: true,
    },
    roles: {
      type: Array,
    },
    emoji: {
      type: String
    },
    ruleChannel: {
      type: String
    },
    custom: {
      type: String
    },
  },
  channels: {
    type: Object,
    botLobby: {
      type: String,
    },
    modLogs: {
      type: String,
    },
    starboards: {
      type: Array,
      channel: {
        type: String,
      },
      reactions: {
        type: Array,
      },
      whitelist: {
        type: String,
      },
      toPost: {
        type: Number,
      },
    },
  },
});
module.exports = mongoose.model('GuildConfig', GuildConfigSchema);