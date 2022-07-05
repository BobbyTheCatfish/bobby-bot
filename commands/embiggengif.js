const Augur = require('augurbot'),
  u = require('../utils/utils'),
  Jimp = require('jimp'),
  twemoji = require('@discordapp/twemoji'),
  { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap'),
  axios = require('axios'),
  Module = new Augur.Module();
Module.addCommand({
  name: 'embiggentest',
  process: async (msg, args) => {
    if (args == 'testing') args = `<a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090>\n<a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090>\n<a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090> <a:rainbowcat:792892732728279090>`;
    function getUnicode(emoji) {
      const parse = JSON.stringify(twemoji.parse(emoji));
      console.log(parse);
      return parse?.match(/https:\/\/twemoji\.maxcdn\.com\/v\/.*.png/)?.[0];
    }
    async function gifRead(link) {
      const response = await axios.get(link, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, "utf-8");
      return await GifUtil.read(buffer);
    }
    /**
     * @param {[]} emojis
     * @param {Jimp} canvas
     * @param {number} giflength
     */
    async function animatedEmojis(emojis, canvas, giflength, delay) {
      let newCanvas = canvas.clone();
      let f = 0;
      const frameArray = [];
      const loops = new Array(emojis.length);
      do {
        let i = 0;
        do {
          console.log(f);
          const emoji = emojis[i];
          const read = await gifRead(u.getEmoji(emoji.item).link);
          const tempF = f - ((loops[i] || 0) * (read.frames.length - 1));
          const frame = read.frames[tempF];
          const jimped = await Jimp.read(frame.bitmap);
          jimped.getHeight() > jimped.getWidth() ? jimped.resize(Jimp.AUTO, 150) : jimped.resize(150, Jimp.AUTO);
          newCanvas.blit(jimped, emoji.x, emoji.y).posterize(200);
          if (tempF == ((read.frames.length - 1))) loops[i] = loops[i] + 1 || 1;
          i++;
        } while (i < emojis.length);
        const newFrame = new GifFrame(new BitmapImage(newCanvas.bitmap), { delayCentisecs: delay });
        frameArray.push(newFrame);
        newCanvas = canvas.clone();
        f++;
      } while (f < giflength);
      GifUtil.quantizeSorokin(frameArray);
      const result = await GifCodec.prototype.encodeGif(frameArray);
      return result;
    }
    if (!args) return msg.reply("You need to supply emojis!");
    const rows = args.split('\n').map(j => j.split(' ').filter(a => a != '' && a != ' '));
    console.log(rows);
    const cols = rows.sort((a, b) => b.length - a.length)[0].length;
    if (rows.length == 1 && cols == 1) {
      const discordLink = u.getEmoji(args)?.link;
      const link = getUnicode(args) ?? discordLink;
      if (link) return msg.reply(link);
      else return msg.reply("I need a valid emoji!");
    }
    if (rows.length > 5 || cols > 5) return msg.channel.send("That's too many emojis! You're limited to a 5x5 grid.");

    if (args.replace(/[[\] ]/g, '')?.length < 1) return msg.channel.send(`You need to supply emojis!`);
    const canvas = new Jimp(150 * cols, 150 * rows.length, 0x00000000);
    let gifLength = 0;
    let i = 0;
    do {
      const y = rows.flat()[i];
      const emoji = u.getEmoji(y);
      if (emoji?.animated) {
        const read = await gifRead(emoji.link);
        if (read.frames.length > gifLength) {
          gifLength = read.frames.length;
        }
      }
      i++;
    } while (i < rows.flat().length);
    i = 0;
    const animated = [];
    const speeds = [];
    do {
      let i2 = 0;
      const row = rows[i];
      do {
        const item = row[i2];
        let id = u.getEmoji(item)?.id;
        let image;
        if (item == '[]') {
          i2++;
          continue;
        } else if (id) {
          if (u.getEmoji(item).animated) {
            const read = await gifRead(u.getEmoji(item).link);
            speeds.push(Math.round(read.frames.map(a => a.delayCentisecs).reduce((a, b) => a + b) / read.frames.length));
            animated.push({ item, x: 150 * i2, y: 150 * i });
            i2++;
            continue;
          } else {
            image = await u.validImage(`https://cdn.discordapp.com/emojis/${id}.png`);
          }
        } else if (id = getUnicode(item)) {
          image = await u.validImage(id);
        }
        if (!image) {
          console.log(i, item);
          return msg.reply(`I couldn't enlarge ${item}`);
        }
        image.getHeight() > image.getWidth() ? image.resize(Jimp.AUTO, 150) : image.resize(150, Jimp.AUTO);
        canvas.blit(image, 150 * i2, 150 * i);
        i2++;
      } while (i2 < row.length);
      i++;
    } while (i < rows.length);
    if (animated.length > 0) {
      const animate = await animatedEmojis(animated, canvas, gifLength, Math.round(speeds.reduce((a, b) => a + b) / speeds.length));
      return await msg.reply({ files: [{ attachment: animate.buffer, name: 'output.gif' }] });
    }
    return await msg.reply({ files: [await canvas.getBufferAsync(animated.length > 0 ? Jimp.MIME_GIF : Jimp.MIME_PNG)] });
  }
});
module.exports = Module;