const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId:{
        type: String,
        required: true,
        unique: true,
    },
    prefix:{
        type: String,
        required: true,
        default: '!',
    },
    roles: {
        type: Object,
        muted: {
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
        channel:{
            type: String,
            required: true,
        },
        roles:{
            type: Array
        },
        emoji:{
            type: String
        },
        ruleChannel:{
            type: String
        },
        custom:{
            type: String
        }
    },
    channels:{
        type: Object,
        error:{
            type: String,
        },
        botLobby:{
            type: String,
        },
        starboards:{
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
        logChannel:{
            type: Object,
            channel: {
                type: String,
            },
            flags: {
                type: String,
            },
        },
    },
    commands:{
        type: String,
        required: true,
    }
});
module.exports = mongoose.model('GuildConfig',GuildConfigSchema);