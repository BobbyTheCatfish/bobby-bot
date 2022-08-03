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
    type: Number,
    default: 0
  },
  roles: {
    type: Object,
    muted: {
      type: String,
      default: "",
    },
    trusted: {
      type: String,
      default: "",
    },
    trustPlus: {
      type: String,
      default: "",
    },
    untrusted: {
      type: String,
      default: "",
    },
    mods: {
      type: String,
      default: "",
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
  starredMsgs: {
    type: Array,
    id: {
      type: String
    },
    createdTimestamp: {
      type: Number
    }
  },
  channels: {
    type: Object,
    botLobby: {
      type: String,
      default: "",
    },
    modLogs: {
      type: String,
      default: "",
    },
    muteChannel: {
      type: String,
      default: "",
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