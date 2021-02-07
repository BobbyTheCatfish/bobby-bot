const mongoose = require('mongoose');

const GlobalTagSchema = new mongoose.Schema({
    e:{
        type: Boolean,
        default: true,
        required: true,
    },
    name:{
        type: String
    },
    text:{
        type: String
    },
    file:{
        type: String
    },
    user:{
        type: String
    },
    guildId:{
        type: String
    }
});
module.exports = mongoose.model('GTags',GlobalTagSchema);