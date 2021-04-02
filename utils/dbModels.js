const GuildConfig = require('../schemas/guildconfig'),
    Tags = require('../schemas/tags'),
    GTags = require('../schemas/globalTags'),
    rRoles = require('../schemas/reactionRoles')
    config = require("../config/config.json"),
    mongoose = require("mongoose");

const {Collection} = require("discord.js");

mongoose.connect(config.db.db, config.db.settings);

const models = {
    guildconfig: {
        createConfig: async (guildId) =>{
            if(!await GuildConfig.exists({guildId})) GuildConfig.create({guildId})
            else return null
        },
        getConfig: async (guildId) =>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                if(guildDoc) return guildDoc
            }
            return null
        },
        getInvite: async(guildId) => {
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                if(guildDoc) return guildDoc.invite
            }
            return null
        },
        saveInvite: async(guildId, invite) => {
            if(await GuildConfig.exists({guildId})) return await GuildConfig.findOneAndUpdate({guildId}, {invite}, {new: true})
            else return null
        },
        getPrefix: async (guildId) => {
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                if(guildDoc) return guildDoc.prefix
            }
            return null
        },
        savePrefix: async (guildId, prefix) => {
            if(await GuildConfig.exists({guildId})) return await GuildConfig.findOneAndUpdate({guildId}, {prefix}, {new: true})
            else return null
        },
        saveErrorChannel: async (guildId, channel) => {
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"channels.error":channel}, {new: true})
            else return null
        },
        getErrorChannel: async (guildId)=>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec();
                let channel = guildDoc?.channels.error
                if(channel) return channel
            }
            return null
        },
        saveBotLobby: async (guildId, channel) =>{
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"channels.botLobby": channel}, {new: true})
            else return null
        },
        getBotLobby: async (guildId) =>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec();
                let channel = guildDoc?.channels?.botLobby
                if(channel) return channel
            }
            return null
        },
        getStarBoards: async(guildId)=>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec();
                let channels = guildDoc?.channels?.starboards
                if(channels) return channels 
            }
            return null
        },
        saveStarBoard: async (guildId, channel, reactions, singleChannel, toStar)=>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId})
                let board = guildDoc?.channels?.starboards?.find(c => c.channel == channel)
                if(board) return GuildConfig.findOneAndUpdate({guildId, 'channels.starboards.channel': channel}, {$set: {'channels.starboards.$.channel':channel, 'channels.starboards.$.reactions':reactions,'channels.starboards.$.singleChannel': singleChannel, 'channels.starboards.$.toStar': toStar}})
                else return GuildConfig.updateOne({guildId}, {channels: {starboards:{$push: {channel, reactions, singleChannel, toStar}}}})
            }
            else return null
        },
        saveLogChannel: async(guildId, channel, flags)=>{
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"channels.logChannel": {channel, flags}}, {new: true})
            else return null
        },
        getLogChannel: async(guildId)=>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                let channel = guildDoc?.channels?.logChannel
                if(channel) return channel.channel
            }
            return null
        },
        getLogFlags: async(guildId)=>{
            if(await GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                let channel = guildDoc?.channels?.logChannel
                if(channel) return channel.flags
            }
            return null
        }
    },
    tags:{
        getTag: async (guildId, name) =>{
            if(await Tags.exists({guildId})){
                let guildDoc = await Tags.findOne({guildId}).exec();
                let tag = guildDoc?.tags.find(t => t.name == name);
                if(tag) return tag
            }
            return null
        },
        getAllTags: async (guildId) =>{
            return await Tags.exists({guildId}) ? Tags.findOne({guildId}).exec() : null
        },
        saveTag: async (guildId, name, text, file) =>{
            if(await Tags.exists({guildId})){
                let guildDoc = await Tags.findOne({guildId}).exec()
                let tag = guildDoc?.tags.find(t => t.name == name)
                if(tag) return Tags.updateOne({guildId, "tags.name":name}, {$set: {"tags.$.text":text, "tags.$.file": file}})
                else return Tags.updateOne({guildId}, {$push: {tags: {name, text, file}}})
            }
            else return Tags.create({guildId, tags: [{name, text, file}]})
        },
        removeTag: async (guildId, name) =>{
            if(await Tags.exists({guildId})){
                let guildDoc = await Tags.findOne({guildId}).exec()
                let tag = guildDoc?.tags.find(t => t.name == name)
                if(tag) return Tags.findOneAndUpdate({guildId}, {$pull: {"tags":{name}}});
            }
            return null
        },
        globalStatus: async(guildId)=>{
            if(await Tags.exists({guildId})){
                let guildDoc = await Tags.findOne({guildId}).exec()
                if(guildDoc?.global == true) return true
            }
            return null
        },
        setGlobal: async(guildId, user)=>{
            if(await Tags.exists({guildId})){
                await Tags.updateOne({guildId},{global: true})
                let guildDoc = await Tags.findOne({guildId}).exec()
                guildDoc?.tags.forEach(async t=>{
                    if(!await GTags.findOne({name: t.name})) await GTags.create({user, guildId, name: t.name, text: t.text, file: t.file, e: true})
                })
                return true
            }
            else return null
        },
        setLocal: async(guildId)=>{
            if(await Tags.exists({guildId})){
                await Tags.updateOne({guildId},{global: false})
                let guildDoc = await Tags.findOne({guildId}).exec()
                let globalDoc = await GTags.find({e: true}).exec()
                globalDoc.forEach(async t=>{
                    if(t.guildId == guildId){
                        if(!guildDoc?.tags.find(a=> a.name == t.name)){
                            await Tags.findOneAndUpdate({guildId}, {$push: {tags:[{name: t.name, text: t.text, file: t.file}]}})
                        }
                        await GTags.findOneAndDelete({name: t.name})
                    }
                })
                return true
            }
        }
    },
    globalTags: {
        getTag: async(name) =>{
            let globalDoc = await GTags.findOne({name}).exec()
            return globalDoc ? globalDoc : null
        },
        getAllTags: async()=>{
            return await GTags.find().exec()
        },
        saveTag: async(guildId, user, name, text, file)=>{
            let globalDoc = await GTags.find({e: true}).exec()
            let tag = globalDoc?.find(t => t.name == name)
            return tag ? GTags.findOneAndUpdate({name},{text, file}) : GTags.create({user, guildId, name, text, file, e: true})
        },
        removeTag: async(name)=>{
            let globalDoc = await GTags.find({e: true}).exec()
            let tag = globalDoc?.find(t =>t.name == name)
            return tag ? GTags.findOneAndDelete({name}) : null
        }
    },
    welcome:{
        getWelcome: async(guildId) =>{
            if(GuildConfig.exists({guildId})){
                let guildDoc = await GuildConfig.findOne({guildId}).exec();
                return guildDoc?.welcome
            }
            else return null
        },
        saveWelcome: async (guildId, channel, roles, emoji, ruleChannel, custom) =>{
            if(GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {'welcome.enabled':true, 'welcome.channel':channel, 'welcome.roles': roles, 'welcome.emoji': emoji, 'welcome.ruleChannel':ruleChannel, 'welcome.custom': custom},{new: true})
            else return null
        },
        disableWelcome: async (guildId) => {return GuildConfig.findOneAndUpdate({guildId}, {'welcome.enabled': false})}
    },
    reactionRoles: {
        getReactionRole: async(messageId)=>{
            return await rRoles.find({messageId}).exec()
        },
        getAllReactionRoles: async()=>{
            return await rRoles.find().exec()
        },
        getGuildReactionRole: async(guildId) =>{
            return await rRoles.find({guildId})?.exec()
        },
        saveReactionRoles: async(msg, reactions, removeOnUnreact)=>{
            return rRoles.create({guildId: msg.guild.id, channelId: msg.channel.id, messageId: msg.id, reactions, removeOnUnreact})
        },
        removeReactionRoles: async(messageId) =>{
            let globalDoc = await rRoles.find().exec()
            let rRole = globalDoc.find(r => r.messageId == messageId)
            return rRole ? rRoles.findOneAndDelete({messageId}) : null
        },
        getRemoveableRoles: async(messageId) =>{
            let globalDoc = await rRoles.find({removeOnUnreact: true}).exec()
            return globalDoc.find(r => r.messageId == messageId)
        }
    },
    init: (bot) => {
      bot.guilds.cache.forEach(guild => {
        Server.findOne({serverId: guild.id}, (e, server) => {
          if (!e && server) {
            serverSettings.set(server.serverId, server);
          } else {
            models.server.addServer(guild).then(server => {
              serverSettings.set(server.serverId, server);
            });
          }
        });
      });
    }
  };
  
  module.exports = models;