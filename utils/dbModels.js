const mongoose = require('mongoose');
const config = require('../config/config.json');
const guildConfig = require('./models/guildConfig');
const infraction = require('./models/infraction');
const ranks = require('./models/ranks');
const reactionRoles = require("./models/reactionRoles");
const tags = require('./models/tags');
const games = require('./models/games');

mongoose.connect(config.db.db, config.db.settings);
module.exports = { guildConfig, infraction, ranks, tags, reactionRoles, games };