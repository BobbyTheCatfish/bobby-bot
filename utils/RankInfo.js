const scale = 200;

const Rank = {
  messages: [
    "Your future is looking so bright that I need sunglasses.",
    "Keep being awesome, and I'll keep saying congratulations.",
    "You have performed extremely adequately.",
    "I love it when good things happen to good people like you.",
    "My face has a proud smile because of you.",
    "I don't know if anyone has ever told you this before, but I think you are pretty great.",
    "Great things come from great people.",
    "I'm thinking of a word for you that starts with \"C\" and ends in \"ongratulations.\"",
    "I love your accomplishments almost as much as I love the person who did them.",
    "Thanks for giving me a good reason to say congratulations!",
    "You surprised me a little bit. I knew you were capable, but I didn't expect this level of accomplishment!",
    "I am excited for you, and I am wishing you the best.",
    "Just when I thought you couldn't impress me anymore, you did.",
    "I am proud of you. You have accomplished a lot.",
    "You deserve all the great things that are coming. Enjoy!",
    "I love to see good things come to good people. This is one of those times.",
    "The waiting is over! It's time to celebrate!",
    "Enjoy this time. Life is an adventure, and you are living it well!",
    "I can't think of any advice I need to give you. You have proven your competence.",
    "I have always known that good things would come your way. Your persistence is paying off!",
    "Sometimes I make a big deal about nothing, but this time I'm not exaggerating. Way to go!",
    "It's just one word, but it sums up what I want to express. Congratulations!",
    "I need to congratulate both of us because I knew you'd be successful!",
    "There's a time for everything, and right now is the time to say congratulations to you."
  ],

  levelPhrase: (name, lvl) => [
    `Welcome to ${name} Chat **Level ${lvl}**!`,
    `**Level ${lvl}** in ${name} is yours.`,
    `You reached **Level ${lvl}** in ${name}!`,
    `${name} Chat **Level ${lvl}** belongs to you.`,
    `Do something nice with **Level ${lvl}** in ${name}.`
  ],

  level: function(xp, s = scale) {
    xp = parseInt(xp, 10);
    return 1 + Math.floor((Math.sqrt(1 + (8 * xp) / s)) / 2);
  },

  minXp: function(level, s = scale) {
    level = parseInt(level, 10);
    return Math.floor(s * (Math.pow(2 * (level - 1), 2) - 1) / 8);
  },

  getRank: function(ranks, id) {
    const users = ranks.sort((a, b) => b.xp - a.xp);
    return users.findIndex(u => u.userId == id) + 1;
  },

  getLifeRank: function(ranks, id) {
    const users = ranks.sort((a, b) => b.lifeXP - a.lifeXP);
    return users.findIndex(u => u.userId == id) + 1;
  },

  getTop: function(ranks = [], limit = ranks.length, scope = 'xp') {
    if (!['xp', 'lifeXP'].includes(scope)) scope = 'xp';
    const users = ranks.sort((a, b) => b[scope] - a[scope]);
    return users.filter((a, i) => i < limit);
  }
};
module.exports = Rank;