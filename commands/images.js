const Augur = require('augurbot'),
  u = require('../utils/utils'),
  Jimp = require('jimp'),
  discord = require('discord.js'),
  { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap'),
  axios = require('axios'),
  schedule = require('node-schedule'),
  petPetGif = require('pet-pet-gif'),
  fs = require('fs');

/**
 * @callback filterFunction
 * @param {discord.CommandInteraction} int
 * @param {Jimp} img
 * @returns {Promise<void>}
 *
 * @callback process
 * @param {number} x
 * @param {number} y
 * @param {Jimp} canvas
 * @param {number} index
 */

const readError = 'I ran into an error while getting the image. It might be too large.';

function petPic(pet, url, remove = true) {
  const db = u.lowdb('jsons/petpics.json');
  db.defaults({ luna: [], goose: [], juan: [] }).write();
  let reset = false;
  if (!url) {
    if (db.get(pet).value().length < 1) {
      if (pet == 'luna') db.assign({ luna: fs.readFileSync('media/luna.txt', 'utf-8').split('\n') }).write();
      else if (pet == 'goose') db.assign({ goose: fs.readFileSync('media/goose.txt', 'utf-8').split('\n') }).write();
      else if (pet == 'juan') db.assign({ juan: fs.readFileSync('media/juan.txt', 'utf-8').split('\n') }).write();
      reset = true;
    }
    const pic = u.rand(db.get(pet).value());
    if (remove) db.get(pet).pull(pic).write();
    return (reset ? `We've gone through all the ${pet} pics! Starting over now...\n` : "") + pic;
  } else {return db.get(pet).push(url).write();}
}

const Module = new Augur.Module();

/**
 * Get the image from an interaction.
 * @param {discord.CommandInteraction} int
 * @param {number} size size of the image
 * @returns {Promise<string>} image url
 */
async function targetImg(int, size = 256) {
  if (int.options.getAttachment('file')) {
    const url = int.options.getAttachment('file').url;
    if (!await u.validImage(url)) return null;
    else return url;
  }
  const target = (int.options[int.guild ? "getMember" : "getUser"]('user')) ?? int.user;
  return target.displayAvatarURL({ extension: 'png', size, dynamic: true });
}

/**
 * Apply a filter function with parameters. Useful for when there isn't much logic to it
 * @param {discord.CommandInteraction} int
 * @param {string} filter filter to apply
 * @param {any[]} params array of params to pass into the filter function
 */
async function basicFilter(int, img, filter, params) {
  if (params) img[filter](...params);
  else img[filter]();
  const output = await img.getBufferAsync(Jimp.MIME_PNG);
  return int.editReply({ files: [output] });
}

/**
 * For filters like andywarhol and popart, where the image gets pasted 4 times with a bit of space in-between.
 * `run` will be called 4 times and provides an index
 * @param {Jimp} img the base image
 * @param {number} o offest (default 12)
 * @param {process} run the process to run (x, y, canvas, index)
 * @returns {Jimp}
 */
function fourCorners(img, o = 12, run) {
  const width = img.getWidth(),
    height = img.getHeight(),
    canvas = new Jimp(width * 2 + (o * 3), height * 2 + (o * 3), 0xffffffff),
    positions = [[o, o], [width + (o * 2), o], [o, height + (o * 2)], [width + (o * 2), height + (o * 2)]];

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    run(p[0], p[1], canvas, i);
  }
  return canvas;
}

/** @type {filterFunction} */
async function amongus(int, img) {
  const colors = ['black', 'blue', 'brown', 'cyan', 'green', 'lime', 'orange', 'pink', 'purple', 'red', 'white', 'yellow', 'maroon', 'rose', 'banana', 'gray', 'tan', 'coral'];
  let color = int.options.getString('option');
  if (!colors.includes(color)) color = u.rand(colors);
  const base = await Jimp.read(`media/amongians/${color}.png`);
  const mask = await Jimp.read('media/amongians/mask.png');
  const helmet = await Jimp.read('media/amongians/helmet.png');
  img = base.clone().blit(img.resize(370, Jimp.AUTO), 375, 130).mask(mask, 0, 0);
  const output = await base.blit(img, 0, 0)
    .blit(helmet, 0, 0)
    .getBufferAsync(Jimp.MIME_PNG);
  await int.editReply({ files: [output] });
}

/** @type {filterFunction} */
async function andywarhol(int, img) {
  const output = await fourCorners(img, 12, (x, y, c) => {
    img.color([{ apply: 'spin', params: [60] }]);
    c.blit(img, x, y);
  }).getBufferAsync(Jimp.MIME_PNG);
  return await int.editReply({ files: [output] });
}

/** @type {filterFunction} */
async function spin(int, img) {
  let i = 0;
  const deg = 30;
  const gifFrames = [];
  const scale = Math.min(img.getHeight(), img.getWidth());
  img.crop(0, 0, scale, scale).circle();
  do {
    const newImage = img.clone().rotate((0 - deg) * i).autocrop();
    const frame = new GifFrame(new BitmapImage(newImage.bitmap), { delayCentisecs: 3 });
    GifUtil.quantizeSorokin(frame);
    gifFrames.push(frame);
    i++;
  } while (i < (360 / deg));
  const result = await GifCodec.prototype.encodeGif(gifFrames);
  return int.editReply({ files: [{ attachment: result.buffer, name: 'output.gif' }] });
}

/** @type {filterFunction} */
async function colorme(int, img) {
  const color = Math.floor(Math.random() * 359);
  const output = await img.color([{ apply: 'hue', params: [color] }]).getBufferAsync(Jimp.MIME_PNG);
  return int.editReply({ content: `Hue: ${color}`, files: [output] });
}

/** @type {filterFunction} */
async function deepfry(int, img) {
  const output = await img.posterize(20)
    .color([{ apply: 'saturate', params: [100] }])
    .contrast(1)
    .getBufferAsync(Jimp.MIME_PNG);
  return int.editReply({ files: [output] });
}

/** @type {filterFunction} */
async function flex(int, img) {
  const right = await Jimp.read("https://cdn.discordapp.com/attachments/789694239197626371/1011871628835168256/flexArm.png");
  const left = right.clone().flip(true, Math.random() > 0.5);
  const canvas = new Jimp(368, 128, 0x00000000);
  right.flip(false, Math.random() > 0.5);
  if (!img.hasAlpha()) img.circle();
  img.resize(128, 128);
  const output = await canvas.blit(left, 0, 4)
    .blit(right, 248, 4)
    .blit(img, 120, 0)
    .getBufferAsync(Jimp.MIME_PNG);
  return int.editReply({ files: [output] });
}

/** @type {filterFunction} */
async function metal(int, img) {
  const right = await Jimp.read('https://cdn.discordapp.com/attachments/789694239197626371/1011871629288157194/metalHand.png');
  const left = right.clone().flip(true, false);
  const canvas = new Jimp(368, 128, 0x00000000);
  if (!img.hasAlpha()) img.circle();
  img.resize(128, 128);
  const output = await canvas.blit(right, 0, 4)
    .blit(left, 248, 4)
    .blit(img, 120, 0)
    .getBufferAsync(Jimp.MIME_PNG);
  return int.editReply({ files: [output] });
}

/** @type {filterFunction} */
async function personal(int, img) {
  const canvas = await Jimp.read('https://cdn.discordapp.com/attachments/789694239197626371/1011871629564985364/personalBase.png');
  img.resize(350, 350);
  if (!img.hasAlpha()) img.circle();
  const output = await canvas.blit(img, 1050, 75).getBufferAsync(Jimp.MIME_PNG);
  return await int.editReply({ files: [output] });
}

/** @type {filterFunction} */
async function petpet(int) {
  const gif = await petPetGif(await targetImg(int));
  return await int.editReply({ files: [{ attachment: gif, name: 'petpet.gif' }] });
}

/** @type {filterFunction} */
async function popart(int, img) {
  const output = await fourCorners(img, 12, (x, y, c, i) => {
    if (i == 0) img.color([{ apply: "desaturate", params: [100] }, { apply: 'saturate', params: [50] }]);
    else img.color([{ apply: "spin", params: [i == 3 ? 120 : 60] }]);
    c.blit(img, x, y);
  }).getBufferAsync(Jimp.MIME_PNG);
  return await int.editReply({ files: [output] });
}

/** @param {discord.CommandInteraction} int */
async function avatar(int) {
  const targetImage = await targetImg(int);
  const targetUser = (int.options[int.guild ? "getMember" : "getUser"]('user')) ?? int.user;
  const format = targetImage.includes('.gif') ? 'gif' : 'png';
  const embed = u.embed().setTitle(targetUser.displayName ?? targetUser.username).setImage(`attachment://image.${format}`);
  return int.editReply({ embeds: [embed], files: [{ attachment: targetImage, name: `image.${format}` }] });
}

Module
.addInteractionCommand({ name: "avatar",
  commandId: "970059354415976458",
  process: async (interaction) => {
    const file = interaction.options.getAttachment('file');
    if (file && !interaction.options.getString('filter')) return interaction.reply({ content: "You need to specify a filter to apply if you're uploading a file", ephemeral: true });
    if (file && file.size > 4000000) return interaction.reply({ content: "That file is too big for me to process! It needs to be under 4MB.", ephemeral: true });
    await interaction.deferReply();

    const img = await u.validImage(await targetImg(interaction));
    if (!img && interaction.options.getString('filter')) return interaction.editReply({ content: readError }).then(u.clean);

    switch (interaction.options.getString('filter')) {
    case "amongus": return amongus(interaction, img);
    case "andywarhol": return andywarhol(interaction, img);
    case "colorme": return colorme(interaction, img);
    case "deepfry": return deepfry(interaction, img);
    case "flex": return flex(interaction, img);
    case "metal": return metal(interaction, img);
    case "personal": return personal(interaction, img);
    case "petpet": return petpet(interaction, img);
    case "popart": return popart(interaction, img);
    case "spin": return spin(interaction, img);

    // basic filters
    case "fisheye": return basicFilter(interaction, img, 'fisheye');
    case "invert": return basicFilter(interaction, img, 'invert');
    case "blur": return basicFilter(interaction, img, 'blur', [5]);
    case "rotate": return basicFilter(interaction, img, 'rotate', [Math.floor(Math.random() * 310) + 25]);
    case "flipx": return basicFilter(interaction, img, 'flip', [true, false]);
    case "flipy": return basicFilter(interaction, img, 'flip', [false, true]);
    case "flipxy": return basicFilter(interaction, img, 'flip', [true, true]);
    case "blurple": return basicFilter(interaction, img, 'color', [[{ apply: "desaturate", params: [100] }, { apply: "saturate", params: [47.7] }, { apply: "hue", params: [227] }]]);
    case "grayscale": return basicFilter(interaction, img, 'color', [[{ apply: "desaturate", params: [100] }]]);

    default: return avatar(interaction);
    }
  }
});
Module
.addInteractionCommand({ name: "animal",
  commandId: "1011871239897354292",
  process: async (int) => {
    const randomApiAnimals = ['dog', 'cat', 'panda', 'fox', 'red_panda', 'koala', 'birb', 'raccoon', 'kangaroo', 'whale', 'pikachu'];
    const otherAnimals = ['shiba', 'lizard'];
    const animals = randomApiAnimals.concat(otherAnimals);
    const animal = int.options.getString('animal');
    await int.deferReply();
    if (animals.includes(animal)) {
      let image;
      if (randomApiAnimals.includes(animal)) image = (await axios.get(`https://some-random-api.ml/img/${animal}`))?.data?.link;
      else if (animal == otherAnimals[0]) image = (await axios.get('http://shibe.online/api/shibes')).data[0];
      else if (animal == otherAnimals[1]) image = (await axios.get('https://nekos.life/api/v2/img/lizard')).data.url;
      if (!image) return int.editReply("That's not one of the animals!").then(u.clean);
      int.editReply(image);
    } else if (["luna", "goose", "juan"].includes(animal)) {
      const file = fs.readFileSync(`media/${animal}.txt`, 'utf8');
      int.editReply(u.rand(file.split('\n')));
    }
  }
})
.addCommand({ name: "color",
  category: "Images",
  process: async (msg, args) => {
    let color = args;
    if (args) {
      if (args.startsWith('0x')) color = "#" + args.substr(2);
      if (!["#000000", "black", "#000000FF"].includes(color)) color = Jimp.cssColorToHex(color);
    } else {color = Math.floor(Math.random() * 16777215).toString(16);}1;
    try {
      if (color != 255) {
        const img = new Jimp(256, 256, color);
        return msg.channel.send({ content: `\`#${color}\``, files: [await img.getBufferAsync(Jimp.MIME_PNG)] });
      }
      return msg.reply(`sorry, I couldn't understand the color "${args}"`).then(u.clean);
    } catch (error) {console.log(error);}
  }
})
.addCommand({ name: "crop",
  category: "Images",
  process: async (msg) => {
    const message = msg.channel.messages.cache.filter(m => m.attachments?.size > 0).sort((a, b) => a.createdTimestamp - b.createdTimestamp).last();
    const image = u.validImage(message.attachments.first());
    if (!image) return msg.reply(readError);
    image.autocrop({ cropOnlyFrames: false, cropSymmetric: false, tolerance: 0.01 });
    const output = await image.getBufferAsync(Jimp.MIME_PNG);
    return msg.reply({ files: [output] });
  }
})
// luna, juan, and goose
.addCommand({ name: 'addluna',
  category: 'Images',
  permissions: (msg) => ['281658096130981889', '337713155801350146'].includes(msg.author.id),
  process: async (msg, args) => {
    if (!args && !msg.attachments.first()) return msg.channel.send('No images provided');
    if (msg.attachments.first()) {
      const files = msg.attachments.map(a => a.url);
      fs.appendFileSync('media/luna.txt', `\n${files.join('\n')}`);
      for (const x of files) petPic('luna', x);
    } else {
      fs.appendFileSync('media/luna.txt', `\n${args}`);
      for (const x of args.split('\n')) petPic('luna', x);
    }
    return msg.channel.send('Luna Pic(s) Added 🐱');
  }
})
.addCommand({ name: 'addgoose',
  category: 'Images',
  permissions: (msg) => ['337713155801350146', '602887436300714013'].includes(msg.author.id),
  process: async (msg, args) => {
    if (!args && !msg.attachments.first()) return msg.channel.send('No images provided');
    if (msg.attachments.first()) {
      const files = msg.attachments.map(a => a.url);
      fs.appendFileSync('media/goose.txt', `\n${files.join('\n')}`);
      for (const x of files) petPic('goose', x);
    } else {
      fs.appendFileSync('media/goose.txt', `\n${args}`);
      for (const x of args.split('\n')) petPic('goose', x);
    }
    return msg.channel.send('Goose Pic(s) Added 🦆');
  }
})
.addCommand({ name: 'addjuan',
  category: 'Images',
  permissions: (msg) => ['337713155801350146', '280855048488091660'].includes(msg.author.id),
  process: async (msg, args) => {
    if (!args && !msg.attachments.first()) return msg.channel.send('No images provided');
    if (msg.attachments.first()) {
      const files = msg.attachments.map(a => a.url);
      fs.appendFileSync('media/juan.txt', `\n${files.join('\n')}`);
      for (const x of files) petPic('juan', x);
    } else {
      fs.appendFileSync('media/juan.txt', `\n${args}`);
      for (const x of args.split('\n')) petPic('juan', x);
    }
    return msg.channel.send('Juan Pic(s) Added 🐤');
  }
})
.addCommand({ name: 'initpics',
  onlyOwner: true,
  enabled: false,
  process: async (msg) => {
    const db = u.lowdb('jsons/petpics.json');
    db.defaults({ luna: [], goose: [] }).write();
    db.assign({ luna: fs.readFileSync('media/luna.txt', 'utf-8').split('\n') }).write();
    db.assign({ goose: fs.readFileSync('media/goose.txt', 'utf-8').split('\n') }).write();
    db.assign({ juan: fs.readFileSync('media/juan.txt', 'utf-8').split('\n') }).write();
    return msg.react('👍');
  }
})
.addCommand({ name: 'dailypic',
  category: 'Images',
  onlyOwner: true,
  process: async (msg, args) => {
    console.log(args);
    if (!args) return msg.reply("Which picture do you need?");
    if (!['goose', 'luna', 'juan'].includes(args.toLowerCase())) return msg.reply("either goose, luna, or juan");
    const huddyChannel = msg.client.channels.cache.get('786033226850238525');
    huddyChannel.send(`${args.toLowerCase() == 'goose' ? 'Daily Goose' : args.toLowerCase() == 'luna' ? 'Nightly Luna' : "juan"} Pic\n${petPic(args.toLowerCase())}`);
  }
})
.addEvent('ready', () => {
  const rule = new schedule.RecurrenceRule();
  rule.hour = 10;
  rule.minute = 0;
  const huddyChannel = Module.client.channels.cache.get('786033226850238525');
  const atomicChannel = Module.client.channels.cache.get('897568610531295232');
  schedule.scheduleJob(rule, function() {
    const pic = petPic('goose');
    huddyChannel.send(`Daily Goose Pic\n${pic}`);
    atomicChannel.send(`Daily Goose Pic\n${pic}`);
  });
  const rule2 = new schedule.RecurrenceRule();
  rule2.hour = 22;
  rule2.minute = 0;
  schedule.scheduleJob(rule2, function() {
    const pic = petPic('luna');
    huddyChannel.send(`Nightly Luna Pic\n${pic}`);
    atomicChannel.send(`Nightly Luna Pic\n${pic}`);
  });
  const rule3 = new schedule.RecurrenceRule();
  rule3.hour = 16;
  rule3.minute = 0;
  schedule.scheduleJob(rule3, function() {
    const pic = petPic('juan');
    huddyChannel.send(`Afternoon Juan Pic\n${pic}`);
  });

});

module.exports = Module;