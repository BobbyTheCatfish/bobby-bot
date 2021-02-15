const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors')

const Module = new Augur.Module();
Module.addCommand({name: "playing",
    guildOnly: true,
    process: async(msg, suffix)=>{
        function currentPlayers(game){
            // List people playing the game
            let players = [];
            let games = []
            try{
                for(m of msg.guild.members.cache.map(m=>m)){
                    if (m.user.bot) continue
                    let presence = m.user.presence.activities.filter(a => a.type == "PLAYING" && a.name.toLowerCase().startsWith(game.toLowerCase()))[0]
                    if(presence){
                        players.push(`• <@${m.id}>`)
                        games.push(presence.name)
                    }
                }
                if(games[0]) game = games[0]
                let embed = u.embed().setTitle(`${msg.guild.name} members currently playing ${game}`).setTimestamp()
                players.sort((a, b) => a.localeCompare(b))
                if (players.length > 0) embed.setDescription(players.join("\n"))
                else embed.setDescription(`I couldn't find any members playing ${game}.`)
                return embed
            } catch (error) {u.errorHandler(error, 'Playing currentPlayers Function')}
        }
        if (suffix) msg.channel.send({embed: currentPlayers(suffix), disableMentions: 'all'})
        else{
            // List *all* games played
            let games = new u.Collection()
            for (m of msg.guild.members.cache.map(m=>m)){
                if (m.user.bot) continue
                let game = m.user.presence.activities.filter(a => a.type == "PLAYING")[0]
                if (game && !games.has(game.name)) games.set(game.name, {game: game.name, players: 0, people: m})
                if(game){
                    games.get(game.name).players++
                    games.get(game.name).people+(m)
                }
            }
            let gameList = games.sort((a, b) => {
                if (b.players == a.players) return a.game.localeCompare(b.game)
                else return b.players - a.players
            }).array()
            let min = Math.min(gameList.length, 25)
            let embed = u.embed().setTimestamp()
                .setTitle("Currently played games in " + msg.guild.name)
                .setDescription(`The ${min == 1 ? 'only game' : 'top '+min+' games'} game${ min == 1 ? '':'s'} currently being played in ${msg.guild.name}:`)
                
            if (gameList.length > 0)  for (let i = 0; i < Math.min(gameList.length, 25); i++) embed.addField(gameList[i].game, gameList[i].people, gameList[i].people, true)
            else embed.setDescription("Well, this is awkward... Nobody is playing anything.")
            msg.channel.send({embed, disableMentions: "all"})
        }
    }
})
module.exports = Module