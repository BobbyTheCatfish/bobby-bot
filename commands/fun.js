/* eslint-disable no-irregular-whitespace */
const Augur = require('augurbot'),
  u = require('../utils/utils'),
  request = require('request');
const Module = new Augur.Module();
Module.addCommand({ name: "8ball",
  aliases:["🎱"],
  category: "Fun",
  process: async (msg, args) => {
    if (!args?.endsWith('?')) return msg.channel.send("you need to ask me a question, silly.");
    const outcomes = [
      "It is certain.",
      "It is decidedly so.",
      "Without a doubt.",
      "Yes - definitely.",
      "You may rely on it.",

      "As I see it, yes.",
      "Most likely.",
      "Outlook good.",
      "Yes.",
      "Signs point to yes.",

      "Ask again later.",
      "Better not tell you now.",
      "Cannot predict now.",
      "Concentrate and ask again.",
      "Perhaps.",

      "Don't count on it.",
      "My reply is no.",
      "My sources say no.",
      "Outlook not so good.",
      "Very doubtful."
    ];
    return msg.reply(u.rand(outcomes));
  }
})
.addCommand({ name: "acronym",
  category: "Fun",
  process: async (msg, args) => {
    const length = (args && !isNaN(args)) ? args : 4;
    const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"];
    const profanityFilter = require("profanity-matcher");
    const pf = new profanityFilter();
    let word = [];

    while (word.length == 0) {
      for (let i = 0; i < length; i++) word.push(u.rand(alphabet));
      word = word.join("");
      if (pf.scan(word.toLowerCase()).length == 0) return msg.channel.send(`I've always wondered what __**${word}**__ stood for...`);
      else word = [];
    }
  }
})
.addCommand({ name: "error", category: "Development", process: async (msg) => {msg.reply(`To report a bug, submit a new issue at my github: ${Module.config.git}/issues`);} })
.addCommand({ name: "flip",
  category: "Fun",
  process: async (msg, args) => {
    if (!['heads', 'tails'].includes(args.toLowerCase())) return msg.reply("You need to specify heads or tails!").then(u.clean);
    let choice = Math.floor(Math.random() * 2) == 1 ? 'heads' : 'tails';
    const won = (args.toLowercase() == choice) ? '🎉' : '❌';
    choice = (choice == 'heads') ? '💀' : '🪱';
    return msg.react(choice).then(msg.react(won));
  }
})
.addCommand({ name: "impostor",
  category: "Fun",
  process: async (msg, args) => {
    const impostor = Math.floor(Math.random() * 4);
    if (!args) return msg.channel.send('Who do you want to vote off?');
    return msg.channel.send(`⋆　　 •　          　ﾟ　                       　。
            　　.　　    　.　　　  　　.　　⋆　　   。　.
             　.  。　                     ඞ   。　    .      •
             •              ${args} was${impostor != 0 ? ' not' : ''} The Impostor    ⋆
            .             　 。　  ⋆                     .                     .`);
  }
})
.addCommand({ name: "info",
  category: "General",
  process: async (msg) => {
    const embed = u.embed()
        .setTitle('About BobbyTheCatfish')
        .setDescription(`***in the voice of my creator***\nHi! I'm BobbyTheCatfish. I've been building Bobby Bot as a side project to learn some coding skills. My 'main' focus is my YouTube channel, which is linked in this command, so take a look and maybe even subscribe!`)
        .setThumbnail(msg.client.users.cache.get(Module.config.ownerId).avatarURL())
        .setURL('https://www.youtube.com/channel/UCw8DLllFiJOmevgDznFiQZw');
    msg.channel.send({ embeds: [embed] });
  }
})
.addCommand({ name: "mewhen",
  category: "Fun",
  process: async (msg, args) => {
    const words = args.toLowerCase().split(' ');
    if (!args) return msg.channel.send("You need to provide some context!");
    if (await u.hasLang(msg, args)) return;
    words.forEach((k, i) => {
      if (k == 'am') k = 'are';
      else if (["i'm", "we're"].includes(k)) k = "they're";
      else if (["i've", "we've"].includes(k)) k = "they've";
      else if (['mine', 'ours'].includes(k)) k = 'theirs';
      else if (['i', 'we'].includes(k)) k = 'they';
      else if (['my', 'our'].includes(k)) k = 'their';
      else if (k == 'me') k = 'them';
      words[i] = k;
    });
    msg.delete();
    return msg.channel.send(`${msg.member?.displayName ?? msg.author.username} when ${words.join(' ')}`, { files: ['media/mewhen.png'] });
  }
})
.addCommand({ name: "poll",
  category: "Fun",
  process: async (msg, args) => {
    const words = args.split(' ').slice(0).join(' ');
    const options = words.split('|').map(o => o.trim());
    const title = options.shift();
    if (!title || options.length < 2 || options.length > 30) {return msg.channel.send("You need a title and at least two options! (<Title>|<Option 1>|<Option 2>)");} else {
      request({
        url: "https://www.strawpoll.me/api/v2/polls",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          title: title,
          options: options,
          multi: false,
          dupcheck: "normal",
          captcha: true
        })
      }, (err, response, body) => {
        if (err) {u.errorHandler(err, 'Poll Error');} else {
          body = JSON.parse(body);
          const embed = u.embed()
                    .setAuthor(`New poll from ${msg.member?.displayName ?? msg.author.username}`)
                    .setTimestamp()
                    .setTitle(decodeURI(body.title))
                    .setURL(`https://www.strawpoll.me/${body.id}`)
                    .setDescription("Vote now!\n" + body.options.map(o => "· " + decodeURI(o)).join("\n"));
          msg.channel.send({ embeds: [embed] });
        }
      });
    }
  }
})
.addCommand({ name: "rock",
  aliases: ['paper', 'scissors', 'rps'],
  category: "Fun",
  process: async (msg, args) => {
    const decision = Math.floor(Math.random() * 3);
    const emoji2 = await msg.react(['🪨', '📰', '✂️'][decision]);
    let choice = (await u.parse(msg)).command;
    const choices = ['rock', 'paper', 'scissors'];
    if (choice.toLowerCase() != 'rps') choice = choices.indexOf(choice.toLowerCase());
    else choice = choices.indexOf(args?.toLowerCase());
    if (!choice || choice < 0) return msg.reply("You need to specify rock, paper, or scissors.");
    if (choice == decision) return await msg.react('👔').then(emoji2);
    else if (choice > decision || (choice == 0 && decision == 2)) return await msg.react('🎉').then(emoji2);
    else return await msg.react('❌').then(emoji2);
  }
})
.addCommand({ name: "roll",
  category: "Fun",
  process: async (msg, args) => {
    let numDies = 1,
      numSides = (isNaN(args) || args < 2) ? 6 : args;
    if (args.toLowerCase().includes('d')) {
      const parsed = args.toLowerCase().split('d');
      if (parsed[2] || isNaN(parsed[0]) || isNaN(parsed[1])) return msg.channel.send("To use multiple dice, do `2d10`, replacing 2 with the number of dice and 10 with the number of sides.");
      numDies = parsed[0] || 1;
      numSides = parsed[1] || 6;
    }
    if (!(numSides > 2 < 99)) return msg.channel.send("That's not a valid die! There has to be between 2 and 99 sides");
    const diceRoll = (Math.floor(Math.random() * numSides * numDies) + 1) / numDies;
    const diceEmote = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const diceEmote2 = ['0️⃣', '784591469196345345', '784591457054621717', '784591457109147709', '784591457302478878', '784591457293303808', '784591457259356171', '784591457239040000', '784591457768046592', '784591456782254101'];
    let e1 = diceEmote[diceRoll.toString().charAt(0)];
    let e2 = diceEmote2[diceRoll.toString().charAt(1)];
    if (diceRoll == 10) {
      e1 = diceEmote[10];
      e2 = null;
    }
    await msg.react(e1);
    if (e2) await msg.react(e2);
  }
})
.addCommand({ name: "enlarge",
  aliases:['e', 'embiggen'],
  category: "Fun",
  process: async (msg, args) => {
    console.log('run');
    const twemoji = require('@discordapp/twemoji');
    const Jimp = require('jimp');
    function getUnicode(emoji) {
      const parse = JSON.stringify(twemoji.parse(emoji));
      return parse?.match(/https:\/\/twemoji\.maxcdn\.com\/v\/.*.png/)?.[0];
    }
    if (!args) return msg.reply("You need to supply emojis!");
    let cols = 1;
    const rows = args.split('\n').map(j => j.split(' ').filter(a => a != '' && a != ' '));
    for (const x of rows) if (x.length > cols) cols = x.length;
    if (rows.length == 1 && cols == 1) {
      const discordLink = u.getEmoji(args)?.link;
      const link = getUnicode(args) ?? discordLink;
      if (link) return msg.reply(link);
      else return msg.reply("I need a valid emoji!");
    }
    if (rows.length > 5 || cols > 5) return msg.channel.send("That's too many emojis! You're limited to a 5x5 grid.");
    // eslint-disable-next-line no-useless-escape
    if (args.replace(/[\[\] ]/g, '')?.length < 1) return msg.channel.send(`You need to supply emojis!`);
    const canvas = new Jimp(150 * cols, 150 * rows.length, 0x00000000);
    rows.forEach(async (y, o) => {
      await new Promise((res) => {
        y.forEach(async (x, a) => {
          let id = u.getEmoji(x)?.id;
          let image;
          if (x == '[]') {
            if (a == (cols - 1)) res();
            else return;
          } else if (id) {
            image = await u.validImage(`https://cdn.discordapp.com/emojis/${id}.png`);
          } else if (id = getUnicode(args)) {image = await u.validImage(id);}
          if (!image) return msg.reply(`I couldn't enlarge ${x}`);
          image.resize(image.getHeight > image.getWidth ? (Jimp.AUTO, 150) : (150, Jimp.AUTO));
          canvas.blit(image, 150 * a, 150 * o);
          if (a == (cols - 1)) res();
        });
      });
      if (y == (rows.length - 1)) return await msg.channel.send({ files: [await canvas.getBufferAsync(Jimp.MIME_PNG)] });
    });
  }
})
.addCommand({ name: "shop",
  category: "General",
  process: async (msg) => {
    msg.reply('https://teespring.com/stores/bobbys-gift-shop');
  }
})
.addCommand({ name: "repo",
  category: "Development",
  process: async (msg) => {
    msg.reply('You can find my repository here: https://github.com/BobbyTheCatfish/bobby-bot');
  }
})
.addCommand({ name: 'talk', process: async (msg, args) => {
  const duck = require('uberduck.js');
  duck.setDetails(msg.client.config.uberduck.user, msg.client.config.uberduck.pass);
  const link = await duck.downloadSpeak(await duck.requestSpeak('wheatley', args));
  msg.reply({ files: [{ attachment: link, name: 'botspeak.mp3' }], failIfNotExists: false });
} })
.addEvent('messageCreate', msg => {
  const link = u.validUrl(msg.content);
  const badLink = 'media.discordapp.net';
  const vids = ['mp4', 'mov', 'avi', 'm4v'];
  if (link && link.includes(badLink) && vids.includes(link.toLowerCase().slice(link.length - 3))) msg.reply(`\`${badLink}\` moment\n${link.replace(badLink, 'cdn.discordapp.com')}`);
  if (msg.content.includes('<:dkHotFace:845140861846290452>') || msg.content.includes('<:theantiohgo:915407691923464233>')) msg.reply('https://tenor.com/view/modern-family-spray-squirt-annoyed-irritated-gif-4445288');
});
module.exports = Module;
