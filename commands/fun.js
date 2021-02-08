const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors'),
    axios = require('axios')
const Module = new Augur.Module();
Module.addCommand({name: "8ball",
    aliases:["🎱"],
    category: "Images",
    process: async(message, args) =>{
        if(!args || !args.endsWith('?')) return message.channel.send("you need to ask me a question, silly.")
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

          "Don't count on it.",
          "My reply is no.",
          "My sources say no.",
          "Outlook not so good.",
          "Very doubtful."
        ];
        return message.reply(outcomes[Math.floor(Math.random() * outcomes.length)]);
    }
})
.addCommand({name: "acronym",
    category: "Images",
    process: async(message, args)=>{
        let alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"];
        let len = Math.floor(Math.random() * 3) + 3;
        let profanityFilter = require("profanity-matcher");
        let pf = new profanityFilter();
        let word = [];

        while (word.length == 0){
            for (var i = 0; i < len; i++) word.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            word = word.join("");
            if (pf.scan(word.toLowerCase()).length == 0) return message.channel.send("I've always wondered what __**" + word + "**__ stood for...");
            else word = [];
        }
    }
})
.addCommand({name: "errormsg",
    process: async (message, args)=>{
        message.reply(
`
Oh nooooooo, an error totally just occurred while running that command: \`ReferenceError: something is not defined¯\\_(ツ)_/¯ \`
You should always receive this error while running the command.
You can contact ${msg.client.users.cache.get(Module.config.ownerId).tag} in this server: ${Module.config.mainServer}
`
        )
    }
})
.addCommand({name: "flip",
    process: async (message, args) =>{
        let flip = Math.floor(Math.random()*2)
        if(message.guild.id == '408747484710436877' && message.member.hasPermission('ADMINISTRATOR')) flip = Math.floor(Math.random()*10)
        if(args.toLowerCase() == 'heads'){
            if(flip >=1) return message.react('💀').then(message.react('🎉'))
            else return message.react('🪱').then(message.react('❌'))
        }
        if(args.toLowerCase() == 'tails'){
            if(flip >=1) return message.react('🪱').then(message.react('🎉'));
            else return message.react('💀').then(message.react('❌'))
        }
        else if(message.content.toLowerCase().includes('heads') && message.content.toLowerCase().includes('tails')) return message.reply('smh stop trying to cheat').then(u.clean)
        else return message.reply('You need to specify heads or tails!').then(u.clean)
    }
})
.addCommand({name: "impostor",
    process: async (message, args) =>{
        let impostor = Math.floor(Math.random() * 4)
        if(!args) return message.channel.send('Who do you want to vote off?')
        let target = message.guild ? (message.mentions.members.first()?message.mentions.members.first().displayName:args) : (message.mentions.users.first()?message.mentions.members.first().displayName:args)
        if(impostor == 0) return message.channel.send(`⋆　　 •　          　ﾟ　                       　。
            　　.　　    　.　　　  　　.　　⋆　　   。　.
             　.  。　                     ඞ   。　    .      •
             •              ${target} was The Impostor    ⋆
            .             　 。　  ⋆                     .                     .`)
        else return message.channel.send(`⋆　　 •　          　ﾟ　                       　。
          　　.　　    　.　　　  　　.　　⋆　　   。　.
           　.  。　                     ඞ   。　    .      •
           •              ${target} was not The Impostor    ⋆
          .             　 。　  ⋆                     .                     .`)
          
    }
})
.addCommand({name: "info",
    process: async (message, args) =>{
        let embed = u.embed()
        .setTitle('About BobbyTheCatfish')
        .setDescription(`***In the voice of my creator*** \n Hey! I'm BobbyTheCatfish, a streamer and YouTube creator based in NC. I'm currently reviewing Persona 5 the Animation, so make sure to check that out!`)
        .setColor('#00ff04')
        .setThumbnail(message.client.users.cache.get(Module.config.ownerId).avatarURL())
        .setURL('https://www.youtube.com/channel/UCw8DLllFiJOmevgDznFiQZw')
        message.channel.send({embed})
    }
})
.addCommand({name: "mewhen",
    process: async (message, args) =>{
        let words = args.toLowerCase().split(' ')
        let final = []
        if(!args) return message.channel.send("You need to provide some context!")
        words.forEach(k => {
            if(k == 'i') k = 'they'
            else if(k == 'am') k = 'are'
            else if(k=='my' || k=='our') k = 'their'
            else if(k=='mine' || k=='ours') k = 'theirs'
            else if(k=='me') k = 'them'
            final.push(k)
        });
        message.delete()
        return message.channel.send(message.author.username + ' when ' + final.join(' '), {files: ['media/mewhen.png']})
    }
})
.addCommand({name: "poll",
    process: async (message, args) =>{
        let words = args.split(' ')
        let keywads = words.slice(0).join(' ')
        let options = keywads.split('|').map(o => o.trim());
        let title = options.shift();
        if(!title || options.length < 2 || options.length > 30) return message.channel.send("You need a title and at least two options! (<Title>|<Option 1>|<Option 2>)")
        else{
            request({
                url: "https://www.strawpoll.me/api/v2/polls",
                headers: {"Content-Type": "application/json"},
                method: "POST",
                body: JSON.stringify({
                  title: title,
                  options: options,
                  multi: true,
                  dupcheck: "normal",
                  captcha: true
                })
            },(err, response, body) => {
            if (err) console.log(err);
            else{
                body = JSON.parse(body);
                let embed = u.embed()
                    .setAuthor("New poll from " + message.author.username)
                    .setTimestamp()
                    .setTitle(decodeURI(body.title))
                    .setURL(`https://www.strawpoll.me/${body.id}`)
                    .setDescription("Vote now!\n" + body.options.map(o => "· " + decodeURI(o)).join("\n"));
                message.channel.send(embed);
                }
            });
        }
    }
})
.addCommand({name: "rock",
    aliases: ['paper','scissors','rps'],
    process: async (message, args) =>{
        let decision = Math.floor(Math.random()*3)
        let emoji2
        if(decision == 0) emoji2 = await message.react('🪨')
        if(decision == 1) emoji2 = await message.react('📰')
        if(decision == 2) emoji2 = await message.react('✂️')
        let choice = (await u.parse(message)).command
        if(choice.toLowerCase() != 'rps'){
            if(choice.toLowerCase() == 'rock') choice = 0
            else if(choice.toLowerCase() == 'paper') choice = 1
            else if(choice.toLowerCase() == 'scissors') choice = 2
        }
        else if(!args || ['rock','paper','scissors'].includes(args.toLowerCase)) return message.reply("You need to specify which one you want to choose!")
        else{
            if(args.toLowerCase() == 'rock') choice = 0
            else if(args.toLowerCase() == 'paper') choice = 1
            else if(args.toLowerCase() == 'scissors') choice = 2
            else return message.channel.send("You need to specify rock, paper, or scissors.")
        }

        if(choice == decision) return await message.react('👔').then(emoji2)
        if(choice > decision || (choice == 0 && decision ==2)) await message.react('🎉').then(emoji2)
        else return await message.react('❌').then(emoji2)
    }
})
.addCommand({name: "roll",
    process: async (message, args) =>{
        try{
            let numDies=1
            let numSides = args || 6
            if((numSides < 2 || numSides > 99) && !args.toLowerCase().includes('d')) return message.channel.send("That's not a valid die! You need to specify a number between 2 and 99")
            else if(args.toLowerCase().includes('d')){
                let many = args.toLowerCase().split('d')
                if(many[2] || isNaN(many[0]) || many[1] ? isNaN(many[1]) : isNaN(many[0])) return message.channel.send("To use multiple dice, do `2d2`, replacing 2 with the number you want.")
                numDies=args.split('d')[0] || 1
                numSides=args.split('d')[1] || 6
            }
            let diceRoll = (Math.floor(Math.random() * (Math.floor(numSides)*Math.floor(numDies)))+1)/numDies
            let diceEmote = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
            let diceEmote2 =['0️⃣','784591469196345345','784591457054621717','784591457109147709','784591457302478878','784591457293303808','784591457259356171','784591457239040000','784591457768046592','784591456782254101']
            let e1 = diceEmote[diceRoll.toString().charAt(0)]
            let e2 = diceEmote2[diceRoll.toString().charAt(1)]
            if(diceRoll == 10){e1=diceEmote[10];e2=null}

            await message.react(e1)
            if(e2) await message.react(e2)
        }catch(err){u.errorHandler('Die Roll', err)}
    }
})
.addCommand({name: "enlarge",
    aliases:['e','embiggen'],
    process: async (message, args) =>{
        const unicode = require('emoji-unicode')
        const Jimp = require('jimp')
        const svgToImg = require('svg-to-img')
        let test = /<(a?):\w+:(\d+)>/i;
        let rows = []
        let cols = 1
        for(x of args.split('\n')){
            if(x.endsWith(' ')) rows.push(x.slice(0, -1))
            else rows.push(x)
            if(x.split(' ').length > cols) cols = x.split(' ').length
        }
        if(rows.length * cols.length > 25) return message.channel.send("That's too many emojis! The limit is 25.")
        let canvas = new Jimp(150 * cols, 150 * rows.length, 0x00000000)
        let o = 1, a = 0 //o=y, a=x
        for (y of rows) {
            for(x of y.split(' ')){
                let id = test.exec(x)
                if(id){
                    let image
                    try{await Jimp.read(`https://cdn.discordapp.com/emojis/${id[2]}.${(id[1] ? "gif" : "png")}`)}catch{message.channel.send(`I couldn't enlarge the emoji ${x}`);break}
                    image.resize(150, 150)
                    canvas.blit(image, 150 * a, 150 * (o-1))
                }
                else{
                    let requested
                    try{requested = await axios.get(`https://twemoji.maxcdn.com/v/latest/svg/${unicode(x).replace(/ fe0f/g, '').replace(/ /g, '-')}.svg`)}catch{message.channel.send(`I couldn't enlarge the emoij ${x}.`);break}
                    let toPng = await svgToImg.from(requested.data).toPng()
                    let image = await Jimp.read(toPng)
                    canvas.blit(image, 150 * a, 150 * (o-1))
                }
                a++
                if(a == y.split(' ').length && o == rows.length) return await message.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]})
                if(a == y.split(' ').length){a=0;o++}   
            }
        }
    }
})
.addCommand({name: "shop",
    process: async (message, args) =>{
        message.channel.send('https://teespring.com/stores/bobbys-gift-shop')
    }
})
.addCommand({name: "repo",
    process: async(msg, suffix)=>{
        msg.channel.send('You can find my repository here: https://github.com/BobbyTheCatfish/bobby-bot')
    }
})
module.exports = Module
