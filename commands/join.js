const Augur = require('augurbot'),
  u = require('../utils/utils'),
  Discord = require('discord.js'),
  Module = new Augur.Module();

// Join message
Module.addEvent('guildMemberAdd', async (/** @type {Discord.GuildMember}*/ member) => {
  try {
    const preferences = await u.db.guildConfig.welcome.get(member.guild.id);
    console.log(preferences);
    if (!preferences || preferences.enabled == false) return;
    const general = preferences.channel;
    const ruleChannel = preferences.ruleChannel;
    const welcomeEmoji = preferences.emoji;
    const joinRoles = preferences.roles;
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
    const roles = joinRoles.map(jr => member.guild.roles.cache.get(jr));
    const dontExist = roles.filter(a => a == null);
    if (dontExist.length > 0) return;
    // return await u.errorChannel(member.guild).send(`I couldn't add the role${dontExist.length > 1 ? 's' : ''} to ${member}: \n${joinRoles.join('\n')}\n\nPlease reconfigure the welcome procedure with !welcome.`);
    member.guild.channels.cache.get(general).send(welcomeString);
    if (roles.length > 0) member.roles.add(roles.filter(a => a != null));
  } catch (error) {
    u.errorHandler(null, error);
  }
})
.addInteractionCommand({ name: 'welcome',
  onlyGuild: true,
  permissions: (int) => int.member && int.member.permissions.has('MANAGE_GUILD'),
  process: async (int) => {
    if (!int.guild) return int.reply({ content: "This can only be used in a server." });
    const channel = int.options.getChannel('channel');
    const custom = int.options.getString('message');
    const emoji = int.options.getString('emoji');
    const ruleChannel = int.options.getChannel('rule-channel');
    const role = int.options.getRole('role');
    const role2 = int.options.getRole('role2');
    const roles = [role].filter(r => r != undefined);
    if (role2 && role.id != role2.id) roles.push(role2);
    if (!u.cType(channel, 'GuildText')) return int.reply({ content: "The channel needs to be a text channel", ephemeral: true });
    if (!u.cType(ruleChannel, 'GuildText')) return int.reply({ content: "The rule channel needs to be a text channel.", ephemeral: true });
    if (await u.db.guildConfig.welcome.save(int.guild.id, { channel: channel.id, roles: roles.map(r => r.id), emoji, ruleChannel: ruleChannel.id, custom }) == null) return u.errorHandler(int, 'Saving Welcome Message');
    const welcome = custom ?? `Welcome, ${int.user}! ${emoji ?? ""} ${ruleChannel ? `Check out ${ruleChannel} to get started!` : ""}`;
    const embed = u.embed().setTitle(`The following will be sent in #${channel.name} every time someone joins`)
      .setDescription(welcome.replace(/<@member>/gi, int.user));
    if (roles.length > 0) embed.addFields([{ name: "Roles", value: `${roles.length == 1 ? "This role" : "These roles"} will be added to new members:\n${roles.join('\n')}` }]);
    int.reply({ embeds: [embed], ephemeral: true });
  }
});
module.exports = Module;