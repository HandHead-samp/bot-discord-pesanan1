const Discord = require("discord.js");
const { Client, Util } = require("discord.js");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
const dotenv = require("dotenv").config();
require("./server.js");

const TOKEN = process.env.BOT_TOKEN;
const PREFIX = process.env.PREFIX;
const GOOGLE_API_KEY = process.env.YTAPI_KEY;

const bot = new Client({
    disableMentions: "all"
});

const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();

bot.on("warn", console.warn);
bot.on("error", console.error);
bot.on("ready", () => console.log(`${bot.user.tag} has been successfully turned on!`));
bot.on("shardDisconnect", (event, id) => console.log(`Shard ${id} disconnected (${event.code}) ${event}, trying to reconnect!`));
bot.on("shardReconnecting", (id) => console.log(`Shard ${id} reconnecting...`));

bot.on("message", async (msg) => { // eslint-disable-line
    if (msg.author.bot) return;
    if (!msg.content.startsWith(PREFIX)) return;

    const args = msg.content.split(" ");
    const searchString = args.slice(1).join(" ");
    const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
    const serverQueue = queue.get(msg.guild.id);

    let command = msg.content.toLowerCase().split(" ")[0];
    command = command.slice(PREFIX.length);

    if (command === "help" || command == "cmd") {
        const helpembed = new Discord.MessageEmbed()
            .setColor("RANDOM")
            .setAuthor(bot.user.tag, bot.user.displayAvatarURL())
            .setDescription(`
__**-----List Command-----**__
> \`w!play\` > **\`play [title/url]\`**
> \`w!search\` > **\`search [title]\`**
> \`w!skip\`, \`w!stop\`,  \`w!pause\`, \`w!resume\`
> \`w!nowplaying\`, \`w!queue\`, \`w!volume\``)
            .addField(`-----INVITE LINK-----`,`[\`Copy Disini\`](https://discord.com/invite/NqTanBg)`)
        .setThumbnail(bot.user.avatarURL)
        .setFooter("©️ 2020 West Java Development", "https://cdn.discordapp.com/attachments/703727968509493302/730535106628026458/WEST_JAVA_ROLEPLAY_20200708_173614.jpg");
        msg.channel.send(helpembed);
    }
    if (command === "play" || command === "p") {
        const voiceChannel = msg.member.voice.channel;
        if (!voiceChannel) return msg.channel.send("I'm sorry but you need to be in a voice channel to play a music!");
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if (!permissions.has("CONNECT")) {
            return msg.channel.send("Sorry, but I need **`CONNECT`** permissions to proceed!");
        }
        if (!permissions.has("SPEAK")) {
            return msg.channel.send("Sorry, but I need **`SPEAK`** permissions to proceed!");
        }
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return msg.channel.send(`<:yes:591629527571234819>  **|**  Playlist: **\`${playlist.title}\`** has been added to the queue!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    var video = await youtube.getVideoByID(videos[0].id);
                    if (!video) return msg.channel.send("🆘  **|**  I could not obtain any search results.");
                } catch (err) {
                    console.error(err);
                    return msg.channel.send("🆘  **|**  I could not obtain any search results.");
                }
            }
            return handleVideo(video, msg, voiceChannel);
        }
    }
    if (command === "search" || command === "sc") {
        const voiceChannel = msg.member.voice.channel;
        if (!voiceChannel) return msg.channel.send("I'm sorry but you need to be in a voice channel to play a music!");
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if (!permissions.has("CONNECT")) {
            return msg.channel.send("Sorry, but I need **`CONNECT`** permissions to proceed!");
        }
        if (!permissions.has("SPEAK")) {
            return msg.channel.send("Sorry, but I need **`SPEAK`** permissions to proceed!");
        }
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return msg.channel.send(`<:yes:591629527571234819>  **|**  Playlist: **\`${playlist.title}\`** has been added to the queue!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    msg.channel.send(`
__**Song selection**__

${videos.map(video2 => `**\`${++index}\`  |**  ${video2.title}`).join("\n")}

Please provide a value to select one of the search results ranging from 1-10.
					`);
                    // eslint-disable-next-line max-depth
                    try {
                        var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                            max: 1,
                            time: 10000,
                            errors: ["time"]
                        });
                    } catch (err) {
                        console.error(err);
                        return msg.channel.send("No or invalid value entered, cancelling video selection...");
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return msg.channel.send("🆘  **|**  I could not obtain any search results.");
                }
            }
            return handleVideo(video, msg, voiceChannel);
        }

    } else if (command === "skip") {
        if (!msg.member.voice.channel) return msg.channel.send("I'm sorry but you need to be in a voice channel to play a music!");
        if (!serverQueue) return msg.channel.send("There is nothing playing that I could **\`skip\`** for you.");
        serverQueue.connection.dispatcher.end("Skip command has been used!");
        return msg.channel.send("⏭️  **|**  Skip command has been used!");

    } else if (command === "stop") {
        if (!msg.member.voice.channel) return msg.channel.send("I'm sorry but you need to be in a voice channel to play music!");
        if (!serverQueue) return msg.channel.send("There is nothing playing that I could **\`stop\`** for you.");
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end("Stop command has been used!");
        return msg.channel.send("⏹️  **|**  Stop command has been used!");

    } else if (command === "volume" || command === "vol") {
        if (!msg.member.voice.channel) return msg.channel.send("I'm sorry but you need to be in a voice channel to play music!");
        if (!serverQueue) return msg.channel.send("There is nothing playing.");
        if (!args[1]) return msg.channel.send(`The current volume is: **\`${serverQueue.volume}%\`**`);
        if (isNaN(args[1]) || args[1] > 100) return msg.channel.send("Volume only can be set in range **1** - **100**.");
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolume(args[1] / 100);
        return msg.channel.send(`I set the volume to: **\`${args[1]}%\`**`);

    } else if (command === "nowplaying" || command === "np") {
        if (!serverQueue) return msg.channel.send("There is nothing playing.");
        return msg.channel.send(`🎶  **|**  Now Playing: **\`${serverQueue.songs[0].title}\`**`);

    } else if (command === "queue" || command === "q") {
        if (!serverQueue) return msg.channel.send("There is nothing playing.");
        return msg.channel.send(`
__**Song Queue**__

${serverQueue.songs.map(song => `**-** ${song.title}`).join("\n")}

**Now Playing: \`${serverQueue.songs[0].title}\`**
        `);

    } else if (command === "pause") {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return msg.channel.send("⏸  **|**  Paused the music for you!");
        }
        return msg.channel.send("There is nothing playing.");

    } else if (command === "resume") {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return msg.channel.send("▶  **|**  Resumed the music for you!");
        }
        return msg.channel.send("There is nothing playing.");
    } else if (command === "loop") {
        if (serverQueue) {
            serverQueue.loop = !serverQueue.loop;
            return msg.channel.send(`:repeat: **|** Loop ${serverQueue.loop === true ? "enabled" : "disabled"}!`);
        };
        return msg.channel.send("There is nothing playing.");
    }
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
    const serverQueue = queue.get(msg.guild.id);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 100,
            playing: true,
            loop: false
        };
        queue.set(msg.guild.id, queueConstruct);

        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(msg.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`I could not join the voice channel: ${error}`);
            queue.delete(msg.guild.id);
            return msg.channel.send(`I could not join the voice channel: **\`${error}\`**`);
        }
    } else {
        serverQueue.songs.push(song);
        if (playlist) return;
        else return msg.channel.send(`<:yes:591629527571234819>  **|** **\`${song.title}\`** sudah di tambahkan ke antrian!`);
    }
    return;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        return queue.delete(guild.id);
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url))
        .on("finish", () => {
            const shiffed = serverQueue.songs.shift();
            if (serverQueue.loop === true) {
                serverQueue.songs.push(shiffed);
            };
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolume(serverQueue.volume / 100);

    serverQueue.textChannel.send({
        embed: {
            color: "RANDOM",
            description: `🎶  **|**  Memutar Lagu: **\`${song.title}\`**`
        }
    });
}

const discord = require("discord.js");

module.exports = {
  name: "ban",
  category: "moderation",
  description: "Ban anyone with one shot whithout knowing anyone xD",
  usage: "ban <@user> <reason>",
  run: async (client, message, args) => {
    
    if(!message.member.hasPermission("BAN_MEMBERS")) {
      return message.channel.send(`**${message.author.username}**, You do not have perms to ban someone`)
    }
    
    if(!message.guild.me.hasPermission("BAN_MEMBERS")) {
      return message.channel.send(`**${message.author.username}**, I am do not have perms to ban someone`)
    }
    
    const target = message.mentions.members.first();
    
    if(!target) {
      return message.channel.send(`**${message.author.username}**, Please mention the person who you want to ban.`)
    }
    
    if(target.id === message.author.id) {
      return message.channel.send(`**${message.author.username}**, You can not ban yourself!`)
    }
    
   
    
   if(!args[1]) {
     return message.channel.send(`**${message.author.username}**, Please Give Reason To ban Member`)
   }
    
    let embed = new discord.MessageEmbed()
    .setTitle("Action : Ban")
    .setDescription(`Banned ${target} (${target.id})`)
    .setColor("#ff2050")
    .setThumbnail(target.avatarURL)
    .setFooter(`Banned by ${message.author.tag}`);
    
    message.channel.send(embed)
    target.ban(args[1])
    
    
    
  }
}





bot.on('ready', () => {
bot.user.setActivity("West Java Reality Project");
console.log('Bot Is Ready');
}); 
 
bot.on('message', async message => {
if (message.content === 'Hai') {
message.reply('Halo Saya Bot Discord Ini :)');
   
}
  
if (message.content === 'Jual duit ic murah' || message.content =='jual duir ic murah' || message.content =='Jual uang ic murah' || message.content =='jual uang ic murah') {  
    message.reply('ADA YANG RTM NIH @everyone ');
}
  
if (message.content === "Donate dimana ya?" || message.content == 'donate dimana ya?') {
    message.reply("ingin donate ke server? silahkan hubungi admin yang on!");
   
}

if (message.content ==="Server on?" || message.content == "server on?") {
    message.reply("Server on kok :)");
  
}
  
if (message.content ==="Kontol" || message.content== "kontol") {
    message.reply("Omongan di jaga bang jago");
}
 
if (message.content ==="Anjing" || message.content == "anjing" || message.content == "Ajg" || message.content == "ajg" || message.content =="Anjg" || message.content =="anjg") {
    message.reply(" widih jagoan ya mulutnya gadi jaga")
}
  
if (message.content ==="Help" || message.content =="help" || message.content == "Help!" || message.content == "help!") { 
    message.reply("Wah kalo butuh bantuan pm admin om")
  
}
});
                     
bot.login('NzMwMzcwMzk5MjU4NTQyMTMx.XwWhxA.nDbOvMnI94YU0gJiz94_Nrjkcic');







bot.login(TOKEN);
