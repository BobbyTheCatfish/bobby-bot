const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    axios = require('axios'),
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

          "Reply hazy, try again.",
          "Ask again later.",
          "Better not tell you now.",
          "Cannot predict now.",
          "Concentrate and ask again.",
          "Perhaps.",
          "Why ask me?",

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
        let length = 4
        if(args && !isNaN(args)) length = args
        let alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"];
        let profanityFilter = require("profanity-matcher");
        let pf = new profanityFilter();
        let word = [];

        while (word.length == 0){
            for (var i = 0; i < length; i++) word.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            word = word.join("");
            if (pf.scan(word.toLowerCase()).length == 0) return msg.channel.send("I've always wondered what __**" + word + "**__ stood for...");
            else word = [];
        }
    }
})
.addCommand({name: "error", category: "Development", process: async (msg, args)=>{msg.reply(`To report a bug, submit a new issue at my github: ${Module.config.git}/issues`)}})
.addCommand({name: "flip",
    category: "Fun",
    process: async (msg, args) =>{
        let flip = Math.floor(Math.random()*2)
        if(msg.guild?.id == '408747484710436877' && msg.member.hasPermission('ADMINISTRATOR')) flip = Math.floor(Math.random()*10)
        if(args.toLowerCase() == 'heads'){
            if(flip >=1) return msg.react('💀').then(msg.react('🎉'))
            else return msg.react('🪱').then(msg.react('❌'))
        }
        else if(args.toLowerCase() == 'tails'){
            if(flip >=1) return msg.react('🪱').then(msg.react('🎉'));
            else return msg.react('💀').then(msg.react('❌'))
        }
        else return msg.reply('You need to specify heads or tails!').then(u.clean)
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
        msg.channel.send({embed})
    }
})
.addCommand({name: "personal",
    category: "Fun",
    process: async (msg) =>{
        const Jimp = require('jimp')
        let image = await Jimp.read('https://cdn.discordapp.com/attachments/789694239197626371/808446253737181244/personal.png')
        let target = await Jimp.read((msg.mentions.members.first() ? msg.mentions.members.first().user : msg.author).displayAvatarURL({format: 'png', size: 512}))
        let mask = await Jimp.read('media/flexmask.png')
        mask.resize(350,350)
        target.resize(350, 350).mask(mask)
        image.blit(target, 1050, 75)
        return await msg.channel.send({files: [await image.getBufferAsync(Jimp.MIME_PNG)]})
    }
})
.addCommand({name: "mewhen",
    category: "Fun",
    process: async (msg, args) =>{
        let words = args.toLowerCase().split(' ')
        let final = []
        if(!args) return msg.channel.send("You need to provide some context!")
        words.forEach(k => {
            if(k == 'i' || k == 'we') k = 'they'
            else if(k == 'am') k = 'are'
            else if(k == "i'm" || k == "we're") k = "they're"
            else if(k == "i've" || k == "we've") k = "they've"
            else if(k=='my' || k=='our') k = 'their'
            else if(k=='mine' || k=='ours') k = 'theirs'
            else if(k=='me') k = 'them'
            final.push(k)
        });
        msg.delete()
        return msg.channel.send(`${msg.member ? msg.member.displayName : msg.author.username} when ${final.join(' ')}`, {files: ['media/mewhen.png']})
    }
})
.addCommand({name: "poll",
    category: "Fun",
    process: async (msg, args) =>{
        let words = args.split(' ')
        let keywads = words.slice(0).join(' ')
        let options = keywads.split('|').map(o => o.trim());
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
                    .setAuthor(`New poll from ${msg.guild?.displayName || msg.author.username}`)
                    .setTimestamp()
                    .setTitle(decodeURI(body.title))
                    .setURL(`https://www.strawpoll.me/${body.id}`)
                    .setDescription("Vote now!\n" + body.options.map(o => "· " + decodeURI(o)).join("\n"));
                msg.channel.send(embed);
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
        const unicode = require('emoji-unicode')
        const Jimp = require('jimp')
        const svgToImg = require('svg-to-img')
        let test = /<(a?):\w+:(\d+)>/i;
        let rows = []
        let cols = 1
        for(x of args.split('\n')){
            let j = []
            for(y of x.split(' ')) if(y != '' && y != ' ') j.push(y)
            rows.push(j.join(' '))
        }
        for(x of rows) if(x.split(' ').length > cols) cols = x.split(' ').length
        if(rows.length == 1 && cols == 1){
            let id = test.exec(args)
            if(id) return msg.channel.send({files: [`https://cdn.discordapp.com/emojis/${id[2]}.${id[1] ?'gif':'png'}`]})
        }
        if(rows.join(' ').split(' ').length > 25) return msg.channel.send("That's too many emojis! The limit is 25.")
        if(!args.replace(/[\[\] ]/g, '')) return msg.channel.send(`You need to supply emojis!`)
        let canvas = new Jimp(150 * cols, 150 * rows.length, 0x00000000)
        let o = 1, a = 0 //o=y, a=x
        for (y of rows) {
            for(x of y.split(' ')){
                let id = test.exec(x)
                if(x == '[]'){
                    let image = new Jimp(150, 150, 0x00000000)
                    canvas.blit(image, 150 * a, 150 * (o-1))
                }
                else if(id){
                    let image
                    try{image = await Jimp.read(`https://cdn.discordapp.com/emojis/${id[2]}.${(id[1] ? "gif" : "png")}`)}catch{msg.channel.send(`I couldn't enlarge the emoji ${x}.`);break}
                    image.resize(150, 150)
                    canvas.blit(image, 150 * a, 150 * (o-1))
                }
                else if(unicode(x)){
                    let requested
                    try{requested = await axios.get(`https://twemoji.maxcdn.com/v/latest/svg/${unicode(x).replace(/ /g, '-')}.svg`)}catch{try{requested = await axios.get(`https://twemoji.maxcdn.com/v/latest/svg/${unicode(x).replace(/ /g, '-')}.svg`)}catch{msg.channel.send(`I couldn't enlarge the emoij ${x}.`);break}}
                    let toPng = await svgToImg.from(requested.data).toPng()
                    let image = await Jimp.read(toPng)
                    canvas.blit(image, 150 * a, 150 * (o-1))
                }
                else{msg.channel.send(`${x} isn't a valid emjoji.`); break}
                a++
                if(a == y.split(' ').length && o == rows.length) return await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]})
                if(a == y.split(' ').length){a=0;o++}   
            }
        }
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
module.exports = Module
