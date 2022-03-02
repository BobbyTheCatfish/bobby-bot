const Augur = require('augurbot'),
  u = require('../utils/utils'),
  Discord = require('discord.js'),
  Module = new Augur.Module();

// Join message
Module.addEvent('guildMemberAdd', async (/** @type {Discord.GuildMember}*/ member) => {
  try {
    const preferences = await Module.db.welcome.getWelcome(member.guild.id);
    if (!preferences || preferences.enabled == false) return;
    const general = preferences.channel;
    const ruleChannel = preferences.ruleChannel;
    const welcomeEmoji = preferences.emoji;
    const joinRole = preferences.roles;
    const custom = preferences.custom;
    const r = u.rand;
    const welcome = [
      "Welcome",
      "Hi there",
      "Glad to have you here",
      "Ahoy",
      "Howdy",
      "Sup",
      "Salutations",
      "Greetings",
      "Hi",
      "Bonjour",
      "Buenos dias",
      "Hey",
      "Howdy-do",
      "What's up",
      "Aloha",
    ];
    const info1 = [
      "Take a look at",
      "Check out",
      "Head on over to",
    ];
    const info2 = [
      "to get started.",
      "for some basic community rules.",
      "and join in on the fun!"
    ];
    let welcomeString = `${r(welcome)}, ${member}! ${welcomeEmoji ?? ''} ${ruleChannel ? `${r(info1)} <#${ruleChannel}> ${r(info2)}` : ''}`;
    if (custom) welcomeString = `${custom.replace(/<@member>/gi, member)}`;
    const roles = joinRole.map(jr => member.guild.roles.cache.get(jr));
    const dontExist = roles.filter(a => a == null);
    if (dontExist.length > 0) return await u.errorChannel(member.guild).send(`I couldn't add the role${dontExist.length > 1 ? 's' : ''} to ${member}: \n${joinRole.join('\n')}\n\nPlease reconfigure the welcome procedure with !welcome.`);
    member.roles.add(roles);
    return member.guild.channels.cache.get(general).send(welcomeString);
  } catch (error) {
    u.errorHandler(member, error);
  }
})
.addCommand({ name: 'welcome',
  onlyGuild: true,
  memberPermissions: ['MANAGE_GUILD'],
  process: async (msg) => {
    const welcome = { channel: null, role: [], emoji: null, ruleChannel: null, welcome: null };
    const channelFilter = m => (m.content.startsWith('<#') && m.content.endsWith('>') || m.content.toLowerCase() == 'none') && m.author == msg.author;
    const contentFilter = m => m.content && m.author == msg.author;
    const time = 5000 * 60;
    const welcomeChannel = async () => {
      const promptEmbed = u.embed().setTitle('What channel should I send it in?').setDescription('Type it in the format of #channel-name\nType `none` to disable welcome messages');
      msg.channel.send({ embeds: [promptEmbed] }).then(async m => {
        await m.channel.awaitMessages({ filter: channelFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                const content = collected.first().content;
                if (content.toLowerCase() == 'none') {
                  Module.db.welcome.disableWelcome(msg.guild.id);
                  return collected.first().reply("Welcome disabled");
                } else {
                  welcome.channel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''));
                }
                if (!welcome.channel) {
                  msg.channel.send("I couldn't find that channel. Please try again");
                  return await welcomeChannel();
                }
                return await customOrRandom();
              });
      });
    };
    const customOrRandom = async () => {
      const promptEmbed = u.embed().setTitle("Do you want a custom message or a randomized one?").setDescription("Randomized messages can include a rules channel and emoji");
      msg.channel.send({ embeds: [promptEmbed] }).then(async m => {
        const choices = ['🔀', '🇨'];
        const reactionFilter = (reaction, user) => choices.includes(reaction.emoji.name) && user.id == msg.author.id;
        for (const x of choices) await m.react(x);
        await m.awaitReactions({ filter: reactionFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              const reaction = collected.first().emoji.name;
              if (reaction == choices[1]) return await customMessage();
              else return await emoji();
            });
      });
    };
    const customMessage = async () => {
      const promptEmbed = u.embed().setTitle("What do you want the message to say?").setDescription("Type `<@member>` in place of mentioning the new member");
      msg.channel.send({ embeds: [promptEmbed] }).then(async m => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              welcome.welcome = collected.first().content;
              return await role();
            });
      });
    };
    const emoji = async () => {
      const promptEmbed = u.embed().setTitle('What emoji should I use?').setDescription('Type `none` for none');
      msg.channel.send({ embeds: [promptEmbed] }).then(async m => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                const content = collected.first().content;
                if (content.toLowerCase() == 'none') {
                  return await rules();
                }
                const msgEmoji = msg.guild.emojis.cache.find(e => `<:${e.name.toLowerCase()}:${e.id}>` == content.toLowerCase());
                welcome.emoji = msgEmoji ? `<:${msgEmoji.name}:${msgEmoji.id}>` : content;
                await rules();
              });
      });
    };
    const rules = async () => {
      if (msg.guild.rulesChannel) {
        msg.channel.send("Looks like you have a rules channel set up, so we can skip this step");
        welcome.ruleChannel = msg.guild.rulesChannelId;
        return await role();
      }
      const promptEmbed = u.embed().setTitle("What is the rule channel?").setDescription("Type `none` for none");
      msg.channel.send({ embeds: [promptEmbed] }).then(async m => {
        await m.channel.awaitMessages({ filter: channelFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                const content = collected.first().content;
                if (content.toLowerCase() == 'none') {
                  return await role();
                }
                welcome.ruleChannel = msg.guild.channels.cache.get(content.replace(/[^0-9]/g, ''));
                if (!welcome.ruleChannel) {
                  msg.channel.send("I can't find that channel! Please try again.");
                  return await rules();
                } else {
                  return await role();
                }
              });
      });
    };
    const role = async () => {
      const promptEmbed = u.embed().setTitle("What roles should I add?").setDescription(`Type \`done\` to stop adding roles. You can add up to 5. (${5 - welcome.role.length} left)`);
      msg.channel.send({ embeds: [promptEmbed] }).then(async m => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                const content = collected.first().content;
                const fetchRole = msg.guild.roles.cache.find(r => r.id == content || r.name.toLowerCase() == content.toLowerCase() || `<@&${r.id}>` == content);
                if (content.toLowerCase() == 'done') {
                  return await finished();
                } else if (!fetchRole) {
                  msg.channel.send("I couldn't find that role! Please try again.");
                  return await role();
                }
                welcome.role.push(fetchRole.id);
                if (welcome.role.length >= 5) {
                  return await finished();
                } else {
                  return await role();
                }
              });
      });
    };
    const finished = async () => {
      const welcomeRoleArray = [];
      const welcomeString = welcome.welcome ?? `Welcome, ${msg.author}! ${welcome.emoji ? welcome.emoji + ' ' : ''}${welcome.ruleChannel ? `Check out <#${welcome.ruleChannel}> to get started!` : ''}`;
      const finalEmbed = u.embed().setTitle(`The following will be sent in #${msg.guild.channels.cache.get(welcome.channel).name} every time someone joins`).setDescription(`${welcomeString.replace(/<@member>/gi, msg.member)}${welcomeRoleArray.size > 0 ? `\n\n**The following roles will be assigned:**\n${welcomeRoleArray.join('\n')}` : ''}`);
      msg.channel.send({ embeds: [finalEmbed] });
      if (Module.db.welcome.saveWelcome(msg.guild.id, welcome.channel, welcome.role, welcome.emoji, welcome.ruleChannel, welcome.welcome) == null) return msg.channel.send("I ran into an error while saving.").then(u.errorHandler(msg, 'welcome saving'));
      return;
    };
    return await welcomeChannel();
  }
});

module.exports = Module;