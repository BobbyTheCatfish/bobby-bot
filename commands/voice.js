//Requires
const Augur = require('augurbot')
const u = require('../utils/utils')
const Module = new Augur.Module
const {promisify} = require('util')
const ytdl = require('youtube-dl-exec').raw
const { getInfo } = require('ytdl-core');
const fileType = require('file-type')
const https = require('https')
const axios = require('axios')
const {Message, VoiceState} = require('discord.js')
const {
  createAudioResource,
  demuxProbe,
  createAudioPlayer,
  AudioPlayerStatus,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
  VoiceConnectionDisconnectReason
} = require('@discordjs/voice')

//Basic functions
const wait = promisify(setTimeout)
const noop = () =>{}
function inChannel(guildId, channelId){
  let subscription = subscriptions.get(guildId)
  if(subscription){
    if(subscription.voiceConnection.joinConfig.channelId == channelId) return true
    else return false
  }
  else return null
}
function leaveInFive(guildId, channel, time = 300000) {
  pendingRemoval.push(guildId)
  setTimeout(() => {
    if(pendingRemoval.includes(guildId)){
      let subscription = subscriptions.get(guildId)
      if(subscription){
        subscription.voiceConnection.destroy()
        subscriptions.delete(guildId)
        return channel.send('Left the channel').then(u.clean)
      }
    }
    else return null
  }, time);
}

//Needed arrays
let pendingRemoval = []
const subscriptions = new Map()

//Cool things called classes that i dont use that often
class MusicSubscription {
  
  voiceConnection;
	audioPlayer;
	queue;
	queueLock = false;
	readyLock = false;

	constructor(voiceConnection, textChannel) {
		this.voiceConnection = voiceConnection;
    this.textChannel = textChannel
		this.audioPlayer = createAudioPlayer();
		this.queue = [];
    
		this.voiceConnection.on('stateChange', async (_, newState) => {
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
					/*
						If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						but there is a chance the connection will recover itself if the reason of the disconnect was due to
						switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						the voice connection.
					*/
					try {
            await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
						// Probably moved voice channel
					} catch {
						this.voiceConnection.destroy();
						// Probably removed from voice channel
					}
				} else if (this.voiceConnection.rejoinAttempts < 5) {
					/*
						The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
          */
					await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
					this.voiceConnection.rejoin();
				} else {
					/*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
          */
					this.voiceConnection.destroy();
				}
			} else if (newState.status === VoiceConnectionStatus.Destroyed) {
				/*
					Once destroyed, stop the subscription
        */
				this.stop();
			} else if (
				!this.readyLock &&
				(newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
			) {
				/*
					In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
					before destroying the voice connection. This stops the voice connection permanently existing in one of these
					states.
        */
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
				} catch {
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
				} finally {
					this.readyLock = false;
				}
			}
		});
		// Configure audio player
		this.audioPlayer.on('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
        // The queue is then processed to start playing the next track, if one is available.
        oldState.resource.metadata.onFinish()
        void this.processQueue()
			} else if (newState.status === AudioPlayerStatus.Playing){
        newState.resource.metadata.onStart()
      } 

		});

		this.audioPlayer.on('error', (error) => error.resource.metadata.onError(error));

		voiceConnection.subscribe(this.audioPlayer);
  }
  
  /**
   * Adds a new Track to the queue.
   *
   * @param track The track to add to the queue
   */
  enqueue(track) {
    this.queue.push(track);
    void this.processQueue();
  }

  /**
   * Stops audio playback and empties the queue
   */
  stop() {
    this.queueLock = true;
    this.queue = [];
    this.audioPlayer.stop(true);
  }

  /**
   * Attempts to play a Track from the queue
   */
  async processQueue() {
    if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) return;
    this.queueLock = true
    const nextTrack = this.queue.shift();
    try {
      const resource = await nextTrack.createAudioResource();
      this.audioPlayer.play(resource);
      this.queueLock = false
    } catch (error) {
      console.log(error)
      nextTrack.onError(error);
      this.queueLock = false
      this.processQueue();
    }
  }
}
class Track{
  url;
  title;
  onStart;
  onFinish;
  onError;
  type;
  constructor({url, title, onStart, onFinish, onError, type}){
    this.url = url
    this.title = title
    this.onStart = onStart,
    this.onFinish = onFinish,
    this.onError = onError,
    this.type = type
  }
  
  createAudioResource(){
    if(this.type == 'yt') return new Promise((resolve, reject)=>{
      const process = ytdl(this.url,
        {
          o: '-',
          q: '',
          f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
          r: '100K',
        },
        {stdio: ['ignore', 'pipe', 'ignore']},
      )
      if (!process.stdout) {
        reject(new Error('No stdout'));
        return;
      }
      const stream = process.stdout;
      const onError = error => {
        if(!process.killed) process.kill()
        stream.resume()
        reject(error)
      }
      process.once('spawn', async () => {
        demuxProbe(stream).then(probe => resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type })))
        .catch(onError);
      })
      .catch(onError);
    });
    else{
      try{
        let stream = new Promise(async(resolve, reject) =>{
          https.get(this.url, async stream =>{
            resolve(stream)
          })
        })
          //let probe = new Promise(async (res, rej) =>{
          //  let str = await demuxProbe(stream)
          //  res(str)
          //})
          return new Promise(async (resolve, reject) =>{
            try{
              let str = await stream
              let probe = await demuxProbe(str)
              resolve(createAudioResource(probe.stream, {metadata: this, inputType: probe.type}))
            }
            catch(e){
              console.log(e)
            }
          })
      } catch(e){console.log(e, 123)}
    } 
  }

  /**
     * Creates a Track from a video URL and lifecycle callback methods.
     * @param url The URL of the video
     * @param methods Lifecycle callbacks
     * @param deets Info
     * @returns The created Track
     */
  async from(url, methods, deets, type){
    const wrappedMethods = {
      onStart(){
        wrappedMethods.onStart = noop;
        methods.onStart();
      },
      onFinish(){
        wrappedMethods.onFinish = noop
        methods.onFinish();
      },
      onError(err){
        wrappedMethods.onError = noop
        methods.onError(err);
      }
    }

        return new Track({
            title: deets?.videoDetails?.title ?? 'Unknown',
            url,
      ...methods,
        type
        });
    }
}


Module.addCommand({name: 'play',
  onlyGuild: true,
  /**
   * @param {Message} msg
   * @param {string} url
   */
  process: async(msg, url) =>{
    url = msg.attachments.first()?.url || url
    let subscription = subscriptions.get(msg.guild.id)
    let type
    //check if valid url and what type of input is given
    try{
      await getInfo(url)
      type = 'yt'
    } catch{
      let p = new Promise(async (res, rej) =>{
        try{
          https.get(url, async stream =>{
            let {mime} = await fileType.fromStream(stream)
            res(mime?.includes('video') || mime?.includes('audio'))
          })
        } catch(e){
          console.log(e)
          res(false)
        }
      })
      if(await p == true) type = 'file'
    }
    if(!type) return u.reply(msg, 'You need to provide a valid youtube url')

    //anti-theft
    if(subscription && !inChannel(msg.guild.id, msg.member.voice.channelId)){
      if(!msg.member.permissions.has('ADMINISTRATOR')) return u.reply(msg, "I'm already being used in another channel!",true)
      else {
        console.log('not in same channel')
        subscription.voiceConnection.destroy()
        subscriptions.delete(msg.guild.id)
      }
    }
    
    //if no queue
    if(!subscription){
      if(msg.member.voice.channel){
        const channel = msg.member.voice.channel
        subscription = new MusicSubscription(
          joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
          }), msg.channel.id
        );
        subscription.voiceConnection.on('error', u.errorHandler)
        subscriptions.set(msg.guild.id, subscription)
      }
    }
    
    if(!subscription) return u.reply(msg, 'You need to be in a vc to play music!', true)
    
    //join channel
    try{
      await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3)
    } catch(e){
      console.log(e)
      return u.errorHandler(new Error(`Failed to join vc ${msg.member.voice.channel.id} within 20 seconds`), msg)
    }
    function getTitle(){
      if(msg.attachments.first()) return msg.attachments.first().name
      else return url.replace(/.*\d{18}\/\d{18}\//g, '').replace(/_/g, ' ')
    }
    //create track
    let info
    if(type == 'yt') info = await getInfo(url)
    else info = {videoDetails: {title: getTitle(), author: {name: msg.member.displayName, thumbnails: [{url: msg.author.displayAvatarURL()}]}, publishDate: null}, thumbnails: []}
    let {author, publishDate, thumbnails, title} = info.videoDetails
    const track = await Track.prototype.from(url, {
      onStart(){
        msg.reply({embeds: [
          u.embed().setTitle(`Now playing ${title}`)
            .setDescription(url)
            .setAuthor({ name: author.name ?? 'Unknown', iconURL: author.thumbnails[0].url ?? ''})
            .setThumbnail(thumbnails?.[0]?.url ?? '')
            .setTimestamp(new Date(publishDate) ?? '')
        ], allowedMentions: {repliedUser: false}, failIfNotExists: false})
      },
      onFinish(){
          //msg.reply('done')
        if(subscription?.queue.length == 0){
          try{
            subscriptions.delete(msg.guild.id)
            subscription.voiceConnection.destroy()
          } catch(e){}
        }
      },
      onError(error){
        return console.log(error)
        u.errorHandler(new Error(error), msg)
      }
    }, info, type)
    subscription.enqueue(track)
    //don't bother on the first track
    if(subscription.queue.length > 0) u.reply(msg, `${track.title} was added to the queue`)
  }
})
.addCommand({name: 'skip',
  onlyGuild: true,
  /**
   * @param {Message} msg
   * @param {string} url
   */
  process: async(msg, url)=>{
    let subscription = subscriptions.get(msg.guild.id)
    if(!inChannel(msg.guild.id, msg.member.voice.channelId)) return u.reply(msg, "You can't do that if we're not in the same vc!", true)
    if(subscription){
      if(msg.member.voice?.channel?.id == subscription)
      subscription.audioPlayer.pause()
      subscription.audioPlayer.stop()
      u.reply(msg, 'Skipped song!')
    }
    else u.reply(msg, "I'm not playing anything", true)
  }
})
.addCommand({name: 'queue',
  onlyGuild: true,
  /**
   * @param {Message} msg
   * @param {string} url
   */
  process: async(msg, url)=>{
    let subscription = subscriptions.get(msg.guild.id)
    if(!inChannel(msg.guild.id, msg.member.voice.channelId)) return u.reply(msg, "You can't do that if we're not in the same vc!", true)
    if(subscription){
      const current = subscription.audioPlayer.state.status == AudioPlayerStatus.Idle ? 'Nothing is playing' : `Playing: ${subscription.audioPlayer.state.resource.metadata.title}`
      const queue = subscription.queue.slice(0, 5).map((track, index) => `${index+1}] ${track.title}`).join('\n')
      u.reply(msg, `\`\`\`${current}\n\n${queue}\`\`\``)
    }
    else u.reply(msg, "There is no queue", true)
  }
})
.addCommand({name: 'pause',
  onlyGuild: true,
  /**
   * @param {Message} msg
   * @param {string} url
   */
  process: async(msg, args)=>{
    let subscription = subscriptions.get(msg.guild.id)
    if(!inChannel(msg.guild.id, msg.member.voice.channelId)) return u.reply(msg, "You can't do that if we're not in the same vc!", true)
    if(subscription){
      subscription.audioPlayer.pause()
      let prefix = await u.prefix(msg)
      await u.reply(msg, `I paused the music. If nobody uses \`${prefix}resume\` within 10 minutes, i'll leave the VC.`, true)
      leaveInFive(msg.guildId, msg.channel, 600000)
    }
    else u.reply(msg, "There isn't anything to pause", true)
  }
})
.addCommand({name: 'resume',
  onlyGuild: true,
  /**
   * @param {Message} msg
   * @param {string} url
   */
  process: async(msg, args)=>{
    let subscription = subscriptions.get(msg.guild.id)
    if(!inChannel(msg.guild.id, msg.member.voice.channelId)) return u.reply(msg, "You can't do that if we're not in the same vc!", true)
    if(subscription){
      if(pendingRemoval.includes(msg.guildId)) pendingRemoval = pendingRemoval.filter(a => a != msg.guildId)
      subscription.audioPlayer.unpause()
    }
    else u.reply(msg, "There isn't anything to resume", true)
  }
})
.addCommand({name: 'leave',
  onlyGuild: true,
  process: async(msg, args)=>{
    let subscription = subscriptions.get(msg.guild.id)
    if(!inChannel(msg.guild.id, msg.member.voice.channelId)) return u.reply(msg, "You can't do that if we're not in the same vc!", true)
    if(subscription){
      try{
        subscription.voiceConnection.destroy()
        subscriptions.delete(msg.guild.id)
      } catch(e){
        u.errorHandler(e, msg)
      }
      u.reply(msg, 'Left the channel', true)
    }
    else u.reply(msg, "I'm not in a vc", true)
  }
})

//leave after 5 mins unless someone else joins
.addEvent('voiceStateUpdate', /*** @param {VoiceState} oldState* @param {VoiceState} newState*/ (oldState, newState)=>{
  if(oldState.member.id != oldState.client.user.id){
    if(oldState.channelId && !newState.channelId){
      let subscription = subscriptions.get(oldState.guild.id)
      if(subscription){
        if(inChannel(oldState.guild.id, oldState.channelId)){
          if(oldState.channel.members.size == 1){
            subscription.audioPlayer.pause()
            let channel = oldState.guild.channels.cache.get(subscription.textChannel)
            channel.send("Looks like everyone's gone! If nobody returns within 5 minutes, i'll leave as well")
            leaveInFive(oldState.guild.id, channel)
          }
        }
      }
    }
    else if(!oldState.channelId && newState.channelId){
      let subscription = subscriptions.get(newState.guild.id)
      if(subscription && pendingRemoval.includes(newState.guild.id)){
        if(inChannel(newState.guild.id, newState.channelId)){
          pendingRemoval = pendingRemoval.filter(a => a != newState.guild.id)
          subscription.audioPlayer.unpause()
        }
      }
    }
  }
})

//splat
.addEvent('voiceStateUpdate', /*** @param {VoiceState} oldState * @param {VoiceState} newState*/ async(oldState, newState) =>{
  if(oldState.member.user.bot) return;
  if(newState.channel?.members.size < 2) return
  let subscription = subscriptions.get(oldState.guild.id)
  if(!subscription && ['408747484710436877', '779497076564164620', '371022006726164480'].includes(oldState.guild.id)){
    if(!oldState.channel && newState.channel){
      const channel = newState.channel
        subscription = new MusicSubscription(
          joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
          }), channel.id
        );
        subscription.voiceConnection.on('error', u.errorHandler)
        subscriptions.set(newState.guild.id, subscription)
      try{
        await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3)
      } catch{return console.log('err while joining')}
      
      let url = 'https://cdn.discordapp.com/attachments/789694239197626371/897536459941228584/heheheheh.mp4'
      if(oldState.guild.id == '371022006726164480') url = 'https://cdn.discordapp.com/attachments/511896528470802442/979232273553567745/user_joined.mp3'
      let track = await Track.prototype.from(url, {
        onStart(){},
        onFinish(){
          subscriptions.delete(newState.guild.id)
          subscription.voiceConnection.destroy()
        },
        onError(error){return console.log(error)}
      }, null, 'file')
      setTimeout(() => {
        subscription.enqueue(track)
      }, 1000);
    }
  }
})
.addCommand({ name: 'talk2', process: async (msg, args) => {
  const duck = require('uberduck.js');
  duck.setDetails(msg.client.config.apiKeys.uberduck.user, msg.client.config.apiKeys.uberduck.pass);
  const uuid = await duck.requestSpeak('jeremy-clarkson', args)
  console.log(uuid);
  const url = await duck.getLink(uuid)
  if (msg.member?.voice?.channel) {
    const channel = msg.member.voice.channel
    subscription = new MusicSubscription(
      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      }), channel.id
    );
    subscription.voiceConnection.on('error', u.errorHandler)
    subscriptions.set(msg.guild.id, subscription)
  try{
    await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3)
  } catch{return console.log('err while joining')}
  let track = await Track.prototype.from(url, {
    onStart(){},
    onFinish(){
      subscriptions.delete(msg.guild.id)
      subscription.voiceConnection.destroy()
    },
    onError(error){return console.log(error)}
  }, null, 'file')
  setTimeout(() => {
    subscription.enqueue(track)
  }, 1000);
  }
  else msg.reply({ files: [{ attachment: url, name: 'botspeak.mp3' }], failIfNotExists: false });
} })

module.exports = Module