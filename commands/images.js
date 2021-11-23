const Augur = require('augurbot'),
    u = require('../utils/utils'),
    Jimp = require('jimp'),
    axios = require('axios'),
    schedule = require('node-schedule'),
    petPetGif = require('pet-pet-gif'),
    low = require('lowdb'),
    FileSync = require('lowdb/adapters/FileSync'),
    fs = require('fs'),
    ffmpegPath = require('@ffmpeg-installer/ffmpeg').path,
    ffmpeg = require('fluent-ffmpeg'),
    {getVideoDurationInSeconds} = require('get-video-duration'),
    https = require('https'),
    {Readable} = require('stream'),
    readError = 'I ran into an error while getting the image.'

function getTarget(msg, suffix){
    let target = msg.options?.getUser('target')
    if(msg.attachments?.size > 0) target = msg.attachments.first()?.url
    target ??= msg.mentions?.users?.first()?.displayAvatarURL({format: 'png', size: 256})
    target ??= u.validUrl(suffix)
    target ??= u.getEmoji(suffix)
    target ??= (msg.author ?? msg.user)?.displayAvatarURL({format: 'png', size: 256})
    return target
}
function petPic(pet, url, remove = true){
    let db = low(new FileSync('jsons/petpics.json'))
    db.defaults({luna: [], goose: []}).write()
    let reset = false
    if(!url){
        if(db.get(pet).value().length < 1){
            if(pet == 'luna') db.assign({luna: fs.readFileSync('media/luna.txt', 'utf-8').split('\n')}).write()
            else if(pet == 'goose') db.assign({goose: fs.readFileSync('media/goose.txt', 'utf-8').split('\n')}).write()
            reset = true
        }
        let pic = u.rand(db.get(pet).value())
        if(remove) db.get(pet).pull(pic).write()
        return `${reset ? `We've gone through all the ${pet} pics! Starting over now...\n` : ''}${pic}`
    }
    else return db.get(pet).push(url).write()
}
ffmpeg.setFfmpegPath(ffmpegPath)
const Module = new Augur.Module();
Module.addCommand({name: "amongus",
    category: "Images",
    process: async (msg, args) =>{
        let colors = ['black','blue','brown','cyan','green','lime','orange','pink','purple','red','white','yellow','maroon','rose','banana','gray','tan','coral']
        let color = (msg.options?.getString('option') ?? args?.toLowerCase().split(' ')[0])?.toLowerCase()
        if(!colors.includes(color)) color = u.rand(colors)
        try{
            let image = await Jimp.read(`media/amongians/${color}.png`)
            let avatar = await u.validImage(getTarget(msg, args))
            if(!avatar) return msg.reply(readError)
            let mask = await Jimp.read('media/amongians/mask.png')
            let helmet = await Jimp.read('media/amongians/helmet.png')
            avatar.autocrop(5).resize(370, Jimp.AUTO)
            avatar = new Jimp(799, 1080, 0x00000000).blit(avatar, 375, 130).mask(mask, 0, 0)
            image.blit(avatar, 0, 0).blit(helmet, 0, 0)
            let output = await image.getBufferAsync(Jimp.MIME_PNG)
            return msg.reply({files: [output]})
        }catch (error) {
            u.errorHandler(error, msg)
        }
    }
})
.addCommand({name: "andywarhol",
    category: "Images",
    process: async (msg, args) =>{
        try{
            let img = await u.validImage(getTarget(msg, args))
            if(!img) return msg.reply(readError)
            const canvas = new Jimp(536, 536, 0xffffffff);
            let width = img.getWidth()+10
            let height = img.getHeight()+10
            let positions = [[6, height], [width, 6], [width, height], [6, 6]]
            for(p of positions){
                img.color([{apply: "spin", params: [60]}])
                canvas.blit(img, p[0], p[1])
            }
            let output = await canvas.getBufferAsync(Jimp.MIME_PNG)
            return await msg.reply({files: [output]})
        } catch (error) {
            u.errorHandler(error, msg)
        }
    }
})
.addCommand({name: "avatar",
    category: "Images",
    process: async (msg, args) =>{
        let target = msg.options?.getUser('target') ?? msg.users?.mentions.first() ?? msg.user ?? msg.author
        return msg.reply(`\`${target.username}\`:`,{files: [target.displayAvatarURL({format: 'png', dynamic: true, size: 1024})]})
    }
})
.addCommand({name: "blur",
    category: "Images",
    process: async (msg, args) =>{
        try{
            let deg = parseInt(msg.options?.getString('option') ?? args?.split(' ')?.[0], 10) || 5
            if(deg < 0 || deg > 10) return msg.reply("I need a value between 0 and 10")
            let image = await u.validImage(getTarget(msg, args))
            if(!image) return msg.reply(readError)
            image.gaussian(deg)
            let output = await image.getBufferAsync(Jimp.MIME_PNG)
            msg.reply({files: [output]})
        } catch(error){
            u.errorHandler(error, msg)
        }
    }
})
.addCommand({name: "blurple",
    category: "Images",
    process: async (msg, args) =>{
        let image = await u.validImage(getTarget(msg, args))
        if(!image) return msg.reply(readError)
        image.color([
          { apply: "desaturate", params: [100] },
          { apply: "saturate", params: [47.7] },
          { apply: "hue", params: [227] }
        ])
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        await msg.reply({files: [output]});
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
        else color = Math.floor(Math.random()*16777215).toString(16);1
        try{
            if (color != 255){
                let img = new Jimp(256, 256, color);
                return msg.channel.send({content:`\`#${color}\``, files: [await img.getBufferAsync(Jimp.MIME_PNG)]});
            }
            return msg.reply(`sorry, I couldn't understand the color "${args}"`).then(u.clean);
        } catch (error) {console.log(error)}
    }
})
.addCommand({name: "colorme",
    category: "Images",
    process: async (msg, args) =>{
        let color = parseInt(msg.options?.getString('option') ?? args.split(' ')?.[0], 10);
        let image = await u.validImage(getTarget(msg, args))
        if(!image) return msg.reply(readError)
        color = Math.floor(color || Math.random()*359)
        if(color > 360 || color < -360) return msg.reply("That's out of range! Try using a number between -360 and 360.")
        image.color([{ apply: "hue", params: [color] }]);
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        return msg.reply({content: `Hue: ${color}`, files: [output]});
    }
})
.addCommand({name: "crop",
    category: "Images",
    process: async (msg, args) =>{
        let image = await u.validImage(getTarget(msg, args))
        if(!image) return msg.reply(readError)
        image.autocrop({cropOnlyFrames: false, cropSymmetric: false, tolerance: .01})
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        return msg.reply({files: [output]})
    }
})
.addCommand({name: "flex",
    category: "Images",
    process: async (msg, args) =>{
        let avatar = await u.validImage(getTarget(msg, args))
        if(!avatar) return msg.reply(readError)
        let right = await Jimp.read("https://cdn.discordapp.com/attachments/488887953939103775/545672817354735636/509442648080121857.png");
        let mask = await Jimp.read("./media/flexmask.png");
        let canvas = new Jimp(368, 128, 0x00000000);
        let left = right.clone().flip(true, Math.random() > .5)
        
        right.flip(false, Math.random() > .5)
        avatar.resize(128, 128).mask(mask, 0, 0)
        canvas.blit(left, 0, 4).blit(right, 248, 4).blit(avatar, 120, 0);

        let output = await canvas.getBufferAsync(Jimp.MIME_PNG)
        return msg.reply({files: [output]});
    }
})
.addCommand({name: "invert",
    category: "Images",
    process: async (msg, args) =>{
        let image = await u.validImage(getTarget(msg, args))
        if(!image) return msg.reply(readError)
        image.invert()
        let output = await image.getBufferAsync(Jimp.MIME_PNG)
        return await msg.reply({files: [output]});
    }
})
.addCommand({name: "personal",
    category: "Images",
    process: async (msg) =>{
        let image = await Jimp.read('https://cdn.discordapp.com/attachments/789694239197626371/808446253737181244/personal.png')
        let target = await u.validImage(getTarget(msg, args))
        let mask = await Jimp.read('media/flexmask.png')
        target.resize(350, 350)
        if(!target.hasAlpha()) target.mask(mask.resize(350,350))
        image.blit(target, 1050, 75)
        return await msg.channel.send({files: [await image.getBufferAsync(Jimp.MIME_PNG)]})
    }
})
.addCommand({name: 'petpet',
    category: "Images",
    process: async(msg, args) =>{
        let target = getTarget(msg, args)
        if(!u.validImage(target)) return msg.channel.send(readError)
        let gif = await petPetGif(target)
        return msg.reply({files: [{attachment: gif, name: 'petpet.gif'}]})
    }
})
.addCommand({name: "mirror",
    category: "Images",
    process: async (msg, args) =>{
        let image = await u.validImage(getTarget(msg, args))
        if(!image) return msg.reply(readError)
        let dir = args?.split(' ')?.[0] ?? msg.options?.getString('option') ?? 'x'
        if(['horizontal','h','hori','hor','left','right','l','r','x'].includes(dir.toLowerCase())) image.flip(true, false)
        else if(['vertical','v','verti','vert','up','down','u','d','y'].includes(dir.toLowerCase())) image.flip(false, true)
        else if(['both','xy','x y','all'].includes(dir.toLowerCase())) image.flip(true, true)
        return msg.reply({files: [await image.getBufferAsync(Jimp.MIME_PNG)]})
    }
})
.addCommand({name: "popart",
    category: "Images",
    process: async (msg, args) =>{
        try{
            let img = await u.validImage(getTarget(msg, args))
            if(!img) return msg.reply(readError)
            const canvas = new Jimp(536, 536, 0xffffffff);
            let width = img.getWidth()+10
            let height = img.getHeight()+10
            let positions = [[6, height], [width, 6], [width, height], [6, 6]]
            let num = 60
            for(p of positions){
                let index = positions.indexOf(p)
                if(index == 0) img.color([{apply: "desaturate", params: [100]},{apply: 'saturate', params: [50]}])
                else if(index == 3) num = 120
                else img.color([{apply: "spin", params: [num]}])
                canvas.blit(img, p[0], p[1])
            }
            let output = await canvas.getBufferAsync(Jimp.MIME_PNG)
            return await msg.reply({files: [output]})
        } catch (error) {
            u.errorHandler(error, msg)
        }
    }
})
.addCommand({name: "rotate",
    category: "Images",
    process: async (msg, args) =>{
        let deg = parseInt(msg.options?.getString('option') ?? args?.split(' ')?.[0], 10) || 5
        let image = await u.validImage(getTarget(msg, args))
        if(!image) return msg.reply(readError)
        image.rotate(-deg)
        image.autocrop({cropOnlyFrames: false, tolerance: 0, leaveBorder: 3})
        await msg.reply({content: `\`Rotated ${deg}°\``, files: [await image.getBufferAsync(Jimp.MIME_PNG)]});
    }
})
.addInteractionCommand({
    commandId: "828084734134321162",
    name: 'filter',
    syntax: "filter source value",
    category: "Images",
    process: async (int) => {
      let cmd = int.options.getSubcommand().replace(/flip/g, 'mirror').replace(/color/g, 'colorme')
      return await int.client.commands.get(cmd).process(int)
    }
})
.addCommand({name: 'removetiktok',
    process: async (msg, args) =>{
        try{
            if(!msg.attachments.first()?.url.endsWith('.mp4') && !(u.validUrl(args) && args.endsWith('.mp4'))) return msg.channel.send("I need a video to remove the watermark from")
            https.get(msg.attachments.first()?.url || args, async function(res){
                let data = []
                res.on('data', function(chunk){
                    data.push(chunk)
                }).on('end', async function(){
                    let video = ffmpeg(Readable.from(Buffer.concat(data)))
                    let duration = await getVideoDurationInSeconds(msg.attachments.first()?.url || args)
                    if(duration < 4) return msg.channel.send("That's not a tiktok video (its shorter than 4 seconds)").then(u.clean)
                    video.setDuration(duration-4.01).format('webm').output(`${msg.id}.webm`)
                    .on('start', async function(){
                        msg.reply("Working on it... (may take a minute or two)")
                    }).on('end', async function(){
                        await msg.reply({failIfNotExists: false, files: [`${msg.id}.webm`]})
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
.addCommand({name: 'animal',
    category: 'Images',
    process: async(msg, args)=>{
        let randomApiAnimals = ['Dog','Cat','Panda','Fox','Red Panda','Koala','Bird','Raccoon','Kangaroo','Whale','Pikachu']
        let otherAnimals = ['Shiba','Lizard']
        let animals = randomApiAnimals.concat(otherAnimals)
        if(!args) return msg.channel.send({embeds: [u.embed().setTitle('You can get random pictures of these animals:').setDescription(`\`\`\`${animals[0]}\n${animals.join("\n")}\n\`\`\``).setFooter(`Do ${await u.prefix(msg)}animal <animal> (eg: ${await u.prefix(msg)}animal bird)`)]})
        let a = args.toLowerCase()
        let image
        if(randomApiAnimals.includes(u.properCase(args))) image = (await axios.get(`https://some-random-api.ml/img/${a.replace(/bird/gi, 'birb').replace(/ /g, '_')}`)).data.link
        else if(a == otherAnimals[0].toLowerCase()) image = (await axios.get('http://shibe.online/api/shibes')).data[0]
        else if(a == otherAnimals[1].toLowerCase()) image = (await axios.get('https://nekos.life/api/v2/img/lizard')).data.url
        if(!image) return msg.reply("That's not one of the animals!").then(u.clean)
        msg.reply(image)
    }
})

//luna and goose
.addCommand({name: 'addluna',
    category: 'Images',
    permissions: (msg) => ['281658096130981889', '337713155801350146'].includes(msg.author.id),
    process: async(msg, args)=>{
        if(!args && !msg.attachments.first()) return msg.channel.send('No images provided')
        if(msg.attachments.first()){
            let files = msg.attachments.map(a => a.url)
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
.addCommand({name: 'addgoose',
    category: 'Images',
    permissions: (msg) => ['337713155801350146', '602887436300714013'].includes(msg.author.id),
    process: async(msg, args)=>{
        if(!args && !msg.attachments.first()) return msg.channel.send('No images provided')
        if(msg.attachments.first()){
            let files = msg.attachments.map(a => a.url)
            fs.appendFileSync('media/goose.txt', `\n${files.join('\n')}`)
            for(x of files) petPic('goose', x)
        }
        else{
            fs.appendFileSync('media/goose.txt', `\n${args}`)
            for(x of args.split('\n')) petPic('goose', x)
        }
        return msg.channel.send('Goose Pic(s) Added 🦆')
    }
})
.addCommand({name: 'initpics',
    onlyOwner: true,
    enabled: false,
    process: async(msg, args)=>{
        let db = low(new FileSync('jsons/petpics.json'))
        db.defaults({luna: [], goose: []}).write()
        db.assign({luna: fs.readFileSync('media/luna.txt', 'utf-8').split('\n')}).write()
        db.assign({goose: fs.readFileSync('media/goose.txt', 'utf-8').split('\n')}).write()
        return msg.react('👍')
    }
})
.addCommand({name: 'luna',
    category: 'Images',
    process: async(msg, args)=>{
        let file = fs.readFileSync('media/luna.txt', 'utf8')
        msg.channel.send(u.rand(file.split('\n')))
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
        huddyChannel.send(`${args.toLowerCase() == 'goose' ? 'Daily Goose':'Nightly Luna'} Pic\n${petPic(args)}`)
    }
})
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

module.exports = Module