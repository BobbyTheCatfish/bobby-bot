const Augur = require('augurbot'),
  u = require('../utils/utils'),
  Module = new Augur.Module();


Module.addInteractionCommand({ name: "embed",
  commandId: "1012172896455630911",
  process: async (int) => {
    const channel = int.options.getChannel('channel');
    const title = int.options.getString('title');
    const url = int.options.getString('title-url');
    const description = int.options.getString('description');
    const author = int.options.getMember('author');
    const authorName = int.options.getString('author-name');
    const authorImage = int.options.getAttachment('author-image');
    const color = int.options.getString('color');
    const footerText = int.options.getString('footer-text');
    const footerImage = int.options.getAttachment('footer-image');
    const image = int.options.getAttachment('image');
    const thumbnail = int.options.getAttachment('thumbnail');

    if (!channel.isTextBased()) return int.reply({ content: "I need a text based channel to send the embed in.", ephemeral: true });
    if (int.options.data.length == 1) return channel.send({ embeds: [u.embed()] });
    if (url && !title) return int.reply({ content: "I need a title if you're going to set a url." });
    if (!authorName && authorImage) return int.reply({ content: "I need an author name if you're using an image.", ephemeral: true });
    if (footerImage && !footerText) return int.reply({ content: "I need footer text if you're using an image" });

    const embed = u.embed({ author: author ?? { name: authorName, iconURL: authorImage?.url } })
      .setTitle(title)
      .setURL(url)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: footerText, iconURL: footerImage?.url })
      .setImage(image?.url)
      .setThumbnail(thumbnail?.url);

    let buttons = u.actionRow().addComponents([
      u.button().setCustomId(`${int.id}bC`).setLabel("Confirm").setStyle(3),
      u.button().setCustomId(`${int.id}bD`).setLabel("Cancel").setStyle(4),
      u.button().setCustomId(`${int.id}bF`).setLabel("Add Field").setStyle(2)
    ]);

    async function awaitConfirm(content) {
      await int[int.replied ? 'editReply' : 'reply']({ content, embeds: [embed], ephemeral: true, components: [buttons] });
      const filter = (interaction) => interaction.customId.startsWith(`${int.id}b`);
      return await int.channel.awaitMessageComponent({ filter, componentType: 2, time: 300_000 }).catch(() => u.noop());
    }
    async function loop(c) {
      const confirm = await awaitConfirm(c);
      if (confirm?.customId == `${int.id}bF`) {
        const modal = u.modal().addComponents([
          u.actionRow().addComponents(u.textInput().setCustomId('title').setLabel("Field Title").setStyle(1)),
          u.actionRow().addComponents(u.textInput().setCustomId('value').setLabel("Field Value").setStyle(2))
        ]).setCustomId(`modal`).setTitle("Add Field");
        await confirm.showModal(modal);
        const modalSubmit = await confirm.awaitModalSubmit({ filter: (inte) => inte.customId == `modal`, time: 300_000 }).catch(u.noop);
        if (modalSubmit) {
          const name = modalSubmit.fields.getField('title').value;
          const value = modalSubmit.fields.getField('value').value;
          embed.addFields({ name, value });
          await modalSubmit.deferReply();
          await modalSubmit.deleteReply();
        }
        if (embed.data.fields?.lenth >= 20) {
          buttons = buttons.components.filter(co => co.data.label != 'Add Field');
          return await loop("You've reached the limit of embed fields you can add.");
        }
        return await loop();
      }
      if (confirm?.customId == `${int.id}bC`) {
        confirm.reply({ components: [], embeds: [u.embed().setTitle("Posting...")], ephemeral: true });
        return channel.send({ embeds: [embed] });
      } else {
        confirm.reply({ embeds: [u.embed().setTitle("Canceled")], ephemeral: true });
      }
    }
    return loop();
  }
});
module.exports = Module;