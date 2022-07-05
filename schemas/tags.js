const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  guildId:{
    type: String,
    required: true,
    unique: true,
  },
  tags:{
    type: Array,
    name:{
      type: String
    },
    text:{
      type: String
    },
    file:{
      type: String
    },
    time:{
      type: Number
    },
  },
  global:{
    type: Boolean,
    required: true,
    default: false
  }

});
module.exports = mongoose.model('Tags', TagSchema);