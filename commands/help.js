const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "help",
  description: "Get a list of available commands or more indepth info about a single command.",
  syntax: "[command name]",
  aliases: ["commands"],
  process: async (msg, suffix) => {
    msg.react("👌");
    u.clean(msg);

    let prefix = await u.prefix(msg);
    let commands = Module.client.commands.filter(c => c.otherPerms(msg) && (msg.guild ? c.permissions ? msg.member.permissions.has(c.permissions) : true : true) && c.enabled && !c.hidden && (c.onlyOwner ? msg.author.id == Module.config.ownerId : true) && (c.onlyGuild ? msg.guild : true) && (c.onlyDM ? !msg.guild : true));

    let embed = u.embed()

    if (!suffix) { // FULL HELP
      embed.setTitle(`${msg.client.user.username} Commands${msg.guild ? ` in ${msg.guild.name}.` : '.'}`).setDescription(`You have access to the following commands. For more info, type \`${prefix}help <command>\`.`);
      let categories = commands.filter(c => !c.hidden && c.category != "General").map(c => c.category).reduce((a, c, i, all) => ((all.indexOf(c) == i) ? a.concat(c) : a), []).sort();
      categories.unshift("General");

      let i = 1;
      for (let category of categories) {
        for (let [name, command] of commands.filter(c => c.category == category && !c.hidden).sort((a, b) => a.name.localeCompare(b.name))) {
          embed.addField(`${prefix}${command.name} ${command.syntax}`, `${command.description || `Description`}`);
          if (i == 20) {
            try {await msg.author.send({embeds: [embed]});} catch(e) {return msg.channel.send("I couldn't send you a DM. Make sure that `Allow direct messages from server members` is enabled under the privacy settings, and that I'm not blocked.").then(u.clean);}
            embed = u.embed().setTitle(`${msg.client.user.username} Commands${msg.guild ? `in ${msg.guild.name}.` : '.'} (Cont.)`).setDescription(`You have access to the following commands. For more info, type \`${prefix}help <command>\`.`);
            i = 0;
          }
          i++;
        }
      }
      try {await msg.author.send({embeds: [embed]});} catch(e) {return msg.channel.send("I couldn't send you a DM. Make sure that `Allow direct messages from server members` is enabled under the privacy settings, and that I'm not blocked.").then(u.clean);}
    } else { // SINGLE COMMAND HELP
      let command = null;
      if (commands.has(suffix)) command = commands.get(suffix);
      else if (Module.client.commands.aliases.has(suffix)) command = Module.client.commands.aliases.get(suffix);
      if (command) {
        embed.setTitle(`${prefix}${command.name} help`).setDescription(command.info).addField("Category", command.category).addField("Usage", `${prefix}${command.name} ${command.syntax}`);
        if (command.aliases.length > 0) embed.addField("Aliases", command.aliases.map(a => `!${a}`).join(", "));
        try {await msg.author.send({embeds: [embed]});} catch(e) {return msg.channel.send("I couldn't send you a DM. Make sure that `Allow direct messages from server members` is enabled under the privacy settings, and that I'm not blocked.").then(u.clean);}
      }
      else msg.reply("I don't have a command by that name. If it's a tag, you can do !tags").then(u.clean);
    }
  }
});

module.exports = Module;