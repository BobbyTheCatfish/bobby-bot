const Augur = require("augurbot"),
  Rank = require("../utils/RankInfo"),
  u = require("../utils/utils");
const active = u.collection();

const sf = {
  ldsg: '406821751905976320',
  trusted: '813860313270321222',
  modlogs: '789694239197626371',
  announcements: '789694239197626371',
  mod: '813860313270321222'
};

const isActive = (guildId, userId) => active.get(guildId)?.includes(userId);
const Module = new Augur.Module()
.setInit(async (talking) => {
  if (talking) {
    for (const user of talking) active.set(user);
  } else {
    const ranks = await u.db.ranks.getAllDocuments();
    for (const guild of ranks) active.set(guild.guildId, []);
  }
})
.setUnload(() => active)
.addInteractionCommand({ name: 'rank',
  commandId: "989320805085245480",
  permissions: async (int) => int.guild,
  process: async (int) => {

    const command = int.options.getSubcommand();
    switch (command) {
    case 'view': return await view();
    case 'leaderboard': return await leaderboard();
    case 'track': return await trackxp();
    case 'xp': return await xp();
    case 'season-reset': return await reset();
    case 'config': return await config();
    }
    async function leaderboard() {
      try {
        const scope = int.options.getString('timeframe') || 'xp';
        const ranks = await u.db.ranks.getAllRanks(int.guild.id);
        const users = ranks?.users;
        const top10 = Rank.getTop(users, 10, scope);
        if (top10.length < 1) return int.reply({ content: "Looks like there isn't anyone participating!", ephemeral: true });
        const embed = u.embed().setTitle(`${int.guild.name} Chat Leaderboard`)
          .setDescription(top10.map((user, i) => `${i + 1}: <@${user.userId}>: ${user.xp} (Lifetime: ${user.lifeXP})`).join('\n'));
        return int.reply({ embeds: [embed], allowedMentions: { parse: [] } });
      } catch (e) {
        u.errorHandler(e, int);
      }
    }

    async function view() {
      try {
        const member = int.options.getMember('user') || int.member;
        let response = null;

        const memberInfo = await u.db.ranks.getRank(int.guild.id, member.id);
        const allRanks = await u.db.ranks.getAllRanks(int.guild.id);
        const stillInRanks = allRanks.users.filter(user => int.guild.members.cache.get(user.userId));
        if (memberInfo.excludeXP || member.user.bot) {
          if (int.member.permissions.any(['MODERATE_MEMBERS', 'MANAGE_ROLES'])) {
            response = `> **${member.displayName}** Activity: ${memberInfo.posts} posts.`;
          } else {
            const snark = [
              "don't got time for dat.",
              "ain't interested in no XP gettin'.",
              "don't talk to me no more, so I ignore 'em."
            ];
            response = `**${member.displayName}** ${u.rand(snark)}\n(Try \`/rank track\` if you want to participate in chat ranks!)`;
          }
          return int.reply({ content: response, ephemeral: true });
        } else {
          const userDoc = await u.db.ranks.getRank(int.guild.id, member.id);
          userDoc.level = Rank.level(userDoc.lifeXP);
          userDoc.nextLevel = parseInt(Rank.minXp(userDoc.level + 1), 10).toLocaleString();
          userDoc.currentRank = Rank.getRank(stillInRanks, member.id);
          userDoc.lifetimeRank = Rank.getLifeRank(allRanks.users, member.id);
          response = u.embed()
            .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL({ dynamic: true }) })
            .setTitle(`${int.guild.name} Chat Ranking`)
            .addFields([
              { name: "Rank", value: `Season: ${userDoc.currentRank}/${int.guild.memberCount}\nLifetime: ${userDoc.lifetimeRank}/${Math.max(allRanks.users.length, int.guild.memberCount)}`, inline: true },
              { name: "Level", value: `Current Level: ${userDoc.level}\nNext Level: ${userDoc.nextLevel} XP`, inline: true },
              { name: "Exp.", value: `Season: ${parseInt(userDoc.xp, 10).toLocaleString()} XP\nLifetime: ${parseInt(userDoc.lifeXP, 10).toLocaleString()} XP`, inline: true }
            ]);
          return int.reply({ embeds: [response] });
        }
      } catch (e) {
        u.errorHandler(e, int);
      }
    }
    async function trackxp() {
      const choice = int.options.getBoolean('choice');
      const opted = await u.db.ranks.opt(int.guild.id, int.user.id, choice);
      if (!opted) return int.reply({ content: "This server doesn't have a leaderboard set up.", ephemeral: true });
      else return int.reply({ content: `You should ${choice ? 'now' : 'no longer'} get XP from your messages.`, ephemeral: true });
    }
    async function xp() {
      try {
        if (!int.member.permissions.has(["MANAGE_GUILD"])) return int.reply({ content: "You need the `Manage Server` permission to use this command.", ephemeral: true });
        const num = int.options.getInteger('xp');
        const user = int.options.getMember('user');
        if (user.user.bot) return int.reply({ content: "Bots have a rare condition that makes them unable to gain or lose XP", ephemeral: true });
        if (num == 0) return int.reply({ content: "Nothing has been changed...", ephemeral: true });
        const rank = await u.db.ranks.getRank(int.guild.id, user.id);
        if (0 - num > rank.lifeXP && num < 0) return int.reply({ content: `${user} doesn't have that much XP! They only have ${rank.lifeXP}`, ephemeral: true });
        let fromXP = num;
        if (fromXP > rank.xp && fromXP < 0) fromXP = rank.xp;
        const newRank = await u.db.ranks.addXP(u.collection().set(int.guild.id, [user.id]), fromXP, num);
        const newUser = newRank.guilds[0].users[0];
        const embed = u.embed().setTitle(`XP ${num > 0 ? 'Given' : 'Taken'}`)
          .setDescription(`Was: ${rank.xp} (Lifetime: ${rank.lifeXP})\nIs: ${newUser.xp} (Lifetime: ${newUser.lifeXP})`);
        return int.reply({ embeds: [embed], ephemeral: true });
      } catch (e) {
        u.errorHandler(e, int);
      }
    }
    async function reset() {
      try {
        // add in a confirmation at some point
        if (!int.member.permissions.has(["MANAGE_GUILD"])) return int.reply({ content: "You need the `Manage Server` permission to use this command.", ephemeral: true });
        const members = await int.guild.members.fetch({ cache: false });
        const ranks = await u.db.ranks.getAllRanks(int.guild.id);
        if (!ranks) return int.reply("You don't have a leaderboard set up.");
        const users = ranks.users.filter(user => members.has(user.userId));
        const medals = ["🥇", "🥈", "🥉"];
        const top3 = users
          .sort((a, b) => b.xp - a.xp)
          .filter((a, i) => i < 3)
          .map((user, i) => `${medals[i]} - ${members.get(user.userId)}`)
          .join("\n");
        let announce = `__**CHAT RANK RESET!!**__\n\nAnother chat season has come to a close! In the most recent season, we've had ${users.length} active members who are tracking XP chatting! The most active members were:\n${top3}`;
        announce += "\n\nIf you would like to participate in this season's chat ranks and *haven't* opted in, `/rank track` will get you in the mix. Users who have previously used `!trackxp` don't need to do so again.";
        int.guild.channels.cache.get(sf.announcements).send(announce);
        await u.db.ranks.resetRanks(int.guild.id);
      } catch (e) {
        u.errorHandler(e, int);
      }
    }
    async function config() {
      try {
        if (!int.member.permissions.has('MANAGE_GUILD')) return int.reply({ content: "You don't have permissions to use this command!", ephemeral: true });
        const enable = int.options.getBoolean('enable');
        const excludeR = int.options.getRole('exclude-role');
        const excludeC = int.options.getChannel('exclude-channel');
        const reward = int.options.getRole('reward');
        const level = int.options.getInteger('reward-level');
        const rate = int.options.getInteger('xp-rate');
        const see = int.options.getBoolean('view');
        let doc = await u.db.ranks.getAllRanks(int.guild.id);
        if (!doc && enable == null && !see) return int.reply({ content: "Looks like the leaderboard hasn't been configured yet. You can do that with `/rank config enable: true`", ephemeral: true });
        if (see) {
          const embed = u.embed().setTitle("Leaderboard Settings").addFields([
            { name: "Enabled", value: `${doc.enabled}` },
            { name: "Leveling Rate", value: `${doc.rate} (on a scale of 1 being easy, 10 being hard)` }
          ]);
          if (doc.exclude?.roles?.length > 0) embed.addFields([{ name: "Excluded Roles", value: doc.exclude.roles.map(r => `<@&${r}>`).join('\n') }]);
          if (doc.exclude?.channels?.length > 0) embed.addFields([{ name: "Excluded Channels", value: doc.exclude.channels.map(r => `<#${r}>`).join('\n') }]);
          if (doc.roles?.length > 0) embed.addFields([{ name: "Rewards", value: doc.roles.sort((a, b) => a.lvl - b.lvl).map(r => `<@&${r.id}> at level ${r.lvl}`).join('\n') }]);
          return int.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        }
        if (enable == null && !excludeR && !excludeC && !reward && level == null && !rate) return int.reply({ content: "You need to provide some options.", ephemeral: true });
        if ((doc?.enabled ?? false) == enable) return int.reply({ content: `The leaderboard is already ${enable ? 'enabled' : 'disabled'}`, ephemeral: true });
        if (reward && !level && (doc ? !doc.roles.find(r => r.id == reward.id) : true)) return int.reply({ content: "You need to provide a level that the reward should be applied at", ephemeral: true });
        if (!reward && level) return int.reply({ content: "You need to provide a role to be provided at that level" });
        const found = doc?.roles.find(r => r.lvl == level);
        if (doc && found) return int.reply({ content: `There's already a reward at that level! <@&${found.id}> (${found.id}). If this role has been deleted, then submit an issue with \`!issue\``, ephemeral: true });
        if (level && level < 2) return int.reply({ content: "The reward level needs to be at least 2. If you want to give a role to newcomers, try `/welcome`.", ephemeral: true });
        if (rate && (rate < 1 || rate > 10)) return int.reply({ content: "The XP rate needs to be between 1 and 10.", ephemeral: true });
        const changed = [];
        let previousERoles = doc?.exclude.roles ?? [];
        let previousEChannels = doc?.exclude.channels ?? [];
        let previousRewards = doc?.roles ?? [];
        if (excludeR) {
          if (previousERoles.includes(excludeR.id)) previousERoles = previousERoles.filter(r => r != excludeR.id);
          else previousERoles.push(excludeR.id);
          changed.push({ value: excludeR.toString(), name: previousERoles.includes(excludeR.id) ? 'Role Excluded' : 'Role Reincluded' });
        }
        if (excludeC) {
          if (previousEChannels.includes(excludeC.id)) previousEChannels = previousEChannels.filter(r => r != excludeC.id);
          else previousEChannels.push(excludeC.id);
          changed.push({ value: excludeC.toString(), name: previousEChannels.includes(excludeC.id) ? 'Channel Excluded' : 'Channel Reincluded' });
        }
        if (reward) {
          const pR = previousRewards.find(r => r.id == reward.id);
          console.log(pR);
          if (pR) {
            if (!level || level == pR.lvl) {
              previousRewards = previousRewards.filter(r => r.id != reward.id);
              changed.push({ value: `${reward} at level ${pR.lvl}`, name: 'Reward Removed' });
            } else {
              previousRewards = previousRewards.filter(r => r.id != reward.id);
              previousRewards.push({ id: reward.id, lvl: level });
              changed.push({ value: `${reward} went from level ${pR.lvl} to level ${level}`, name: 'Reward Changed' });
            }
          } else {
            previousRewards.push({ id: reward.id, lvl: level });
            changed.push({ value: `${reward} at level ${level}`, name: 'Reward Added' });
          }
        }
        if (enable != null) changed.push({ value: enable ? 'Enabled' : 'Disabled', name: 'Status' });
        if (rate && rate != doc.rate) changed.push({ value: `Rate went from ${doc.rate} to ${rate}`, name: 'Rate Changed' });
        if (!doc) doc = { enabled: false, exclude: {}, rate: 2 };
        doc.enabled = enable ?? doc.enabled;
        doc.exclude = { roles: previousERoles, channels: previousEChannels };
        doc.roles = previousRewards;
        doc.rate = rate ?? doc.rate;
        if (changed.length == 0) return int.reply({ content: "Nothing was changed.", ephemeral: true });
        const newDoc = await u.db.ranks.configGuild(int.guild.id, doc);
        if (!newDoc) return u.errorHandler(new Error('No Rank Config'), int);
        const embed = u.embed().setTitle("Leaderboard Changed")
          .setDescription("Here are the settings that were changed:")
          .addFields(changed);
        return await int.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
      } catch (e) {
        return u.errorHandler(e, int);
      }
    }
  }
})
.addEvent("messageCreate", async (msg) => {
  if (msg.guild && !msg.author.bot && !msg.author.system) {
    const rankDoc = await u.db.ranks.getGuild(msg.guild.id);
    if (!rankDoc) return;
    if (!isActive(msg.guild.id, msg.member.id) &&
    !rankDoc.users?.find(user => user.userId == msg.author.id)?.excludeXP &&
    !(rankDoc.exclude?.channels.includes(msg.channel.id) || rankDoc.exclude.channels.includes(msg.channel.parent?.id)) &&
    !msg.webhookId && !await u.parse(msg) && !msg.author.bot &&
    !msg.member.roles.cache.hasAny(rankDoc.exclude.roles)) {
      console.log('ehe');
      if (!active.has(msg.guild.id)) return active.set(msg.guild.id, [msg.author.id]);
      else return active.get(msg.guild.id).push(msg.author.id);
    }
  }
})
.setClockwork(() => {
  const bot = Module.client;
  return setInterval(async function() {
    const response = await u.db.ranks.addXP(active);
    active.clear();
    const ranks = await u.db.ranks.getAllDocuments();
    for (const guild of ranks) active.set(guild.guildId, []);

    if (response?.guilds.length > 0) {
      const ldsg = bot.guilds.cache.get(sf.ldsg);
      for (const guild of response.guilds) {
        const server = bot.guilds.cache.get(guild.guildId);
        for (const user of guild.users) {
          const member = server.members.cache.get(user.userId);

          if ((user.posts % 50 == 0) && user.posts >= 50 && !member.roles.cache.has(sf.trusted)) {
            const modLogs = ldsg.channels.cache.get(sf.modlogs);
            await modLogs.send(`${member} has posted ${user.posts} times in chat without being trusted!`);
          }

          if (!user.excludeXP) {
            const oldXP = user.lifeXP - response.xp;
            const lvl = Rank.level(user.lifeXP);
            const oldLvl = Rank.level(oldXP);

            if (lvl != oldLvl) {
              const embed = u.embed().setTitle(`Level Up!`)
                .setDescription(`${u.rand(Rank.messages)}\n${u.rand(Rank.levelPhrase(server.name, lvl))}`)
                .setAuthor({ name: server.name, iconURL: server.iconURL() });
              const role = guild.roles.find(r => r?.lvl == lvl);
              if (role) {
                const reward = server.roles.cache.get(role.id);
                if (reward) {
                  await member.roles.remove(guild.roles.filter(r => r.id != reward.id).map(r => r.id));
                  await member.roles.add(reward.id);
                  embed.description += `\n\nYou have been awarded the ${reward.name} role!`;
                }
              }
              member.send({ embeds: [embed] }).catch(u.noop);
            }
          }
        }
      }
    }
  }, 60000);
});

module.exports = Module;