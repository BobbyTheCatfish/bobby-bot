const mongoose = require('mongoose');

const RankSchema = new mongoose.Schema({
  guildId:{
    type: String,
    required: true,
    unique: true,
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true
  },
  users: {
    type: Array,
    required: true,
    userId: {
      type: String,
      required: true
    },
    xp: {
      type: Number,
      required: true,
      default: 0
    },
    lifeXP: {
      type: Number,
      required: true,
      default: 0
    },
    excludeXP: {
      type: Boolean,
      required: true,
      default: false
    },
    posts: {
      type: Number,
      required: true,
      default: 0
    }
  },
  exclude: {
    channels: {
      type: Array
    },
    roles: {
      type: Array
    }
  },
  roles: {
    type: Array,
    id: {
      type: String
    },
    level: {
      type: Number
    }
  },
  rate: {
    type: Number,
    required: true,
    default: 2
  }
});
module.exports = mongoose.model('Ranks', RankSchema);