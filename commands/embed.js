const Augur = require('augurbot'),
  u = require('../utils/utils'),
  { ChannelType } = require('discord.js'),
  Module = new Augur.Module();

Module.addCommand({ name: 'embed',
  onlyGuild: true,
  memberPermissions: ['MANAGE_WEBHOOKS'],
  category: "Moderation",
  process: async (msg) => {
    const contentFilter = m => m.content;
    const imageFilter = m => m.content || m.attachments.first();
    const time = 5000 * 60;
    const finalEmbed = u.embed();
    const prompt = async () => {
      const promptEmbed = u.embed().setTitle('What would you like to do?')
        .setDescription('Type in one of the following:\nSet Title\nSet Description\nAdd Field\nRemove Field\nSet Footer\nSet Timestamp\nSet Author\nSet Image\nSet Thumbnail\nSet Color\nPreview\nSend\nCancel');
      const options = ['title', 'description', 'add field', 'remove field', 'footer', 'timestamp', 'author', 'image', 'thumbnail', 'color', 'preview', 'send', 'cancel'];
      await msg.author.send({ embeds: [promptEmbed] }).then(async m => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            const content = collected.first().content.toLowerCase();
            if (content.includes(options [0])) await titlePrompt();
            else if (content.includes(options [1])) return await descriptionPrompt();
            else if (content.includes(options [2])) return await addFieldPrompt();
            else if (content.includes(options [3])) return await removeFieldPrompt();
            else if (content.includes(options [4])) return await footerPrompt();
            else if (content.includes(options [5])) return await timestampPrompt();
            else if (content.includes(options [6])) return await authorPrompt();
            else if (content.includes(options [7])) return await imagePrompt();
            else if (content.includes(options [8])) return await thumbnailPrompt();
            else if (content.includes(options [9])) return await colorPrompt();
            else if (content.includes(options [10])) return await previewPrompt();
            else if (content.includes(options [11])) return await sendEmbed();
            else if (content.includes(options [12])) return msg.author.send('Embed Canceled');
          });
      });
    };

    const titlePrompt = async () => {
      const promptEmbed = u.embed().setTitle('What should the title be?').setDescription('Type `none` for none');
      const urlPrompt = async () => {
        promptEmbed.setTitle('What should the title URL be?');
        await msg.author.send({ embeds: [promptEmbed] }).then(async m => {
          const resend = async () => {
            await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                let url = collected.first().content;
                if (url.toLowerCase() == 'none') {
                  url = '';
                } else if (!u.validUrl(url)) {
                  msg.author.send(`That isn't a link! Try again or type \`none\` for none.`);
                  return await resend();
                }
                finalEmbed.setURL(url);
                return await prompt();
              });
          };
          await resend();
        });
      };
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            const content = collected.first().content;
            if (content == 'none') {
              finalEmbed.setTitle("");
              return await prompt();
            }
            finalEmbed.setTitle(content);
            return await urlPrompt();
          });
      });
    };
    const descriptionPrompt = async () => {
      const promptEmbed = u.embed().setTitle('What should the description be?').setDescription('Type `none` for none');
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            let content = collected.first().content;
            if (content == 'none') content = '';
            finalEmbed.setDescription(content);
            return await prompt();
          });
      });
    };
    const addFieldPrompt = async () => {
      const promptEmbed = u.embed().setTitle('What should the field title be?');
      const fieldDesc = async (title) => {
        promptEmbed.setTitle('What should the field content be?');
        msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
          await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              const content = collected.first().content;
              return await inline(title, content);
            });
        });
      };
      const inline = async (title, desc) => {
        let isInline = false;
        promptEmbed.setTitle('Should this be inline?');
        msg.author.send(promptEmbed).then(async bool => {
          const reactions = ['✅', '❌'];
          const filter = (reaction) => reactions.includes(reaction.emoji.name);
          for (const x of reactions) await bool.react(x);
          await bool.awaitReactions({ filter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              const reacted = collected.first().emoji.name;
              if (reacted == '✅') isInline = true;
              finalEmbed.addFields([{ name: title, value: desc, inline: isInline }]);
              return await prompt();
            });
        });
      };
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
                .then(async collected => {
                  const title = collected.first().content;
                  await fieldDesc(title);
                });
      });
    };
    const removeFieldPrompt = async () => {
      const confirmation = async (choice) => {
        const promptEmbed = u.embed().setTitle("Are you sure you want to delete the following field(s)?").addFields(choice);
        const confirmEmbed = u.embed().setTitle("Field(s) deleted");
        const cancelEmbed = u.embed().setTitle("Field(s) were not deleted");
        const confirm = await u.confirmEmbed(msg, promptEmbed, confirmEmbed, cancelEmbed);
        if (confirm == true) {
          for (const x of choice) {
            const index = finalEmbed.fields.findIndex(x);
            finalEmbed.spliceFields(index, 1);
          }
        }
        return await prompt();
      };
      const promptEmbed = u.embed().setTitle("Which field do you want to delete?").setDescription("Please specify the field name. If there are multiple with the same name, all with the name will be deleted.").addFields(finalEmbed.fields);
      msg.author.send({ embeds: [promptEmbed] }).then(async m => {
        const resend = async () => {
          await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              const selected = collected.first().content.toLowerCase();
              const toRemove = finalEmbed.fields.filter(f => f.name.toLowerCase() == selected);
              if (!toRemove) {
                msg.author.send("That's not one of the fields. Please try again");
                await resend();
              } else {
                await confirmation(toRemove);
              }
            });
        };
        await resend();
      });
    };
    const footerPrompt = async () => {
      const promptEmbed = u.embed().setTitle('What should the footer text be?').setDescription('Type `none` for none');
      const icon = async (title) => {
        promptEmbed.setTitle('What should the footer icon be?').setDescription('Type `none` for none. You can use a file or link');
        msg.author.send({ embeds: [promptEmbed] }).then(async m => {
          const resend = async () => {
            await m.channel.awaitMessages({ filter: imageFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                const content = collected.first().content;
                if (content) {
                  if (content == 'none') {
                    finalEmbed.setFooter(title, '');
                    return await prompt();
                  }
                  if (!u.validUrl(content)) {
                    msg.author.send("That's not a valid link!");
                    return await resend();
                  }
                } else if (collected.first().attachments.size > 0) {
                  finalEmbed.setFooter(title, collected.first().attachments.first().url);
                  return await prompt();
                } else {
                  return await resend();
                }
              });
          };
          await resend();
        });
      };
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            const text = collected.first().content;
            if (text == 'none') {
              finalEmbed.setFooter('', '');
              return await prompt();
            }
            return await icon(text);
          });
      });
    };
    const timestampPrompt = async () => {
      const promptEmbed = u.embed().setTitle('What should the timestamp be?').setDescription('Examples:\n`now`\n`December 17, 1995 03:24:00`\n1995-12-17T03:24:00`\n1995, 11, 17`\n`1995, 11, 17, 3, 24, 0`\nType `none` for none');
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            let content = new Date(collected.first().content);
            if (collected.first().content.toLowerCase() == 'none') content = '';
            if (collected.first().content.toLowerCase() == 'now') content = new Date();
            finalEmbed.setTimestamp(content);
            await prompt();
          });
      });
    };
    const authorPrompt = async () => {
      const authorIcon = async (name) => {
        promptEmbed.setTitle("What should the author icon be?").setDescription("Type `none` for none. You can use a link or a file.");
        msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
          const resend = async () => {
            await m.channel.awaitMessages({ filter: imageFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                let icon = collected.first().content;
                if (icon?.toLowerCase() == 'none') {
                  icon = '';
                } else if (collected.first().attachments.first()) {
                  icon = collected.first().attachments.first().url;
                } else if (!u.validUrl(icon)) {
                  msg.author.send("That's not a valid image URL");
                  return await resend();
                }
                return await authorUrl(name, icon);
              });
          };
          await resend();
        });
      };
      const authorUrl = async (name, icon,) => {
        promptEmbed.setTitle("What should the author URL be?");
        msg.author.send({ embeds: [promptEmbed] }).then(async m => {
          const resend = async () => {
            m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
              .then(async collected => {
                let url = collected.first().content;
                if (url.toLowerCase() == 'none') {
                  url = '';
                } else if (!u.validUrl(url)) {
                  msg.author.send("That's not a valid link.");
                  return await resend(msg, finalEmbed, name, icon, promptEmbed);
                }
                finalEmbed.setAuthor({ name, iconURL: url });
                return await prompt();
              });
          };
          await resend();
        });
      };
      const promptEmbed = u.embed().setTitle('What should the author name be?').setDescription('Type `none` for none');
      msg.author.send(promptEmbed).then(async m => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            const name = collected.first().content;
            if (name == 'none') {
              finalEmbed.setAuthor(null);
              return await prompt();
            }
            return await authorIcon(name);
          });
      });
    };
    const imagePrompt = async () => {
      const promptEmbed = u.embed().setTitle('What do you want to set as the image?').setDescription('Type `none` for none');
      msg.author.send({ embeds: [promptEmbed] }).then(async m => {
        const resend = async () => {
          await m.channel.awaitMessages({ filter: imageFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              let image = collected.first().content;
              if (image.toLowerCase() == 'none') {
                image = "";
              } else if (collected.first().attachments.first()) {
                image = collected.first().attachments.first().url;
              } else if (!u.validUrl(image)) {
                msg.author.send("That's not a valid image!");
                return await resend();
              } else {
                finalEmbed.setImage(image);
                return await prompt();
              }
            });
        };
        await resend();
      });
    };
    const thumbnailPrompt = async () => {
      const promptEmbed = u.embed().setTitle('What do you want to set as the thumbail?').setDescription('Type `none` for none');
      msg.author.send({ embeds: [promptEmbed] }).then(async m => {
        const resend = async () => {
          await m.channel.awaitMessages({ filter: imageFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              let icon = collected.first().content;
              if (icon.toLowerCase() == 'none') {
                icon = "";
              } else if (collected.first().attachments.first()) {
                icon = collected.first().attachments.first().url;
              } else if (!u.validUrl(icon)) {
                msg.author.send("That's not a valid image!");
                return await resend();
              }
              finalEmbed.setThumbnail(icon);
              return await prompt();
            });
        };
        await resend();
      });
    };
    const colorPrompt = async () => {
      const promptEmbed = u.embed().setTitle('What color do you want the embed to be?').setDescription('Type `none` for default');
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
          .then(async collected => {
            let content = collected.first().content;
            if (content == 'none') content = '';
            finalEmbed.setColor(content);
            return await prompt();
          });
      });
    };
    const previewPrompt = async () => {
      msg.author.send({ embeds: [finalEmbed] });
      setTimeout(async () => {
        return await prompt();
      }, 5000);
    };
    const sendEmbed = async () => {
      const promptEmbed = u.embed().setTitle('What channel do you want me to send the embed to?').setDescription('Type the ID or name');
      msg.author.send({ embeds: [promptEmbed] }).then(async (m) => {
        const resend = async () => {
          await m.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] })
            .then(async collected => {
              const content = collected.first().content;
              let channel = msg.guild.channels.cache.filter(b => b.type == ChannelType.GuildText).find(c => c.name.toLowerCase() == content.toLowerCase().replace(/ /g, '-').replace(/#/g, '') || c.id == content);
              if (!channel) {
                msg.author.send("I couldn't find that channel. Try again.");
                return await resend();
              } else if (channel.length > 1) {
                promptEmbed.setTitle('Looks like there are multiple channels with that name. Which one do you want to send it in?').setDescription(`Each of the following is a number representing the order of the channel. Please select the correct one\n${channel.rawPosition.join('\n')} `);
                msg.author.send({ embeds: [promptEmbed] }).then(async ms => {
                  const resend2 = async () => {
                    const coll = await ms.channel.awaitMessages({ filter: contentFilter, max: 1, time, errors: ['time'] });
                    const cont = coll.first().content;
                    channel = msg.guild.channels.cache.filter(b => b.type == ChannelType.GuildText).find(c => c.rawPosition == cont.replace(/^[0-9]/g));
                    if (!channel) {
                      msg.author.send("That's not one of the channels. Please try again.");
                      return await resend2();
                    }
                  };
                  return await resend2();
                });
              }
              try {
                channel.send({ embeds: [finalEmbed] });
              } catch {
                msg.author.send(`I couldn't send a message in that channel. Please change my permissions for that channel or select a different channel.`);
                return await resend();
              }
            });
        };
        return await resend();
      });
    };
    u.clear(msg, 0);
    return await prompt();
  }
});
module.exports = Module;