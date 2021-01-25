const Augur = require('augurbot'),
    u = require('../utils/utils'),
    colors = require('colors')

const Module = new Augur.Module();
Module.addCommand({name: "inventory",
    guildOnly: true,
    process: async(message, args)=>{
        let inventory = message.guild.roles.cache.filter(r => message.member.roles.cache.find(e => e.name.toLowerCase()+' colors' == r.name.toLowerCase())).map(r => `<@&${r.id}>`).join("\n");
        let embed = u.embed().setAuthor(message.member.displayName, message.member.user.displayAvatarURL({format: 'png'}))
            .setTitle("Equippable Color Inventory")
            .setDescription(`Equip a color role with \`!equip Role Name\` without the "Colors"\ne.g. \`!equip novice\`\n\n${inventory}`);
        if(!inventory) return message.channel.send("You don't have any colors in your inventory!").then(u.clean)
        else return message.channel.send({embed, disableMentions: "all"});
    }
})
.addCommand({name: "equip",
    guildOnly: true,
    process: async(message, args)=>{
        let words = args.split(' ')
        if(words[0].toLowerCase() == 'none'){
            message.member.roles.cache.forEach(role =>{if(role.name.toLowerCase().endsWith('colors')) message.member.roles.remove(role)})
            await message.react('👌')
        }
        else if(words[0].toLowerCase() == 'help'){
            let embed = u.embed()
                .setTitle("How to set up role color equiping")
                .setAuthor("Bobby Bot", "https://images-ext-1.discordapp.net/external/PnqhQnz3eY98xD8GMtgLKTv9GJ7ZvVjqg5-oiGbSRjk/https/cdn.discordapp.com/avatars/469983220172324908/480bacea977058eed3ff1032470e8034.webp")
                .setColor('#2e93ff')
                .addFields({ name: 'Step 1:', value: 'Create a new role below all other ones. Make sure that it has the same name, followed by `Colors` (example: the new role for the role `Bob Boi` would be `Bob Boi Colors`)', inline: true },
                { name: 'Step 2', value: 'Set the color of the new role to the color of the old one', inline: false },
                { name: 'Step 3', value: 'Set the color of the old role to the default color. This will make it transparent.', inline: false },
                { name: 'Step 4', value: 'Repeat steps 1-3 for all the roles that you want to have equipable colors', inline: false })
                .setImage("https://media.discordapp.net/attachments/727981742937342002/749339754113400892/roles.gif")
            return message.channel.send({embed})
        }
        else{
            let keywords = words.slice(0).join(' ')
            let role = message.guild.roles.cache.find(r => r.name.toLowerCase() == keywords.toLowerCase())
            let colorRole = message.guild.roles.cache.find(r => r.name.toLowerCase() == keywords.toLowerCase()+' colors')
            if(!role) return message.channel.send("That's not a valid role").then(m => u.clean(m)).then(u.clean(message))
            if(!colorRole) return message.channel.send("Looks like the colors aren't set up for that role!").then(m => u.clean(m)).then(u.clean(message))
            if (!message.member.roles.cache.has(role.id)) return message.channel.send("sorry, you don't have that role").then(m => u.clean(m)).then(u.clean(message))
            else{
                message.member.roles.cache.forEach(role =>{if(role.name.toLowerCase().endsWith('colors')) message.member.roles.remove(role)}) 
                await message.member.roles.add(colorRole)
                await message.react("👌").then(u.clean(message))
            }
        }
    }    
})
.addEvent("messageReactionAdd", async (reaction, member) =>{
    try {
      let roleToAdd
        if(reaction.message.id == '757627485247766566'){ 
            if(reaction.emoji.name == '🎮') roleToAdd = '543613328598237184'
            else if(reaction.emoji.id == '756664793439666296') roleToAdd = '756673988339433582'
            else if(reaction.emoji.name == '🇦') roleToAdd = '752288637453992008'
            else if(reaction.emoji.name == '🔫') roleToAdd = '513847806436573217'
            else if(reaction.emoji.name == '☮️')  roleToAdd = '685683556994777133'
            else if(reaction.emoji.name == '💁‍♀️') roleToAdd = '687406901079834656'
            else if(reaction.emoji.name == '🍎') roleToAdd = '550093235691978782'
            else if(reaction.emoji.name == '🙋') roleToAdd = '752288725769257121'
            else try{return await reaction.users.remove(member)}catch(error){}
        }
        else if(reaction.message.id == '763414193713315841'){
            if(reaction.emoji.name == '🔔') roleToAdd = '763049563577647124'
            else try{return await reaction.users.remove(member)}catch(error){}
        }
        else if(reaction.message.id == '765691902048993324'){
                if(reaction.emoji.id == '765690921270378507') roleToAdd = '765673542565363752'//red
            else if(reaction.emoji.id == '765690920585789452') roleToAdd = '765673736585609225'//blue
            else if(reaction.emoji.id == '765690921047293972') roleToAdd = '765673820286877697'//green
            else if(reaction.emoji.id == '765690921089105992') roleToAdd = '765673865824829490'//pink
            else if(reaction.emoji.id == '765690921022914581') roleToAdd = '765673918907809813'//orange
            else if(reaction.emoji.id == '765690921358327838') roleToAdd = '765673959277723649'//yellow
            else if(reaction.emoji.id == '765690920704016404') roleToAdd = '765673985203503144'//black
            else if(reaction.emoji.id == '765690921215852544') roleToAdd = '765674056036909088'//white
            else if(reaction.emoji.id == '765690920884240435') roleToAdd = '765674084243210251'//purple
            else if(reaction.emoji.id == '765690920833908776') roleToAdd = '765674130326290483'//brown
            else if(reaction.emoji.id == '765690920791179314') roleToAdd = '765674206833934337'//cyan
            else if(reaction.emoji.id == '765690921052274768') roleToAdd = '765674248094089247'//lime
            else try{return await reaction.users.remove(member)}catch(error){}
            let g = reaction.message.guild.member(member).roles.cache
            let roles = ['765673542565363752','765673736585609225','765673820286877697','765673865824829490','765673918907809813','765673959277723649','765673985203503144','765674056036909088','765674084243210251','765674130326290483','765674206833934337','765674248094089247']
            if(g.has(roles[0]) || g.has(roles[1]) || g.has(roles[2]) || g.has(roles[3]) || g.has(roles[4]) || g.has(roles[5]) || g.has(roles[6]) || g.has(roles[7]) || g.has(roles[8]) || g.has(roles[9]) || g.has(roles[10]) || g.has(roles[11])){
                try {
                    await reaction.message.guild.member(member).roles.remove(roles)
                    await reaction.users.remove(member);
                } catch (error) {console.log(error)}
            }
        }
        else if(reaction.message.id == '765752313477988362'){
            if(reaction.emoji.id == '765751012723523615') roleToAdd = '765749150796611614'//amongus pings
            if(reaction.emoji.id == '765751540144799745') roleToAdd = '765749245680418836'//mc pings
            if(reaction.emoji.name == '✏️') roleToAdd = '765749212263612466'//skribbl pings
            else try{return await reaction.users.remove(member)}catch(error){}
        }
        else if(reaction.message.id == '766084149110505503'){
            if(reaction.emoji.name == '🇸') roleToAdd = '766084189115908116'//sen
            else if(reaction.emoji.name == '🇯') roleToAdd = '766084246908960779'//jun
            else if(reaction.emoji.name == '3️⃣') roleToAdd = '766084383991005195'//sop
            else if(reaction.emoji.name == '🇫') roleToAdd = '766084645003460609'//fresh
            else try{return await reaction.users.remove(member)}catch(error){}
            let roles = ['766084189115908116','766084246908960779','766084383991005195','766084645003460609']
            let g = reaction.message.guild.member(member).roles.cache
            if(g.has(roles[0])||g.has(roles[1])||g.has(roles[2])||g.has(roles[3])){
                try{await reaction.message.guild.member(member).roles.remove(roles)}catch(error){console.log(error)}
            }
        }
        if(['757627485247766566','763414193713315841','765691902048993324','765752313477988362','766084149110505503'].includes(reaction.message.id))try {await reaction.message.guild.member(member).roles.add(roleToAdd)} catch (error) {console.log(error)}
    } catch (error) {console.log('error while adding reaction role',error)}
  })
.addEvent("messageReactionRemove", async (reaction, member) => {
    try{
        let roleToRemove
        if(reaction.message.id == '765752313477988362'){
            let g = reaction.message.guild.member(member).roles.cache
            if(reaction.emoji.id == '765751012723523615') roleToRemove = '765749150796611614'//amongus pings
            if(reaction.emoji.id == '765751540144799745') roleToRemove = '765749245680418836'//mc pings
            if(reaction.emoji.name == '✏️') roleToRemove = '765749212263612466'//skribbl pings
            if(g.has(roleToRemove))
            try {await reaction.message.guild.member(member).roles.remove(roleToRemove)} catch (error) {} 
        }
        else if(reaction.message.id == '766084149110505503'){
            let g = reaction.message.guild.member(member).roles.cache
            if(reaction.emoji.name == '🇸') roleToRemove = '766084189115908116'//sen
            if(reaction.emoji.name == '🇯') roleToRemove = '766084246908960779'//jun
            if(reaction.emoji.name == '3️⃣') roleToRemove = '766084383991005195'//sop
            if(reaction.emoji.name == '🇫') roleToRemove = '766084645003460609'//fresh
            if(g.has(roleToRemove)) try{await reaction.message.guild.member(member).roles.remove(roleToRemove)}catch(error){}
        }
    }catch(error){console.log('Error on reaction role removal', error)}
})
module.exports = Module