const mongoose = require('mongoose');

const ReactionRoleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  messageId: {
    type: String,
    required: true
  },
  reactions: {
    type: Array,
    required: true,
    name: {
      type: String,
    },
    id: {
      type: String
    },
    roleId: {
      type: String
    }
  },
  removeOnUnreact: {
    type: Boolean,
    default: true
  }
});
module.exports = mongoose.model('rRoles', ReactionRoleSchema);