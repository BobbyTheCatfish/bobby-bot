const mongoose = require('mongoose');

const GamesWaitingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  opponent: {
    type: String
  }
});
module.exports = mongoose.model('GamesWaiting', GamesWaitingSchema);

