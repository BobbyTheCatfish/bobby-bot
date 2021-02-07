const GuildConfig = require('../schemas/guildconfig'),
    Tags = require('../schemas/tags'),
    GTags = require('../schemas/globalTags'),
    config = require("../config/config.json"),
    mongoose = require("mongoose");

const {Collection} = require("discord.js");

mongoose.connect(config.db.db, config.db.settings);

const models = {
    guildconfig: {
        createConfig: async (guildId) =>{
            let server = await GuildConfig.exists({guildId})
            if(!server){
                GuildConfig.create({guildId})
            }
            else return null
        },
        getConfig: async (guildId) =>{
            let server = await GuildConfig.exists({guildId})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                if(guildDoc) return guildDoc
                else return null
            }
        },
        getPrefix: async (guildId) => {
            let server = await GuildConfig.exists({guildId})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId}).exec()
                if(guildDoc) return guildDoc.prefix
                else return null
            }
            else return null
        },
        savePrefix: async (guildId, prefix) => {
            let server = await GuildConfig.exists({guildId})
            if(server){
                return await GuildConfig.findOneAndUpdate({guildId}, {prefix}, {new: true})
            }
            else return null
        },
        saveErrorChannel: async (guild, channel) => {
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                return GuildConfig.findOneAndUpdate({guildId: guild}, {"channels.error":channel}, {new: true})
            }
            else return null
        },
        getErrorChannel: async (guild)=>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId: guild}).exec();
                let channel = guildDoc?.channels.error
                if(channel) return channel
                else return null
            }
            else return null
        },
        saveBotLobby: async (guild, channel) =>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                return GuildConfig.findOneAndUpdate({guildId: guild}, {"channels.botLobby": channel}, {new: true})
            }
            else return null
        },
        getBotLobby: async (guild) =>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId: guild}).exec();
                let channel = guildDoc?.channels?.botLobby
                if(channel) return channel
                else return null
            }
            else return null
        },
        getStarBoards: async(guild)=>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId: guild}).exec();
                let channels = guildDoc?.channels?.starboards
                if(channels) return channels
                else return null 
            }
            else return null
        },
        saveStarBoard: async (guild, channel, reactions, singleChannel, toStar)=>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId: guild})
                let board = guildDoc?.channels?.starboards?.find(c => c.channel == channel)
                if(board) return GuildConfig.findOneAndUpdate({guildId: guild, 'channels.starboards.channel': channel}, {$set: {'channels.starboards.$.channel':channel, 'channels.starboards.$.reactions':reactions,'channels.starboards.$.singleChannel': singleChannel, 'channels.starboards.$.toStar': toStar}})
                else return GuildConfig.updateOne({guildId: guild}, {channels: {starboards:{$push: {channel, reactions, singleChannel, toStar}}}})
            }
            else return null
        },
        saveLogChannel: async(guild, channel, flags)=>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                return GuildConfig.findOneAndUpdate({guildId: guild}, {"channels.logChannel": {channel, flags}}, {new: true})
            }
            else return null
        },
        getLogChannel: async(guild)=>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId: guild}).exec()
                let channel = guildDoc?.channels?.logChannel
                if(channel) return channel.channel
                else return null
            }
            else return null
        },
        getLogFlags: async(guild)=>{
            let server = await GuildConfig.exists({guildId: guild})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId: guild}).exec()
                let channel = guildDoc?.channels?.logChannel
                if(channel) return channel.flags
                else return null
            }
            else return null
        }
    },
    tags:{
        getTag: async (guild, name) =>{

            let server = await Tags.exists({guildId: guild})
            if(server){
                let guildDoc = await Tags.findOne({guildId: guild}).exec();
                let tag = guildDoc?.tags.find(t => t.name == name);
                if(tag) return tag
                else return null
            }
            else return null
        },
        getAllTags: async (guild) =>{
            let server = await Tags.exists({guildId: guild})
            if(server)return Tags.findOne({guildId: guild})                
            else return null
        },
        saveTag: async (guildId, name, text, file) =>{
            let server = await Tags.exists({guildId})
            if(server){
                let guildDoc = await Tags.findOne({guildId}).exec()
                let tag = guildDoc?.tags.find(t => t.name == name)
                if(tag) return Tags.updateOne({guildId, "tags.name":name}, {$set: {"tags.$.text":text, "tags.$.file": file}})
                else return Tags.updateOne({guildId}, {$push: {tags: {name, text, file}}})
            }
            else return Tags.create({guildId, tags: [{name, text, file}]})
        },
        removeTag: async (guild, name) =>{
            let server = await Tags.exists({guildId: guild})
            if(server){
                let guildDoc = await Tags.findOne({guildId: guild}).exec()
                let tag = guildDoc?.tags.find(t => t.name == name)
                if(tag) return Tags.findOneAndUpdate({guildId: guild}, {$pull: {"tags":{name}}});
                else return null
            }
            else return null
        },
        globalStatus: async(guildId)=>{
            let server = await Tags.exists({guildId})
            if(server){
                let guildDoc = await Tags.findOne({guildId}).exec()
                if(guildDoc?.global == true) return true
                else return null
            }
            else return null
        },
        setGlobal: async(guildId, user)=>{
            await Tags.updateOne({guildId},{global: true})
            let guildDoc = await Tags.findOne({guildId}).exec()
            guildDoc?.tags.forEach(async t=>{
                if(!await GTags.findOne({name: t.name})) await GTags.create({user, guildId, name: t.name, text: t.text, file: t.file, e: true})
            })
        },
        setLocal: async(guildId)=>{
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
            return
        }
    },
    globalTags: {
        getTag: async(name) =>{
            let globalDoc = await GTags.findOne({name}).exec()
            if(globalDoc) return globalDoc
            else return null
        },
        getAllTags: async()=>{
            return await GTags.find().exec()
        },
        saveTag: async(guildId, user, name, text, file)=>{
            let globalDoc = await GTags.find({e: true}).exec()
            let tag = globalDoc?.find(t => t.name == name)
            if(tag) return GTags.findOneAndUpdate({name},{text, file})
            else return GTags.create({user, guildId, name, text, file, e: true})
        },
        removeTag: async(name)=>{
            let globalDoc = await GTags.find({e: true}).exec()
            let tag = globalDoc?.find(t =>t.name == name)
            if(tag) return GTags.findOneAndDelete({name})
            else return null

        }
    },
    welcome:{
        getWelcome: async(guildId) =>{
            let server = GuildConfig.exists({guildId})
            if(server){
                let guildDoc = await GuildConfig.findOne({guildId}).exec();
                return guildDoc?.welcome
            }
            else return null
        },
        saveWelcome: async (guildId, channel, roles, emoji, ruleChannel, custom) =>{
            let server = GuildConfig.exists({guildId})
            if(server) return GuildConfig.findOneAndUpdate({guildId}, {'welcome.enabled':true, 'welcome.channel':channel, 'welcome.roles': roles, 'welcome.emoji': emoji, 'welcome.ruleChannel':ruleChannel, 'welcome.custom': custom},{new: true})
            else return null
        },
        disableWelcome: async (guildId) =>{
            return GuildConfig.findOneAndUpdate({guildId}, {'welcome.enabled': false})
        }
    },
    init: (bot) => {
      bot.guilds.forEach(guild => {
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