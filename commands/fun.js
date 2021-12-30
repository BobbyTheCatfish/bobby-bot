const Augur = require('augurbot'),
    u = require('../utils/utils'),
    request = require('request')
const Module = new Augur.Module();
Module.addCommand({name: "8ball",
    aliases:["🎱"],
    category: "Fun",
    process: async(msg, args) =>{
        if(!args?.endsWith('?')) return msg.channel.send("you need to ask me a question, silly.")
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
.addCommand({name: "acronym",
    category: "Fun",
    process: async(msg, args)=>{
        let length = (args && !isNaN(args)) ? args : 4
        let alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"];
        let profanityFilter = require("profanity-matcher");
        let pf = new profanityFilter();
        let word = [];

        while (word.length == 0){
            for (var i = 0; i < length; i++) word.push(u.rand(alphabet));
            word = word.join("");
            if (pf.scan(word.toLowerCase()).length == 0) return msg.channel.send(`I've always wondered what __**${word}**__ stood for...`);
            else word = [];
        }
    }
})
.addCommand({name: "error", category: "Development", process: async (msg, args)=>{msg.reply(`To report a bug, submit a new issue at my github: ${Module.config.git}/issues`)}})
.addCommand({name: "flip",
    category: "Fun",
    process: async (msg, args) =>{
        if(!['heads', 'tails'].includes(args.toLowerCase())) return msg.reply("You need to specify heads or tails!").then(u.clean)
        let choice = Math.floor(Math.random()*2) == 1 ? 'heads' : 'tails'
        let won = (args.toLowercase() == choice) ? '🎉' : '❌'
        choice = (choice == 'heads') ? '💀' : '🪱'
        return msg.react(choice).then(msg.react(won))
    }
})
.addCommand({name: "impostor",
    category: "Fun",
    process: async (msg, args) =>{
        let impostor = Math.floor(Math.random() * 4)
        if(!args) return msg.channel.send('Who do you want to vote off?')
        return msg.channel.send(`⋆　　 •　          　ﾟ　                       　。
            　　.　　    　.　　　  　　.　　⋆　　   。　.
             　.  。　                     ඞ   。　    .      •
             •              ${args} was${impostor != 0 ? ' not' : ''} The Impostor    ⋆
            .             　 。　  ⋆                     .                     .`)
    }
})
.addCommand({name: "info",
    category: "General",
    process: async (msg, args) =>{
        let embed = u.embed()
        .setTitle('About BobbyTheCatfish')
        .setDescription(`***in the voice of my creator***\nHi! I'm BobbyTheCatfish. I've been building Bobby Bot as a side project to learn some coding skills. My 'main' focus is my YouTube channel, which is linked in this command, so take a look and maybe even subscribe!`)
        .setThumbnail(msg.client.users.cache.get(Module.config.ownerId).avatarURL())
        .setURL('https://www.youtube.com/channel/UCw8DLllFiJOmevgDznFiQZw')
        msg.channel.send({embeds: [embed]})
    }
})
.addCommand({name: "mewhen",
    category: "Fun",
    process: async (msg, args) =>{
        let words = args.toLowerCase().split(' ')
        let final = []
        if(!args) return msg.channel.send("You need to provide some context!")
        words.forEach(k => {
            if(k == 'am') k = 'are'
            else if(["i'm", "we're"].includes(k)) k = "they're"
            else if(["i've","we've"].includes(k)) k = "they've"
            else if(['mine', 'ours'].includes(k)) k = 'theirs'
            else if(['i', 'we'].includes(k)) k = 'they'
            else if(['my', 'our'].includes(k)) k = 'their'
            else if(k=='me') k = 'them'
            final.push(k)
        });
        msg.delete()
        return msg.channel.send(`${msg.member?.displayName ?? msg.author.username} when ${final.join(' ')}`, {files: ['media/mewhen.png']})
    }
})
.addCommand({name: "poll",
    category: "Fun",
    process: async (msg, args) =>{
        let words = args.split(' ').slice(0).join(' ')
        let options = words.split('|').map(o => o.trim());
        let title = options.shift();
        if(!title || options.length < 2 || options.length > 30) return msg.channel.send("You need a title and at least two options! (<Title>|<Option 1>|<Option 2>)")
        else{
            request({
                url: "https://www.strawpoll.me/api/v2/polls",
                headers: {"Content-Type": "application/json"},
                method: "POST",
                body: JSON.stringify({
                  title: title,
                  options: options,
                  multi: false,
                  dupcheck: "normal",
                  captcha: true
                })
            },(err, response, body) => {
            if (err) u.errorHandler(err, 'Poll Error');
            else{
                body = JSON.parse(body);
                let embed = u.embed()
                    .setAuthor(`New poll from ${msg.member?.displayName ?? msg.author.username}`)
                    .setTimestamp()
                    .setTitle(decodeURI(body.title))
                    .setURL(`https://www.strawpoll.me/${body.id}`)
                    .setDescription("Vote now!\n" + body.options.map(o => "· " + decodeURI(o)).join("\n"));
                msg.channel.send({embeds: [embed]});
                }
            });
        }
    }
})
.addCommand({name: "rock",
    aliases: ['paper','scissors','rps'],
    category: "Fun",
    process: async (msg, args) =>{
        let decision = Math.floor(Math.random()*3),
            emoji2 = await msg.react(['🪨','📰','✂️'][decision]),
            choice = (await u.parse(msg)).command,
            choices = ['rock','paper','scissors']
        if(choice.toLowerCase() != 'rps') choice = choices.indexOf(choice.toLowerCase())
        else if(!choices.includes(args?.toLowerCase())) return msg.reply("You need to specify rock, paper, or scissors.")
        else choice = choices.indexOf(args.toLowerCase())
        if(choice == decision) return await msg.react('👔').then(emoji2)
        else if(choice > decision || (choice == 0 && decision ==2)) return await msg.react('🎉').then(emoji2)
        else return await msg.react('❌').then(emoji2)
    }
})
.addCommand({name: "roll",
    category: "Fun",
    process: async (msg, args) =>{
        try{
            let numDies=1,
            numSides = args || 6
            if(!(2 < args < 99) && !args.toLowerCase().includes('d')) return msg.channel.send("That's not a valid die! You need to specify a number between 2 and 99")
            else if(args.toLowerCase().includes('d')){
                let many = args.toLowerCase().split('d')
                if(many[2] || isNaN(many[0]) || many[1] ? isNaN(many[1]) : isNaN(many[0])) return msg.channel.send("To use multiple dice, do `2d20`, replacing 2 with the number you want.")
                numDies=args.split('d')[0] || 1
                numSides=args.split('d')[1] || 6
            }
            else if(!(2 < args < 99)) return msg.channel.send("That's not a valid die! You need to specify a number between 2 and 99")
            let diceRoll = (Math.floor(Math.random() * (Math.floor(numSides)*Math.floor(numDies)))+1)/numDies,
                diceEmote = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'],
                diceEmote2 =['0️⃣','784591469196345345','784591457054621717','784591457109147709','784591457302478878','784591457293303808','784591457259356171','784591457239040000','784591457768046592','784591456782254101'],
                e1 = diceEmote[diceRoll.toString().charAt(0)],
                e2 = diceEmote2[diceRoll.toString().charAt(1)]
            if(diceRoll == 10){e1=diceEmote[10];e2=null}
            await msg.react(e1)
            if(e2) await msg.react(e2)
        }catch(err){u.errorHandler('Die Roll', err)}
    }
})
.addCommand({name: "enlarge",
    aliases:['e','embiggen'],
    category: "Fun",
    process: async (msg, args) =>{
        console.log('run')
        const twemoji = require('@discordapp/twemoji')
        const Jimp = require('jimp')
        function getUnicode(emoji) {
            console.log('unicode')
            let parse = JSON.stringify(twemoji.parse(emoji))
            return parse?.match(/https:\/\/twemoji\.maxcdn\.com\/v\/.*.png/)?.[0]
        }
        let test = /<(a?):\w+:(\d+)>/i;
        let cols = 1
        let rows = args.split('\n').map(j => j.split(' ').filter(a => a != '' && a != ' '))
        console.log('rows', rows)
        for(x of rows) if(x.length > cols) cols = x.length
        console.log('cols length set', cols)
        if(rows.length == 1 && cols == 1){
            console.log('one')
            let id = test.exec(args)
            let link = getUnicode(args)
            if(id) link ??= `https://cdn.discordapp.com/emojis/${id[2]}.${id[1] ?'gif':'png'}`
            if(link) return msg.reply({files: [link]})
            else return msg.reply("I need a valid emoji!")
        }
        if(rows.length > 5 || cols >= 5) return msg.channel.send("That's too many emojis! You're limited to a 5x5 grid.")
        if(!args.replace(/[\[\] ]/g, '')) return msg.channel.send(`You need to supply emojis!`)
        let canvas = new Jimp(150 * cols, 150 * rows.length, 0x00000000)
        rows.forEach(async (y, o) =>{
            y.forEach(async (x, a) =>{
                let id = test.exec(x)
                if(x == '[]'){}
                else if(id){
                    let image = await u.validImage(`https://cdn.discordapp.com/emojis/${id[2]}.png`)
                    if(!image) return msg.reply(`I couldn't enlarge ${x}`)
                    await image.resize(150, 150)
                    await canvas.blit(image, 150 * a, 150 * o)
                }
                else if(id = getUnicode(args)){
                    let image = await u.validImage(id)
                    if(!image) return msg.reply(`I couldn't enlarge ${x}`)
                    await image.resize(150, 150)
                    await canvas.blit(image, 150 * a, 150 * o)
                }
                if(o == (rows.length - 1) && a == (cols - 1)) return await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]})
            })
        })
    }
})
.addCommand({name: "shop",
    category: "General",
    process: async (msg, args) =>{
        msg.channel.send('https://teespring.com/stores/bobbys-gift-shop')
    }
})
.addCommand({name: "repo",
    category: "Development",
    process: async(msg, suffix)=>{
        msg.channel.send('You can find my repository here: https://github.com/BobbyTheCatfish/bobby-bot')
    }
})
.addCommand({name: 'talk', process: async(msg, args)=>{
    const duck = require('uberduck.js')
    duck.setDetails('pub_quqovcwdgcnkonfmkv', 'pk_b738ccda-f06b-4b7d-aba6-73ddf84039db')
    let link = await duck.downloadSpeak(await duck.requestSpeak('wheatley', args))
    msg.reply({files: [{attachment: link, name: 'botspeak.mp3'}], failIfNotExists: false})
}})
.addEvent('messageCreate', msg =>{
    let link = u.validUrl(msg.content)
    let badLink = 'media.discordapp.net'
    let vids = ['mp4','mov','avi','m4v']
    if(link && link.includes(badLink) && vids.includes(link.toLowerCase().slice(link.length - 3))) msg.reply(`\`${badLink}\` moment\n${link.replace(badLink, 'cdn.discordapp.com')}`)
    if(msg.content.includes('<:dkHotFace:845140861846290452>') || msg.content.includes('<:theantiohgo:915407691923464233>')) msg.reply('https://tenor.com/view/modern-family-spray-squirt-annoyed-irritated-gif-4445288')
})
module.exports = Module
