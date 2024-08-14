const fs = require("fs");
const { Client, Intents } = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_INVITES],
});
const config = require("./config.json");
client.login(config.token);
const wait = require("timers/promises").setTimeout;
let result = require("./result.json");
let roles = {};
let lead = {};
let sort = [];

client.on("ready", async () => {
  await wait(1000);
  try {
    client.guilds.cache.forEach(async (guild) => {
      const firstInvites = await guild.invites.fetch();
      firstInvites.forEach((i) => {
        if (!!result.inviters[i.inviter.id]) {
          result.inviters[i.inviter.id].invites[i.code] = i.uses;
        } else {
          let inviter = {
            name: "",
            invites: {},
            invited: [],
          };

          inviter.name = i.inviter.username;
          inviter.invites[i.code] = i.uses;
          result.inviters[i.inviter.id] = inviter;
        }
      });
      fs.writeFileSync("result.json", JSON.stringify(result));
    });
  } catch (error) {
    console.log(error);
  }
  try {
    client.guilds
      .resolve(config.serverId)
      .members.fetch()
      .then((members) => {
        members.forEach((member) => {
          roles[member.user.id] = member["_roles"];
        });
        fs.writeFileSync("Roles.json", JSON.stringify(roles));
      });
  } catch (error) {
    console.log(error);
  }
  setInterval(() => {
    try {
      client.guilds
        .resolve(config.serverId)
        .members.fetch()
        .then((members) => {
          members.forEach((member) => {
            roles[member.user.id] = member["_roles"];
          });
          fs.writeFileSync("Roles.json", JSON.stringify(roles));
        });
    } catch (error) {
      console.log(error);
    }
  }, 30 * 1000);

  await wait(1000);

  try {
    for (const key in result.inviters) {
      let count = 0;
      for (const invited of result.inviters[key].invited) {
        for (const role of roles[invited.id]) {
          if (role == config.verifiedRole) {
            count += 1;
            continue;
          }
        }
      }
      lead[key] = count;
      fs.writeFileSync("lead.json", JSON.stringify(lead));

      var sortable = [];
      for (var user in lead) {
        sortable.push([user, lead[user]]);
      }

      sortable.sort(function (a, b) {
        return a[1] - b[1];
      });
      sortable = sortable.slice(Math.max(sortable.length - 10, 0)).reverse();
      sort = sortable;
    }
  } catch (error) {}

  setInterval(() => {
    try {
      for (const key in result.inviters) {
        let count = 0;
        for (const invited of result.inviters[key].invited) {
          try {
            for (const role of roles[invited.id]) {
              if (role == config.verifiedRole) {
                count += 1;
                continue;
              }
            }
          } catch (error) {}
        }
        lead[key] = count;
        fs.writeFileSync("lead.json", JSON.stringify(lead));

        var sortable = [];
        for (var user in lead) {
          sortable.push([user, lead[user]]);
        }

        sortable.sort(function (a, b) {
          return a[1] - b[1];
        });
        sortable = sortable.slice(Math.max(sortable.length - 10, 0)).reverse();
        sort = sortable;
      }
    } catch (error) {
      console.log(error);
    }
  }, 30 * 1000);
});

client.on("guildMemberAdd", async (member) => {
  try {
    let w = await member.guild.invites.fetch();
    w.forEach((i) => {
      let code = i.code;
      let uses = i.uses;

      for (const m in result.inviters) {
        if (result.inviters[m].invites[code] != undefined && result.inviters[m].invites[code] < uses) {
          result.inviters[m].invites[code] = uses;
          let con = true;
          for (const c of result.inviters[m].invited) {
            if (c.id == member.user.id) {
              con = false;
            }
          }
          if (con) {
            result.inviters[m].invited.push({
              id: member.user.id,
              name: member.user.username,
            });
          }
        }
      }
      fs.writeFileSync("result.json", JSON.stringify(result));
    });
  } catch (error) {
    console.log(error);
    console.log("error add");
  }
});

client.on("guildMemberRemove", (member) => {
  try {
    for (const key in result.inviters) {
      let filterd = [];
      for (const m of result.inviters[key].invited) {
        if (m.id != member.user.id) {
          filterd.push(m);
        }
      }
      result.inviters[key].invited = filterd;
    }

    fs.writeFileSync("result.json", JSON.stringify(result));
  } catch (error) {
    console.log(error);
    console.log("error remove");
  }
});

client.on("inviteCreate", async (invite) => {
  try {
    const firstInvites = await invite.guild.invites.fetch();
    firstInvites.forEach((i) => {
      if (!!result.inviters[i.inviter.id]) {
        result.inviters[i.inviter.id].invites[i.code] = i.uses;
      } else {
        let inviter = {
          name: "",
          invites: {},
          invited: [],
        };

        inviter.name = i.inviter.username;
        inviter.invites[i.code] = i.uses;
        result.inviters[i.inviter.id] = inviter;
      }
    });
    fs.writeFileSync("result.json", JSON.stringify(result));
  } catch (error) {
    console.log(error);
  }
});

client.on("messageCreate", async (message) => {
  try {
    if (message.content.startsWith(config.command1)) {
      let total = 0;
      try {
        console.log(message.author.id);
        if (result.inviters[message.author.id] == undefined) {
          await message.reply({
            content: `${JSON.stringify(message.author.username)}:- \n invite uses: 0, verified members: 0, total members: 0`,
            ephemeral: true,
          });
        } else {
          for (const key in result.inviters[message.author.id].invites) {
            total += result.inviters[message.author.id].invites[key];
          }
          let counter = 0;
          let counter2 = result.inviters[message.author.id].invited.length;
          for (const key2 of result.inviters[message.author.id].invited) {
            let roleCon = false;
            try {
              for (const role of roles[key2.id]) {
                if (role == config.verifiedRole) {
                  roleCon = true;
                }
              }
            } catch (error) {
              total = total - 1;
            }
            if (roleCon) {
              counter += 1;
            }
          }

          await message.reply({
            content: `${JSON.stringify(message.author.username)}:- \n invite uses: ${total}, verified members: ${counter}, total members: ${counter2}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.log(error);
        console.log("BOOOOM");
      }
    } else if (message.content.startsWith(config.command2)) {
      let msg = "Leaderboard:-\n";
      let counter = 1;
      for (const id of sort) {
        msg += counter + ") " + result.inviters[id[0]].name + " : " + id[1] + " members w/role" + "\n";
        counter += 1;
      }

      await message.reply({
        content: msg,
      });
    }
  } catch (error) {
    console.log(error);
  }
});
