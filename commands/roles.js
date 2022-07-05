const Augur = require('augurbot'),
  u = require('../utils/utils'),
  emoji = require('emoji-aware').onlyEmoji,
  Module = new Augur.Module();
Module.addCommand({ name: "inventory",
  onlyGuild: true,
  process: async (msg) => {
    const inventory = msg.guild.roles.cache.filter(r => msg.member.roles.cache.find(e => e.name.toLowerCase() + ' colors' == r.name.toLowerCase())).map(r => `<@&${r.id}>`).join("\n");
    const embed = u.embed().setAuthor(msg.member.displayName, msg.member.user.displayAvatarURL({ format: 'png' }))
      .setTitle("Equippable Color Inventory")
      .setDescription(`Equip a color role with \`!equip Role Name\` without the "Colors"\ne.g. \`!equip novice\`\n\n${inventory}`).setFooter('Use !equip none to unequip any roles.');
    if (!inventory) return msg.channel.send("You don't have any colors in your inventory!").then(u.clean);
    else return msg.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  }
})
.addCommand({ name: "equip",
  onlyGuild: true,
  process: async (msg, args) => {
    const words = args.split(' ');
    // stuff for huddy's server
    if (msg.guild.id == '779497076564164620') {
      const regex = /COLOR \d+/;
      if (!args) {
        const embed = u.embed().setTitle('Available Colors').setDescription(`Do \`!equip <number>\` for the color\nThis message will self destruct in 30 seconds.\n${msg.guild.roles.cache.filter(r => regex.exec(r.name)).sort((a, b) => a.name.replace('COLOR', '') - b.name.replace('COLOR', '')).map(r => r).join('\n')}`);
        return msg.channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).then(u.clean(msg, 30000));
      }
      if (words[0].toLowerCase() == 'none') {
        msg.member.roles.cache.forEach(role => {if (regex.exec(role.name)) msg.member.roles.remove(role);});
        return await msg.react('👌');
      } else {
        const number = args;
        if (isNaN(number) || number < 1) return msg.channel.send("That's not a valid number!");
        const role = msg.guild.roles.cache.find(r => r.name == `COLOR ${number}`);
        if (!role) return msg.channel.send('I couldn\'t find that role.');
        msg.member.roles.cache.forEach(r => {if (regex.exec(r.name)) msg.member.roles.remove(r);});
        await msg.member.roles.add(role);
        return await msg.react('👌').then(u.clean(msg));
      }
    }
    if (words[0].toLowerCase() == 'none') {
      msg.member.roles.cache.forEach(role => {if (role.name.toLowerCase().endsWith('colors')) msg.member.roles.remove(role);});
      await msg.react('👌');
    } else if (words[0].toLowerCase() == 'help') {
      const embed = u.embed()
        .setTitle("How to set up role color equiping")
        .setAuthor("Bobby Bot", "https://images-ext-1.discordapp.net/external/PnqhQnz3eY98xD8GMtgLKTv9GJ7ZvVjqg5-oiGbSRjk/https/cdn.discordapp.com/avatars/469983220172324908/480bacea977058eed3ff1032470e8034.webp")
        .setColor('#2e93ff')
        .addFields([{ name: 'Step 1:', value: 'Create a new role below all other ones. Make sure that it has the same name, followed by `Colors` (example: the new role for the role `Bob Boi` would be `Bob Boi Colors`)', inline: true },
          { name: 'Step 2', value: 'Set the color of the new role to the color of the old one', inline: false },
          { name: 'Step 3', value: 'Set the color of the old role to the default color. This will make it transparent.', inline: false },
          { name: 'Step 4', value: 'Repeat steps 1-3 for all the roles that you want to have equipable colors', inline: false }])
        .setImage("https://media.discordapp.net/attachments/727981742937342002/749339754113400892/roles.gif");
      return msg.channel.send({ embeds: [embed] });
    } else {
      const keywords = words.slice(0).join(' ');
      const role = msg.guild.roles.cache.find(r => r.name.toLowerCase() == keywords.toLowerCase());
      const colorRole = msg.guild.roles.cache.find(r => r.name.toLowerCase() == keywords.toLowerCase() + ' colors');
      if (!role) return msg.channel.send("That's not a valid role").then(m => u.clean(m)).then(u.clean(msg));
      if (!colorRole) return msg.channel.send("Looks like the colors aren't set up for that role!").then(m => u.clean(m)).then(u.clean(msg));
      if (!msg.member.roles.cache.has(role.id)) {return msg.channel.send("sorry, you don't have that role").then(m => u.clean(m)).then(u.clean(msg));} else {
        msg.member.roles.cache.forEach(r => {if (r.name.toLowerCase().endsWith('colors')) msg.member.roles.remove(r);});
        await msg.member.roles.add(colorRole);
        await msg.react("👌").then(u.clean(msg));
      }
    }
  }
})
.addCommand({ name: 'reactionrole',
  memberPermissions: ['ADMINISTRATOR'],
  // onlyOwner: true,
  process: async (msg) => {
    u.clean(msg, 0);
    const things = [],
      yesNo = ['✅', '❌'],
      time = 5000 * 60;
    const filter = r => yesNo.includes(r.emoji.name) && !r.me;
    const roleFilter = m => msg.guild.roles.cache.find(r => r.id == m.content || r.name.toLowerCase() == m.content.toLowerCase());
    const emojiFilter = m => emoji(m.content)[0] ? { id: null, name: emoji(m.content)[0] } : null || msg.guild.emojis.cache.find(e => e.id == m.content.replace(/[^0-9]]/g, '') || e.name.toLowerCase() == m.content.toLowerCase());
    if (u.db.reactionRoles.getGuildReactionRole(msg.guild.id)[0]) return msg.reply("Looks like there's already a reaction role thing set up! Modification and deletion coming soon.");
    const sendNSave = async () => {
      const embed = u.embed().setTitle('Should the roles be removed when the user unreacts?');
      msg.author.send({ embeds: [embed] }).then(async m => {
        await u.react(m, yesNo);
        await m.awaitReactions({ filter, max: 1, time, errors: ['time'] }).then(async collected => {
          let removeOnUnreact = false;
          if (collected.first().emoji.name == yesNo[0]) removeOnUnreact = true;
          const combine = [];
          for (const x of things) combine.push(`${x.id ? `<:${x.name}:${x.id}>` : x.name} - <@&${x.roleId}>`);
          embed.setTitle(`Get your role${things.length > 1 ? 's' : ''}!`).setDescription(`React with the corresponding emoji to get the role!${removeOnUnreact ? '\nUnreact to get the role taken away.' : ''}\n${combine.join('\n')}`).setFooter('Remember that you have to use !equip <role name> to get the color!');
          msg.author.send(`Sending the message in ${msg.channel}`);
          msg.channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).then(async message => {
            await u.db.reactionRoles.saveReactionRoles(message, things, removeOnUnreact);
            await u.react(message, things.map(t => t.id || t.name));
            await message.pin();
          });
        });
      });
    };
    const prompt = async () => {
      let embed = u.embed().setTitle(`What should the ${things.length < 1 ? 'first' : 'next'} emoji be?`).setDescription('You can either use the emoji, or type the name or id of a server emoji.');
      msg.author.send({ embed }).then(async m => {
        const collected = await m.channel.awaitMessages({ filter: emojiFilter, max: 1, time, errors: ['time'] });
        const emote = emojiFilter(collected.first());
        if (things.find(t => t.id ? t.id == emote.id : t.name == emote.name)) {
          embed = u.embed().setTitle(`That emoji is already assigned to a role`);
          msg.author.send({ embeds: [embed] });
          return await (prompt());
        }
        const prompt2 = async () => {
          embed = u.embed().setTitle(`What role should be associated with ${emote.id ? `<:${emote.name}:${emote.id}` : emote.name}?`);
          const ms = msg.author.send({ embeds: [embed] });
          await ms.channel.awaitMessages({ filter: roleFilter, max: 1, time, errors: ['time'] }).then(async coll => {
            const role = roleFilter(coll.first());
            if (things.find(t => t.roleId == role.id)) {
              embed = u.embed().setTitle(`That role is already assigned to an emoji`);
              msg.author.send({ embeds: [embed] });
              return await prompt2();
            }
            things.push({ name: emote.name, id: emote.id, roleId: role.id });
            if (things.length >= 10) return await sendNSave();
            embed = u.embed().setTitle(`Do you want to add more? (*${10 - things.length}* left)`).setDescription(`The following has been added:\n${emote.id ? `<:${emote.name}:${emote.id}` : emote.name} - ${role.name}`);
            msg.author.send({ embeds: [embed] }).then(async message => {
              await u.react(message, yesNo);
              await message.awaitReactions({ filter, max: 1, time, errors: ['time'] }).then(async collect => {
                const reacted = collect.first().emoji.name;
                if (reacted == yesNo[0]) return await prompt();
                else return await sendNSave();
              });
            });
          });
        };
        await prompt2();
      });
    };
    await prompt();
  }
})
.addEvent("messageReactionAdd", async (reaction, user) => {
  try {
    const dbLookup = await u.db.reactionRoles.getReactionRole(reaction.message.id);
    if (dbLookup[0]) {
      const message = await reaction.message.fetch();
      const member = message.guild.members.cache.get(user.id);
      const role = dbLookup[0].reactions.find(r => reaction.emoji.id ? reaction.emoji.id == r.id : reaction.emoji.name == r.name)?.roleId;
      if (!role) reaction.users.remove(member.user);
      else if (!message.guild.roles.cache.get(role)) return (await u.errorChannel(message)).send({ embeds: [u.embed().setTitle('Reaction Role Error').setDescription(`Looks like one of the roles on the reaction role message is no longer around!`)] });
      else if (!member.roles.cache.get(role)) member.roles.add(role);
    }
  } catch (error) {u.errorHandler(error, 'Error on adding reaction role');}
})
.addEvent("messageReactionRemove", async (reaction, user) => {
  try {
    const dbLookup = await u.db.reactionRoles.getRemoveableRoles(reaction.message.id);
    if (dbLookup) {
      const message = await reaction.message.fetch();
      const member = message.guild.members.cache.get(user.id),
        role = dbLookup.reactions.find(r => reaction.emoji.id ? reaction.emoji.id == r.id : reaction.emoji.name == r.name)?.roleId;
      if (!message.guild.roles.cache.get(role)) (await u.errorChannel(message)).send({ embeds: [u.embed().setTitle('Reaction Role Error').setDescription(`Looks like one of the roles on the reaction role message is no longer around!`)] });
      else if (member.roles.cache.get(role)) member.roles.remove(member.guild.roles.cache.get(role));
    }
  } catch (error) {u.errorHandler(error, 'Error on reaction role removal');}
})
.addEvent('ready', async () => {
  const dbLookup = await u.db.reactionRoles.getAllReactionRoles();
  for (const { messageId, channelId } of dbLookup) Module.client.channels.cache.get(channelId).messages.fetch(messageId);
});
module.exports = Module;