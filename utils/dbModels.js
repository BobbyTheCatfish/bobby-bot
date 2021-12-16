const GuildConfig = require( '../schemas/guildconfig')
const Tags = require( '../schemas/tags')
const GTags = require( '../schemas/globalTags')
const rRoles = require( '../schemas/reactionRoles')
const mongoose = require( 'mongoose')
const config = require( '../config/config.json')

mongoose.connect(config.db.db, config.db.settings);

const models = {
    guildconfig: {
        createConfig: async (guildId) =>{
            if(!await GuildConfig.exists({guildId})) GuildConfig.create({guildId})
            else return null
        },
        getConfig: async (guildId) =>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec()
                if(document) return document
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getInvite: async(guildId) => {
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec()
                if(document) return document.invite
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveInvite: async(guildId, invite) => {
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})) return await GuildConfig.findOneAndUpdate({guildId}, {invite}, {new: true})
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getPrefix: async (guildId) => {
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec()
                if(document) return document.prefix
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        savePrefix: async (guildId, prefix) => {
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})) return await GuildConfig.findOneAndUpdate({guildId}, {prefix}, {new: true})
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveErrorChannel: async (guildId, channel) => {
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"channels.error":channel}, {new: true})
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getErrorChannel: async (guildId)=>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec();
                let channel = document?.channels.error
                if(channel) return channel
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveBotLobby: async (guildId, channel) =>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"channels.botLobby": channel}, {new: true})
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getBotLobby: async (guildId) =>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec();
                let channel = document?.channels?.botLobby
                if(channel) return channel
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getStarBoards: async(guildId)=>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec();
                let channels = document?.channels?.starboards
                if(channels) return channels 
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveStarBoard: async (guildId, channel, reactions, singleChannel, toStar)=>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId})
                let board = document?.channels?.starboards?.find(c => c.channel == channel)
                if(board) return GuildConfig.findOneAndUpdate({guildId, 'channels.starboards.channel': channel}, {$set: {'channels.starboards.$.channel':channel, 'channels.starboards.$.reactions':reactions,'channels.starboards.$.singleChannel': singleChannel, 'channels.starboards.$.toStar': toStar}})
                else return GuildConfig.updateOne({guildId}, {channels: {starboards:{$push: {channel, reactions, singleChannel, toStar}}}})
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveLogChannel: async(guildId, channel, flags)=>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"channels.logChannel": {channel, flags}}, {new: true})
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getLogChannel: async(guildId)=>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec()
                let channel = document?.channels?.logChannel
                if(channel) return channel.channel
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getLogFlags: async(guildId)=>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec()
                let channel = document?.channels?.logChannel
                if(channel) return channel.flags
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        getMutedRole: async(guildId) =>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})){
                let document = await GuildConfig.findOne({guildId}).exec()
                let role = document?.roles?.muted
                if(role) return role
            }
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveMutedRole: async(guildId, muted) =>{
            await models.guildconfig.createConfig(guildId)
            if(await GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {"roles.muted": muted}, {new: true})
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        langFilter: async(guildId)=>{
            if(guildId == '406821751905976320') return 'mi'
            //await models.guildconfig.createConfig(guildId)
            //if(await GuildConfig.exists({guildId})){
            //    let document = GuildConfig.findOne({guildId}).exec()
            //    return document?.langFilter
            //}
            //else throw new Error(`No guildconfig for guild ${guildId}`)
            else return null
        },
        langLogChannel: async(guildId)=>{
            //await models.guildconfig.createConfig(guildId)
            //else throw new Error(`No guildconfig for guild ${guildId}`)
            if(guildId == '406821751905976320') return '789694239197626371'
            else return null
        }
    },
    tags:{
        getTag: async (guildId, name) =>{
            let document = await Tags.findOne({guildId})?.exec();
            return document?.tags?.find(t => t.name == name);
        },
        getGlobalTag: async(name) =>{
            /**@type {{tags: [{name: string, time: Date}]}[]} */
            let document = await Tags.find({global: true})?.exec()
            return document?.map(a => a.tags)?.flat()?.filter(t => t.name == name)?.sort((a, b) => a.time-b.time)[0]
        },
        getAllTags: async (guildId) =>{
            let document = await Tags.findOne({guildId})?.exec()
            return document?.tags
        },
        getAllGlobalTags: async() =>{
            let document = await Tags.find({global: true})?.exec()
            let filtered = document?.map(a => a.tags)?.flat()?.sort((a, b) => a.time-b.time).filter((v, i, a) => a.map(a => a.name).indexOf(v.name) == i)
            return filtered.sort((a, b) => a.name.localeCompare(b.name))
        },
        saveTag: async (guildId, name, text, file) =>{
            let document = await Tags.findOne({guildId})?.exec()
            let time = Date.now()
            if(document){
                let tag = document.tags.find(t => t.name == name)
                if(tag) return Tags.updateOne({guildId, "tags.name":name}, {$set: {"tags.$.text":text, "tags.$.file": file}})
                else return Tags.updateOne({guildId}, {$push: {tags: {name, text, file, time}}})
            }
            else return Tags.create({guildId, tags: [{name, text, file, time}]})
        },
        removeTag: async (guildId, name) =>{
            let document = await Tags.findOne({guildId})?.exec()
            if(document){
                let tag = document?.tags.find(t => t.name == name)
                if(tag) return Tags.findOneAndUpdate({guildId}, {$pull: {"tags":{name}}});
            }
            return null
        },
        //addTimestamps: async(guildId, name) =>{
        //    return await Tags.updateMany({tags: {$gte: {$size: 1}}}, {$set: {"tags.$[].time": Date.now()}})
        //},
        globalStatus: async(guildId)=>{
            let document = await Tags.findOne({guildId})?.exec()
            return document?.global
        },
        setGlobal: async(guildId, user)=>{
            if(!await Tags.exists({guildId})) await Tags.create({guildId, tags: []})
            let document = await Tags.findOne({guildId})?.exec()
            if(document){
                await Tags.updateOne({guildId},{global: true})
                let a = new Promise(async(res, rej) =>{
                    document.tags.forEach(async (t, i)=>{
                        if(!await GTags.findOne({name: t.name})) await GTags.create({user, guildId, name: t.name, text: t.text, file: t.file})
                        if(i == (document.tags.length -1)) res(true)
                    })
                })
                return await a
            }
            else throw new Error(`No tag document for guild ${guildId}`)
        },
        setLocal: async(guildId)=>{
            if(!await Tags.exists({guildId})) await Tags.create({guildId, tags: []})
            let document = await Tags.findOne({guildId})?.exec()
            if(document){
                await Tags.updateOne({guildId},{global: false})
                let globalDoc = await GTags.find({e: true}).exec()
                let p = new Promise(async(res, rej) =>{
                    globalDoc.filter(t => t.guildId == guildId).forEach(async (t, i, a)=>{
                        if(!document?.tags.find(a=> a.name == t.name)) await Tags.findOneAndUpdate({guildId}, {$push: {tags:[{name: t.name, text: t.text, file: t.file}]}})
                        else await Tags.findOneAndUpdate({guildId, "tags.name": name}, {$set: {"tags.$.text": t.text, "tags.$.file": t.file}})
                        await GTags.findOneAndDelete({name: t.name})
                        if(i == (a.length-1)) res(true)
                    })
                })
                return await p
            }
            else throw new Error(`No tag document for guild ${guildId}`)
        },
    },
    globalTags: {
        getTag: async(name) =>{
            return await GTags.findOne({name})?.exec()
        },
        getAllTags: async()=>{
            return await GTags.find()?.exec()
        },
        saveTag: async(guildId, user, name, text, file)=>{
            let document = await GTags.find({e: true}).exec()
            let tag = document?.find(t => t.name == name)
            return tag ? GTags.findOneAndUpdate({name},{text, file}) : GTags.create({user, guildId, name, text, file})
        },
        removeTag: async(name)=>{
            let tag = await GTags.find({name})?.exec()
            return tag ? GTags.findOneAndDelete({name}) : null
        }
    },
    welcome:{
        getWelcome: async(guildId) =>{
            await models.guildconfig.createConfig(guildId)
            let document = await GuildConfig.findOne({guildId})?.exec();
            if(document) return document.welcome
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        saveWelcome: async (guildId, channel, roles, emoji, ruleChannel, custom) =>{
            await models.guildconfig.createConfig(guildId)
            if(!await GuildConfig.exists({guildId}))
            if(GuildConfig.exists({guildId})) return GuildConfig.findOneAndUpdate({guildId}, {welcome: {enabled: true, channel, roles, ruleChannel, custom}}, {new: true}) //'welcome.enabled':true, 'welcome.channel':channel, 'welcome.roles': roles, 'welcome.emoji': emoji, 'welcome.ruleChannel':ruleChannel, 'welcome.custom': custom}
            else throw new Error(`No guildconfig for guild ${guildId}`)
        },
        disableWelcome: async (guildId) => {return GuildConfig.findOneAndUpdate({guildId}, {'welcome.enabled': false})}
    },
    reactionRoles: {
        getReactionRole: async(messageId)=>{
            return await rRoles.find({messageId})?.exec()
        },
        getAllReactionRoles: async()=>{
            return await rRoles.find()?.exec()
        },
        getGuildReactionRole: async(guildId) =>{
            return await rRoles.find({guildId})?.exec()
        },
        saveReactionRoles: async(msg, reactions, removeOnUnreact)=>{
            let document = rRoles.findOne({guildId: msg.guild.id})?.exec()
            if(document) return rRoles.findOneAndUpdate({guildId: msg.guild.id}, {messageId: msg.id, channelId: msg.channel.id, reactions, removeOnUnreact}, {new: true})
            return rRoles.create({guildId: msg.guild.id, channelId: msg.channel.id, messageId: msg.id, reactions, removeOnUnreact})
        },
        removeReactionRoles: async(messageId) =>{
            let document = await rRoles.find({messageId})?.exec()
            return document ? rRoles.findOneAndDelete({messageId}) : null
        },
        getRemoveableRoles: async(messageId) =>{
            let document = await rRoles.find({removeOnUnreact: true})?.exec()
            return document.find(r => r.messageId == messageId)
        }
    },
  };
  
  module.exports = models;