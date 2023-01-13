const Games = require("../../schemas/games");
const Waiting = require('../../schemas/gamesWaiting');

/**
 * @typedef Game
 * @prop {string} player1
 * @prop {string} player2
 * @prop {number} turn
 * @prop {string} p1Hash
 * @prop {string} p2Hash
 * @prop {string} p1GuessHash
 * @prop {string} p2GuessHash
 *
 * @typedef waiting
 * @prop {string} id
 * @prop {string} opponent
 */

const model = {
  games: {
    /** @returns {Promise<Game[]>} */
    getAll: async () => {
      return await Games.find().exec();
    },
    /** @param {Game} board @returns {Promise<Game>} */
    start: async (board) => {
      return await Games.create(board);
    },
    /** @returns {Promise<Game>} */
    get: async (id) => {
      return await Games.findOne({ $or: [{ player1: id }, { player2: id }] })?.exec();
    },
    updateHash: async (player1, turn, newHash, newGuessHash) => {
      let game;
      if (turn == 1) {
        game = await Games.findOneAndUpdate({ player1 }, { p2Hash: newHash, p1GuessHash: newGuessHash }, { new: true });
      } else {
        game = await Games.findOneAndUpdate({ player1 }, { p1Hash: newHash, p2GuessHash: newGuessHash }, { new: true });
      }
      return game;
    },
    endTurn: async (player1, turn) => {
      return await Games.findOneAndUpdate({ player1 }, { turn: !turn });
    }
  },
  waiting: {
    /** @returns {Promise<waiting>} */
    save: async (id, opponent = null) => {
      return await Waiting.create({ id, opponent });
    },
    /** @returns {Promise<waiting>} */
    getAll: async () => {
      return await Waiting.find().exec();
    },
    /** @returns {Promise<waiting>} */
    get: async (id) => {
      return await Waiting.findOne({ id }).exec();
    },
    /** @returns {Promise<waiting>} */
    popRandom: async (id) => {
      await Waiting.findOneAndDelete({ id });
      return await Waiting.findOneAndDelete({ id: { $ne: id }, opponent: null });
    },
    /** @returns {Promise<waiting>} */
    popOpponent: async (id, opponent) => {
      await Waiting.findOneAndDelete({ id });
      return await Waiting.findOneAndDelete({ id: opponent });
    }
  }
};

module.exports = model;