const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({ name: "help",
  description: "Get a list of available commands or more in-depth info about a single command.",
  syntax: "[command name]",
  aliases: ["commands"],
  process: async (msg, suffix) => {
    async function sendUser(embed) {
      try {
        await msg.author.send({ embeds: [embed] });
        msg.react("👌");
        return u.clean(msg);
      } catch (e) {
        msg.reply("I couldn't send you a DM. Make sure that `Allow direct messages from server members` is enabled under the privacy settings, and that I'm not blocked").then(u.clean);
        return null;
      }
    }
    /** @type {Augur.CommandCollection} */
    const commands = msg.client.commands.filter(c => c.permissions(msg) && (msg.guild && c.memberPermissions ? msg.member.permissions.has(c.memberPermissions) : true) && c.enabled && !c.hidden && (c.onlyOwner ? msg.author.id == Module.config.ownerId : true) && (c.onlyGuild ? msg.guild : true) && (c.onlyDM ? !msg.guild : true));
    const prefix = await u.prefix(msg);
    let embed = u.embed();
    if (!suffix) { // FULL HELP
      embed.setTitle(`${msg.client.user.username} Commands ${msg.guild ? `in ${msg.guild.name}.` : ''}`).setDescription(`You have access to the following commands. For more info, type \`${prefix}help <command>\`.`);
      const categories = commands.filter(c => c.category != "General").map(c => u.properCase(c.category)).filter((c, i, a) => a.indexOf(c) == i).sort();
      categories.unshift("General");

      let i = 1;
      for (const category of categories) {
        for (const [name, command] of commands.filter(c => c.category == category).sort((a, b) => a.name.localeCompare(b.name))) {
          embed.addFields([{ name: `${prefix}${name} ${command.syntax}`, value: `${command.description || `No Description`}` }]);
          if (i == 20) {
            const result = await sendUser(embed);
            if (result == null) return;
            embed = u.embed().setTitle(`${embed.title} (Cont.)`).setDescription(embed.description);
            i = 0;
          }
          i++;
        }
      }
      return await sendUser(embed);
    } else { // SINGLE COMMAND HELP
      /** @type {Augur.CommandInfo} */
      let command = commands.get(suffix);
      command ??= msg.client.commands.aliases.get(suffix);
      if (command) {
        embed.setTitle(`${prefix}${command.name} help`).setDescription(command.info).addFields([{ name: "Category", value: command.category }]).addFields([{ name: "Usage", value: `${prefix}${command.name} ${command.syntax}` }]);
        if (command.aliases.length > 0) embed.addFields([{ name: "Aliases", value: command.aliases.map(a => `!${a}`).join(", ") }]);
        return await sendUser(embed);
      } else {msg.reply("I don't have a command by that name. If it's a tag, you can do !tags").then(u.clean);}
    }
  }
});

module.exports = Module;