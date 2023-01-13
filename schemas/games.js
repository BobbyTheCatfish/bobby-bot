const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  player1: {
    type: String,
    required: true
  },
  player2: {
    type: String,
    required: true
  },
  turn: {
    type: Number,
    required: true
  },
  p1Hash: {
    type: String,
    required: true
  },
  p2Hash: {
    type: String,
    required: true
  }
});
module.exports = mongoose.model('Games', GameSchema);