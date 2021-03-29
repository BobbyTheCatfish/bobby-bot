const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    ytdl = require('ytdl-core'),
    queue = new Map()

const Module = new Augur.Module

Module.addCommand({name:"play",
    aliases: ['skip','stop'],
    process: async(msg, args) =>{
        let words = args.split(' ')
        const serverQueue = queue.get(msg.guild.id);
        //command handling
        if((await u.parse(msg)).command == 'play') return await execute(msg, serverQueue);
        else if((await u.parse(msg)).command == 'skip') return skip(msg, serverQueue);
        else if((await u.parse(msg)).command == 'stop') return stop(msg, serverQueue);
        else return msg.channel.send("You need to enter a valid command! (not sure how you got this text to trigger tho)");
    
        async function execute(msg, serverQueue)
        {
          const voiceChannel = msg.member.voice.channel;
          if(!voiceChannel) return msg.channel.send("You need to be in a voice channel to play music!");
          if(!words || !args) return msg.channel.send("What do you want to play?")
          let songInfo
          let song
          try
          {
            songInfo = await ytdl.getInfo(args);
            song = {title: songInfo.videoDetails.title, url: songInfo.videoDetails.video_url};
          }catch (error) {console.log(error);return msg.channel.send("Couldn't find that song! Make sure it's a valid youtube URL")}
    
          if(!serverQueue)
          {
            const queueContruct = {textChannel: msg.channel, voiceChannel: voiceChannel, connection: null, songs: [], volume: 5, playing: true};
            
            try
            {
              queue.set(msg.guild.id, queueContruct);
              queueContruct.songs.push(song);
              var connection = await voiceChannel.join();
              queueContruct.connection = connection;
              await play(msg.guild, queueContruct.songs[0]);
            }catch (err)
            {
              queue.delete(msg.guild.id);
              console.log(err)
              return msg.channel.send("Looks like there was an error when I tried to join the VC or play the music. Let Bobby know with the `errormsg` command");
            }
          }
          else try
          {
            serverQueue.songs.push(song);
            return msg.channel.send(`${song.title} has been added to the queue!`);
          }catch (error) {console.log(err); return msg.channel.send("Looks like there was an error when I tried to add the song to the queue. Let Bobby know with the `errormsg` command")}      
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
            .on("error", () => {return msg.channel.send("Looks like there was an error when I tried to play the song. Let Bobby know with the `errormsg` command")})
            .on("finish", () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0])
              })
            .on("error", () => {console.log(err);return msg.channel.send("Looks like there was an error when I tried to shift the queue. Let Bobby know with the `errormsg` command")});
          dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
          serverQueue.textChannel.send(`Start playing: **${song.title}**`);
        }
    
        function skip(msg, serverQueue)
        {
          if(!msg.member.voice.channel) return msg.channel.send("You have to be in a voice channel to skip music!");
          if(!serverQueue) return msg.channel.send("There is no song that I could skip!");
          try {serverQueue.connection.dispatcher.end();} catch (error) {}
        }
    
        function stop(msg, serverQueue)
        {
          if(!msg.member.voice.channel) return msg.channel.send("You have to be in a voice channel to stop the music!");
          serverQueue.songs = [];
          try {
            serverQueue.connection.dispatcher.end();
            return msg.channel.send("Stopping the music...")
          } catch (error) {}
        }
    }
}).addCommand({name:'join',
  ownerOnly: true,
  process: async(msg, args) =>{
    const voiceChannel = msg.member.voice.channel;
    if(!voiceChannel) return msg.channel.send("You need to be in a voice channel for me to join!");
    await voiceChannel.join();
  }
}).addCommand({name: 'leave',
  ownerOnly: true,
  process: async(msg,args)=>{
    const voiceChannel = msg.member.voice.channel;
    if(!voiceChannel) return msg.channel.send("You need to be in a voice channel for me to leave!");
    await voiceChannel.leave();
  }
})
module.exports = Module