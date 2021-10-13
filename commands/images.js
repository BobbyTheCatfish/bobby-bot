const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Jimp = require('jimp'),
    axios = require('axios'),
    schedule = require('node-schedule'),
    low = require('lowdb'),
    FileSync = require('lowdb/adapters/FileSync'),
    fs = require('fs'),
    ffmpegPath = require('@ffmpeg-installer/ffmpeg').path,
    ffmpeg = require('fluent-ffmpeg'),
    {getVideoDurationInSeconds} = require('get-video-duration'),
    http = require('https'),
    {Readable} = require('stream'),
    readError = 'I ran into an error while getting the image.'
async function getTarget(msg, suffix, keywords=false, interaction = null){
    let target,
        urlexp = /\<?(https?:\/\/\S+)\>?(?:\s)?(\d*)/,
        match
        if(interaction?.target) return msg.client.users.cache.get(interaction.target).displayAvatarURL({format: 'png', size: 256})
        else if(!keywords){
            if(msg.attachments.size > 0) target = msg.attachments.first().url
            else if (match = urlexp.exec(suffix)) target = match[1]
            else{
                let mention = await u.getMention(msg, false, false)
                target = mention.displayAvatarURL({format: 'png', size: 256})
            }
            return target
        }
        else{
            if(msg.attachments.size > 0) target = msg.attachments.first().url
            else if(match = urlexp.exec(suffix)) target = match[1]
            else{
                let mention = await u.getMention(msg, keywords, false); 
                target = mention.displayAvatarURL({format: 'png', size: 256})
            }
            return target
        }
        
}
function petPic(pet, url, remove = true){
    let db = low(new FileSync('jsons/petpics.json'))
    db.defaults({luna: [], goose: []}).write()
    if(!url){
        if(db.get(pet).length < 1){
            if(pet == 'luna') db.assign({luna: fs.readFileSync('media/luna.txt', 'utf-8').split('\n')}).write()
            else if(pet == 'goose') db.assign({goose: fs.readFileSync('media/goose.txt', 'utf-8').split('\n')}).write()
        }
        let pic = u.rand(db.get(pet).value())
        if(remove) db.get(pet).pull(pic).write()
        return pic
    }
    else return db.get(pet).push(url).write()
}
ffmpeg.setFfmpegPath(ffmpegPath)
const Module = new Augur.Module();
Module.addCommand({name: "amongus",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        let colorSelected
        let words = interaction?.input ?? args.toLowerCase().split(' ')[0]
        let keywords = args.split(' ').slice(1).join(' ')
        let colors = ['black','blue','brown','cyan','green','lime','orange','pink','purple','red','white','yellow']
        let target
        if(colors.includes(words)) target = target ?? await getTarget(msg, keywords, keywords, interaction);
        else target = target ?? await getTarget(msg, args, false, interaction)
        try{
            if(colors.includes(words)) colorSelected = `media/amongians/${words}.png`
            else colorSelected = `media/amongians/${colors[Math.floor(Math.random() * 12)]}.png`
            
            const canvas = new Jimp(353, 458, 0x00000000);
            const avatar = await Jimp.read(colorSelected);
            try{await Jimp.read(target)}catch(e){
                if(interaction) return {errMsg: readError, image: null}
                else return msg.channel.send("I couldn't read that file.")
            }
            const mask = await Jimp.read("./media/amongians/mask.png");
            const topLayer = await Jimp.read('media/amongians/helmetmask.png')
            const image =  await Jimp.read(target)
            image.resize(170, 170);
            canvas.blit(image, 166, 52)
            canvas.mask(mask,0,0)
            avatar.blit(canvas, 0,0)
            avatar.blit(topLayer, 0, 0)
            let output = await avatar.getBufferAsync(Jimp.MIME_PNG)
            if(interaction.target) return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} is looking pretty sus 😳`}
            return msg.channel.send({files: [output]});
        }catch (error) {console.log(error)}
    }
})
.addCommand({name: "andywarhol",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        try
        {
            let target = await getTarget(msg, args, false, interaction);
            try{await Jimp.read(target)} catch(e){
                if(interaction.target) return {errMsg: readError, image: null}
                else return msg.channel.send("I couldn't read that file.")
            }
            const img = await Jimp.read(target);
            const canvas = new Jimp(536, 536, 0xffffffff);
        
            img.resize(256, 256);
            img.color([{apply: "spin", params: [60]}]);
            canvas.blit(img, 8, 272);
            img.color([{apply: "spin", params: [60]}]);
            canvas.blit(img, 272, 8);
            img.color([{apply: "spin", params: [60]}]);
            canvas.blit(img, 272, 272);
            img.color([{apply: "spin", params: [120]}]);
            canvas.blit(img, 8, 8);
            let output = await canvas.getBufferAsync(Jimp.MIME_PNG)
            if(interaction.target) return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} andywarhol'd`}
            await msg.channel.send({files: [output]})
        } catch (error) {console.log(error);msg.channel.send('I ran into an error. I\'ve let my developer know')}
    }
})
.addCommand({name: "avatar",
    category: "Images",
    process: async (msg, args) =>{
        let target = await u.getMention(msg, false, true)
        if(msg.guild) target = target.user
        return msg.channel.send(`\`${target.username}\`:`,{files: [target.displayAvatarURL({format: 'png', dynamic: true, size: 1024})]})
    }
})
.addCommand({name: "blur",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        try{
            let deg = parseInt(interaction.input ?? args, 10) || 5,
                response
            if(deg < 0) response = "You can't sharpen the image with this command!"
            else if(deg > 50) response = "That value is too high!"
            if(interaction.target && response) return response
            else if(response) return msg.channel.send(response)
            if(interaction.target){
                let target = await getTarget(msg, args, false, interaction)
                try{await Jimp.read(target)}catch(e){return {errMsg: readError, image: null}}
                let image = await Jimp.read(target)
                image.blur(deg)
                let output = await image.getBufferAsync(Jimp.MIME_PNG)
                return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} blurred ${deg}x`}
            }
            let processed = false;
            for (m of await msg.channel.messages.fetch({limit: 100}))
            {
                if (m.attachments.size > 0)
                {
                    let target = m.attachments.first().url
                    processed = true;
                    try{await Jimp.read(target)}catch(e){continue}
                    const image = await Jimp.read(target)
                    image.blur(deg)
                    await m.channel.send({files: [await image.getBufferAsync(Jimp.MIME_PNG)]});
                    break
                }
            }
            if (!processed) m.channel.send("I couldn't find any recent images to blur!")
        } catch(error){console.log(error)}
    }
})
.addCommand({name: "blurple",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        let target = await getTarget(msg, args, false, interaction)
        try{await Jimp.read(target)}catch(e){
            if(interaction.target) return {errMsg: readError, image: null}
            return msg.channel.send(readError)
        }
        let image = await Jimp.read(target)
        image.color([
          { apply: "desaturate", params: [100] },
          { apply: "saturate", params: [47.7] },
          { apply: "hue", params: [227] }
        ])
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        if(interaction.target) return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} blurpled`}
        await msg.channel.send({files: [output]});
    }
})
.addCommand({name: "color",
    category: "Images",
    process: async (msg, args) =>{
        let color = args;
        if (args){
            if (args.startsWith('0x')) color = "#" + args.substr(2);
            if (!["#000000", "black", "#000000FF"].includes(color)) color = Jimp.cssColorToHex(color);
        }
        else color = Math.floor(Math.random()*16777215).toString(16);
        try{
            if (color != 255){
                let img = new Jimp(256, 256, color);
                return msg.channel.send(`\`${color.toString(16)}\``,{files: [await img.getBufferAsync(Jimp.MIME_PNG)]});
            }
            return msg.reply(`sorry, I couldn't understand the color "${args}"`).then(u.clean);
        } catch (error) {console.log(error)}
    }
})
.addCommand({name: "colorme",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        let keywords = args
        let color = parseInt(interaction.input ?? args.split(' ')[0], 10);
        
        if(color) keywords = args.replace(color+' ', '')
        let target = await getTarget(msg, args, false, interaction),
            urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/,
            match;
        if (!target && msg.attachments.size > 0) target = msg.attachments.first().url;
        else if (match = urlexp.exec(args)){
          target = match[1];
          color = parseInt(match[2], 10);
        }
        else if(!target) target = (keywords? await u.getMention(msg, keywords, false) : await u.getMention(msg, false, false)).displayAvatarURL({format: 'png', size: 256})
        
        color = Math.floor(color) || (10 * (Math.floor(Math.random() * (34 + 34) -34)));
  
        if(color > 360 || color < -360) {
            if(interaction.target) return {errMsg: "That's out of range! Try using a number between -360 and 360", image: null}
            return msg.channel.send("That's out of range! Try using a number between -360 and 360.")
        }
        
        let image = await Jimp.read(target)
        image.color([{ apply: "hue", params: [color] }]);
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        if(interaction.target) return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} colored to a hue of ${color}`}
        await msg.channel.send({content: `Hue: ${color}`, files: [output]});
    }
})
.addCommand({name: "crop",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        if(interaction.target){
            let target = await getTarget(msg, args, false, interaction)
            try{await Jimp.read(target)}catch{return {errMsg: readError, image: null}}
            const cropped = await Jimp.read(target)
            cropped.autocrop({cropOnlyFrames: false, cropSymmetric: false, tolerance: .01})
            let output = await cropped.getBufferAsync(Jimp.MIME_PNG)
            if(interaction.target) return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} cropped`}
        }
        let processed = false;
        for (m of await msg.channel.messages.fetch({limit: 100}))
        {
            if (m.author.bot) continue;
            if (m.attachments.size > 0)
            {
                let target = m.attachments.first().url
                processed = true;
                try{await Jimp.read(target)}catch(e){return m.channel.send("I couldn't read that file.")}
                const cropped = await Jimp.read(target)
                cropped.autocrop({ cropOnlyFrames: false, cropSymmetric: false, tolerance: .01 })
                await m.channel.send({files: [await cropped.getBufferAsync(Jimp.MIME_PNG)]});
                break
            }
        }
        if (!processed) msg.channel.send("I couldn't find any recent images to crop!")
    }
})
.addCommand({name: "flex",
    category: "Images",
    process: async (msg, args, interaction = null) =>{
        let avatarURL = (interaction ? interaction.target?.user ?? msg.user : await u.getMention(msg, false, false)).displayAvatarURL({format: 'png', size: 128})
        const right = await Jimp.read("https://cdn.discordapp.com/attachments/488887953939103775/545672817354735636/509442648080121857.png");
        const mask = await Jimp.read("./media/flexmask.png");
        const avatar = await Jimp.read(avatarURL);
        const canvas = new Jimp(368, 128, 0x00000000);
  
        if (Math.random() > 0.5) right.flip(false, true);
        const left = right.clone().flip(true, (Math.random() > 0.5));
  
        avatar.resize(128, 128);
        avatar.mask(mask, 0, 0);
        
        canvas.blit(left, 0, 4);
        canvas.blit(right, 248, 4);
        canvas.blit(avatar, 120, 0);
        let output = await canvas.getBufferAsync(Jimp.MIME_PNG)
        if(interaction.target) return {errMsg: null, image: output}
        await msg.channel.send({files: [output]});
    }
})
.addCommand({name: "invert",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        let target = await getTarget(msg, null, false, interaction)
        try{await Jimp.read(target)}catch(e){
            if(interaction.target) return {errMsg: readError, image: null}
            return msg.channel.send(readError)
        }
        let image = await Jimp.read(target)
        image.invert()
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        if(interaction.target) return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} inverted`}
        await msg.channel.send({files: [output]});
    }
})
.addCommand({name: "mirror",
    category: "Images",
    process: async (msg, direction, interaction = {target: null, input: null}) =>{
        if(interaction.target){
            let target = await getTarget(msg, direction, false, interaction)
            try{await Jimp.read(target)}catch{return {errMsg: readError, image: null}}
            const image = await Jimp.read(target)
            if(interaction.input == 'y') image.flip(false, true)
            if(interaction.input == 'xy') image.flip(true, true)
            else image.flip(true, false)
            let output = await image.getBufferAsync(Jimp.MIME_PNG)
            return {errMsg: null, image: output, title: `${msg.client.users.cache.get(interaction.target).username} mirrored ${interaction.input == 'y' ? 'vertically': interaction.input == 'xy' ? 'horizontally and vertically' : 'horizontally'}`}
        }
        let processed = false;
        for (m of await msg.channel.messages.fetch({limit: 100}))
        {
            if (m.attachments.size > 0)
            {
                let target = m.attachments.first().url
                processed = true;
                try{await Jimp.read(target)}catch(e){continue}
                const image = await Jimp.read(target)
                if(!direction) return m.channel.send("Which way do you want me to flip it?")
                else if(['horizontal','h','hori','hor','left','right','l','r','x'].includes(direction.toLowerCase())) image.flip(true, false)
                else if(['vertical','v','verti','vert','up','down','u','d','y'].includes(direction.toLowerCase())) image.flip(false, true)
                else if(['both','xy','x y','all'].includes(direction.toLowerCase())) image.flip(true, true)
                await m.channel.send({files: [await image.getBufferAsync(Jimp.MIME_PNG)]});
                break
            }
            
        }
        if (!processed) msg.channel.send("I couldn't find any recent images to mirror!")
    }
})
.addCommand({name: "popart",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        let target = await getTarget(msg, null, false, interaction)
        try{await Jimp.read(target)}catch(e){
            if(interaction.target) return {errMsg: readError, image: null}
            return msg.channel.send(readError)
        }
        const img = await Jimp.read(target);
        const canvas = new Jimp(536, 536, 0xffffffff);
    
        img.resize(256, 256);
    
        img.color([{ apply: "desaturate", params: [100] }, { apply: "saturate", params: [50] }]);
        canvas.blit(img, 8, 272);
    
        img.color([{apply: "spin", params: [60]}]);
        canvas.blit(img, 272, 8);
    
        img.color([{apply: "spin", params: [60]}]);
        canvas.blit(img, 272, 272);
    
        img.color([{apply: "spin", params: [120]}]);
        canvas.blit(img, 8, 8);
        let output = await canvas.getBufferAsync(Jimp.MIME_PNG)
        if(interaction.target) return {errMsg: null, image: output, title: `Popart of ${msg.client.users.cache.get(interaction.target).username}`}
        await msg.channel.send({files: [output]});
    }
})
.addCommand({name: "removebg",
    process: async (msg, args, interaction = {target: null, input: null})=>{
        let image
        let removebackground = async (image) =>{
            const targetColor = {r: 255, g: 255, b: 255, a: 255};  // Color you want to replace
            const replaceColor = {r: 0, g: 0, b: 0, a: 0};  // Color you want to replace with
            const colorDistance = (c1, c2) => Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2) + Math.pow(c1.a - c2.a, 2));  // Distance between two colors
            const threshold = 32;  // Replace colors under this threshold. The smaller the number, the more specific it is.
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
                const thisColor = {
                    r: image.bitmap.data[idx + 0],
                    g: image.bitmap.data[idx + 1],
                    b: image.bitmap.data[idx + 2],
                    a: image.bitmap.data[idx + 3]
                };
                if(colorDistance(targetColor, thisColor) <= threshold) {
                    image.bitmap.data[idx + 0] = replaceColor.r;
                    image.bitmap.data[idx + 1] = replaceColor.g;
                    image.bitmap.data[idx + 2] = replaceColor.b;
                    image.bitmap.data[idx + 3] = replaceColor.a;
                }
            });
        }
        if(!interaction.target){
            let processed = false;
            let messages = await msg.channel.messages.fetch({limit: 50})
            for (m of messages)
            {
                if(!m.author) continue
                if (m.author?.bot) continue;
                if (m.attachments.size > 0)
                {
                    let target = m.attachments.first().url
                    processed = true;
                    try{await Jimp.read(target)}catch(e){continue}
                    image = await Jimp.read(target)
                    break
                }
            }
            if (!processed) return msg.channel.send("I couldn't find any recent images to remove the background from!")
        }
        else{
            let target = await getTarget(msg, args, false, interaction)
            try{await Jimp.read(target)}catch{return {errMsg: readError, image: null}}
            image = await Jimp.read(target)
        }
        removebackground(image).then(async()=>{
            let output = await image.getBufferAsync(Jimp.MIME_PNG)
            if(interaction.target) return {errMsg: null, image: output, title: 'Removed Background'}
            await msg.channel.send({files: [output]})
        })
    }
})
.addCommand({name: "rotate",
    category: "Images",
    process: async (msg, args, interaction = {target: null, input: null}) =>{
        let deg = parseInt(interaction.input ?? args, 10) || (10 * (Math.floor(Math.random() * (34 + 34) -34)));
        if(interaction.target){
            let target = getTarget(msg, args, false, interaction)
            try{await Jimp.read(target)}catch{return {errMsg: readError, image: null}}
            const image = await Jimp.read(target)
            image.rotate(-deg)
            image.autocrop({cropOnlyFrames: false, tolerance: 0, leaveBorder: 3})
            let output = await image.getBufferAsync(Jimp.MIME_PNG)
            return {errMsg: null, image: output, title: `Rotated ${deg}°`}
        }
        let processed = false;
        for (m of await msg.channel.messages.fetch({limit: 100}))
        {
            if (m.attachments.size > 0)
            {
                let target = m.attachments.first().url
                processed = true;
                try{await Jimp.read(target)}catch(e){continue}
                const image = await Jimp.read(target)
                image.rotate(-deg)
                image.autocrop({cropOnlyFrames: false, tolerance: 0, leaveBorder: 3})
                await m.channel.send({content: `\`Rotated ${deg}°\``, files: [await image.getBufferAsync(Jimp.MIME_PNG)]});
                break
            }
        }
        if (!processed) msg.channel.send("I couldn't find any recent images to rotate!")
    }
})
.addCommand({name: 'animal',
    category: 'Images',
    process: async(msg, args, i=0)=>{
        let randomApiAnimals = ['Dog','Cat','Panda','Fox','Red Panda','Koala','Bird','Raccoon','Kangaroo','Whale','Pikachu']
        let otherAnimals = ['Shiba','Lizard']
        let animals = randomApiAnimals.concat(otherAnimals)
        if(!args) return msg.channel.send({embeds: [u.embed().setTitle('You can get random pictures of these animals:').setDescription(`\`\`\`${animals[0]}\n${animals.join("\n")}\n\`\`\``).setFooter(`Do ${await u.prefix(msg)}animal <animal> (eg: ${await u.prefix(msg)}animal bird)`)]})
        let a = args.toLowerCase(),
        image
        if(randomApiAnimals.includes(u.properCase(args))) image = (await axios.get(`https://some-random-api.ml/img/${a.replace(/bird/gi, 'birb').replace(/ /g, '_')}`)).data.link
        else if(a == otherAnimals[0].toLowerCase()) image = (await axios.get('http://shibe.online/api/shibes')).data[0]
        else if(a == otherAnimals[1].toLowerCase()) image = (await axios.get('https://nekos.life/api/v2/img/lizard')).data.url
        
        if(!image) return msg.channel.send("That's not one of the animals!").then(u.clean)
        try{msg.channel.send({files: [image]})}catch{msg.channel.send('Something broke while sending it (it was probably too large). Please try again.').then(u.clean)}
    }
})
.addCommand({name: 'luna',
    category: 'Images',
    process: async(msg, args)=>{
        let file = fs.readFileSync('media/luna.txt', 'utf8')
        msg.channel.send(u.rand(file.split('\n')))
    }
})
.addCommand({name: 'addluna',
    category: 'Images',
    otherPerms: (msg) => ['281658096130981889', '337713155801350146'].includes(msg.author.id),
    process: async(msg, args)=>{
        if(!args && !msg.attachments.first()) return msg.channel.send('No images provided')
        if(msg.attachments.first()){
            let files = []
            for(x of msg.attachments)files.push(x.url)
            fs.appendFileSync('media/luna.txt', `\n${files.join('\n')}`)
            for(x of files) petPic('luna', x)
        }
        else{
            fs.appendFileSync('media/luna.txt', `\n${args}`)
            for(x of args.split('\n')) petPic('luna', x)
        }
        return msg.channel.send('Luna Pic(s) Added 🐱')
    }
})
.addCommand({name: 'goose',
    category: 'Images',
    process: async(msg, args) => {
        let file = fs.readFileSync('media/goose.txt', 'utf8')
        msg.channel.send(u.rand(file.split('\n')))
    }
})
.addCommand({name: 'dailypic',
    category: 'Images',
    onlyOwner: true,
    process: async(msg,args) =>{
        console.log(args)
        if(!args) return msg.reply("Which picture do you need?")
        if(!['goose', 'luna'].includes(args.toLowerCase())) return msg.reply("either goose or luna")
        const huddyChannel = msg.client.channels.cache.get('786033226850238525')
        huddyChannel.send(`${args.toLowerCase() == 'goose' ? 'Daily Goose Pic':'Nightly Luna Pic'}\n${petPic(args)}`)
    }
})
.addCommand({name: 'addgoose',
    category: 'Images',
    otherPerms: (msg) => ['337713155801350146', '602887436300714013'],
    process: async(msg, args)=>{
        if(!args && !msg.attachments.first()) return msg.channel.send('No images provided')
        if(msg.attachments.first()){
            let files = []
            for(x of msg.attachments) files.push(x.url)
            fs.appendFileSync('media/goose.txt', `\n${files.join('\n')}`)
            for(x of files) petPic('goose', x)
        }
        else{
            fs.appendFileSync('media/goose.txt', `\n${args}`)
            for(x of args.split('\n')) petPic('goose', x)
        }
    }
})
.addInteractionCommand({
  commandId: "828084734134321162",
  name: 'filter',
  syntax: "filter source value",
  category: "Images",
  process: async (int) => {
      console.log(int.replied)
      await int.reply('test')
      console.log(int.replied)
      return console.log('started')
      let data = int.options
    let cmd = data.getSubcommand().replace(/flip/g, 'mirror').replace(/color/g, 'colorme')
    let input = data.getString('option') || data.getInteger('option')?.toString()
    let newArgs = {target: data.getMember('target'), input}
    let process = await int.client.commands.get(cmd).process(int, '', newArgs)
    if(process.errMsg) return int.client.interactionFailed(int, process.errMsg)
    int.reply('test')
    //else if(process.image) int.client.channels.cache.get('839684190157144064').send({files: [process.image]}).then(img =>{
    //    console.log('ye')
    //    int.reply({embeds: [u.embed().setImage(img.attachments.first().url).setTitle(process.title || '')]})
    //})

  }
})
//daily pics
.addEvent('ready', () =>{
    let rule = new schedule.RecurrenceRule()
    rule.hour = 10
    rule.minute = 00
    const huddyChannel = Module.client.channels.cache.get('786033226850238525')
    const atomicChannel = Module.client.channels.cache.get('897568610531295232')
    const goosePic = schedule.scheduleJob(rule, function(){
        let pic = petPic('goose')
        huddyChannel.send(`Daily Goose Pic\n${pic}`)
        atomicChannel.send(`Daily Goose Pic\n${pic}`)
    })
    let rule2 = new schedule.RecurrenceRule()
    rule2.hour = 22
    rule2.minute = 00
    const lunaPic = schedule.scheduleJob(rule2, function(){
        let pic = petPic('luna')
        huddyChannel.send(`Nightly Luna Pic\n${pic}`)
        atomicChannel.send(`Nightly Luna Pic\n${pic}`)
    });

})
.addCommand({name: 'removetiktok',
    process: async (msg, args) =>{
        try{
            if(!msg.attachments.first()?.url.endsWith('.mp4') && !(u.validUrl(args) && args.endsWith('.mp4'))) return msg.channel.send("I need a video to remove the watermark from")
            http.get(msg.attachments.first()?.url || args, async function(res){
                let data = []
                res.on('data', function(chunk){
                    data.push(chunk)
                }).on('end', async function(){
                    //let buffer = Buffer.concat(data)
                    //let stream = Readable.from(buffer)
                    //let video = ffmpeg(stream)
                    let video = ffmpeg(Readable.from(Buffer.concat(data)))
                    let duration = await getVideoDurationInSeconds(msg.attachments.first()?.url || args)
                    if(duration < 4) return msg.channel.send("That's not a tiktok video (its shorter than 4 seconds)").then(u.clean)
                    video.setDuration(duration-4.01).format('webm').output(`${msg.id}.webm`)
                    .on('start', async function(){
                        msg.channel.send("Working on it... (may take a minute or two)")
                    }).on('end', async function(){
                        await msg.channel.send({files: [`${msg.id}.webm`]})
                        setTimeout(() => {
                            fs.unlinkSync(`${msg.id}.webm`)
                        }, 5000);
                    }).on('error', function(err){
                        console.log(err)
                    }).run()
                })
            })
        } catch(e){
            return u.errorHandler(e, msg)
        }
    }
})
.addCommand({name: 'e', onlyOwner: true, process: async(msg, args)=>{
    msg.channel.send(petPic('luna'))
    msg.channel.send(petPic('goose'))
    
    //return console.log(await u.decodeLogEvents(msg.guild))
}})
.addCommand({name: 'initpics', onlyOwner: true, enabled: false, process: async(msg, args)=>{
    let db = low(new FileSync('jsons/petpics.json'))
    db.defaults({luna: [], goose: []}).write()
    db.assign({luna: fs.readFileSync('media/luna.txt', 'utf-8').split('\n')}).write()
    db.assign({goose: fs.readFileSync('media/goose.txt', 'utf-8').split('\n')}).write()
}})
.addEvent('messageCreate', msg =>{
    if(msg.guild?.id == '862892739124396052' && msg.author.id != '862892739124396052' && msg.content.toLowerCase().includes('hug')) msg.channel.send('<@!583012388706451462>')
})
.addCommand({name: 'eera', onlyOwner: true,
process: async(msg, args)=>{

        const fb = msg.guild.channels.cache.get("789694239197626371");
        let people = []
        let messages = await fb.messages.fetch({limit: 100})
        messages = messages.filter(m => m.content.toLowerCase().includes('youtube')).map(a => a)
        for(x of messages){
        let emoji = x.reactions.cache.map(a => a)
        if(emoji) emoji = emoji.filter(r => r.name.t == '🎵')
        console.log(emoji)
        if(emoji){
          emoji = emoji.map(r => r.users.cache.map(u => u.id).filter(u => !people.includes(u)))
          people = people.concat(emoji)
          }
        }
        return console.log(people.length)

}
})

module.exports = Module