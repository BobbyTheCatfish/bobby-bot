const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    ytdl = require('ytdl-core'),
    queue = new Map()

const Module = new Augur.Module

Module.addCommand({name:"play",
    aliases: ['skip','stop'],
    process: async(message, args) =>{
      return
        let words = args.split(' ')
        const serverQueue = queue.get(message.guild.id);
        //command handling
        if((await u.parse(message)).command == 'play') return await execute(message, serverQueue);
        else if((await u.parse(message)).command == 'skip') return skip(message, serverQueue);
        else if((await u.parse(message)).command == 'stop') return stop(message, serverQueue);
        else return message.channel.send("You need to enter a valid command! (not sure how you got this text to trigger tho)");
    
        async function execute(message, serverQueue)
        {
          const voiceChannel = message.member.voice.channel;
          if(!voiceChannel) return message.channel.send("You need to be in a voice channel to play music!");
          if(!words || !args) return message.channel.send("What do you want to play?")
          let songInfo
          let song
          try
          {
            songInfo = await ytdl.getInfo(args);
            song = {title: songInfo.videoDetails.title, url: songInfo.videoDetails.video_url};
          }catch (error) {return message.channel.send("Couldn't find that song! Make sure it's a valid youtube URL")}
    
          if(!serverQueue)
          {
            const queueContruct = {textChannel: message.channel, voiceChannel: voiceChannel, connection: null, songs: [], volume: 5, playing: true};
            
            try
            {
              queue.set(message.guild.id, queueContruct);
              queueContruct.songs.push(song);
              var connection = await voiceChannel.join();
              queueContruct.connection = connection;
              await play(message.guild, queueContruct.songs[0]);
            }catch (err)
            {
              queue.delete(message.guild.id);
              console.log(err)
              return message.channel.send("Looks like there was an error when I tried to join the VC or play the music. Let Bobby know with the `errormsg` command");
            }
          }
          else try
          {
            serverQueue.songs.push(song);
            return message.channel.send(`${song.title} has been added to the queue!`);
          }catch (error) {console.log(err); return message.channel.send("Looks like there was an error when I tried to add the song to the queue. Let Bobby know with the `errormsg` command")}      
        }
    
        async function play(guild, song)
        {
          const serverQueue = queue.get(guild.id);
          if (!song) try
          {
            serverQueue.voiceChannel.leave();
            return queue.delete(guild.id);
          }catch (error) {}
          
    
          const dispatcher = serverQueue.connection.on("disconnect", () =>
          {
            try{return queue.delete(guild.id);} catch(error) {console.log(err); serverQueue.textChannel.send("Looks like there was an error when you disconnected me. Let Bobby know with the `errormsg` command")}
          })
          .play(await ytdl(song.url))
            .on("error", () => {return message.channel.send("Looks like there was an error when I tried to play the song. Let Bobby know with the `errormsg` command")})
            .on("finish", () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0])
              })
            .on("error", () => {console.log(err);return message.channel.send("Looks like there was an error when I tried to shift the queue. Let Bobby know with the `errormsg` command")});
          dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
          serverQueue.textChannel.send(`Start playing: **${song.title}**`);
        }
    
        function skip(message, serverQueue)
        {
          if(!message.member.voice.channel) return message.channel.send("You have to be in a voice channel to skip music!");
          if(!serverQueue) return message.channel.send("There is no song that I could skip!");
          try {serverQueue.connection.dispatcher.end();} catch (error) {}
        }
    
        function stop(message, serverQueue)
        {
          if(!message.member.voice.channel) return message.channel.send("You have to be in a voice channel to stop the music!");
          serverQueue.songs = [];
          try {
            serverQueue.connection.dispatcher.end();
            return message.channel.send("Stopping the music...")
          } catch (error) {}
        }
    }
}).addCommand({name:'join',
  ownerOnly: true,
  process: async(message, args) =>{
    const voiceChannel = message.member.voice.channel;
    if(!voiceChannel) return message.channel.send("You need to be in a voice channel for me to join!");
    await voiceChannel.join();
  }
}).addCommand({name: 'leave',
  ownerOnly: true,
  process: async(message,args)=>{
    const voiceChannel = message.member.voice.channel;
    if(!voiceChannel) return message.channel.send("You need to be in a voice channel for me to leave!");
    await voiceChannel.leave();
  }
})
module.exports = Module