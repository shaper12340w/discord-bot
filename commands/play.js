const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const { SlashCommandBuilder } = require('discord.js');
const { parse } = require('iso8601-duration');
const { isUndefined } = require('util');
const { google } = require('googleapis');
require('dotenv').config();

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API,
});

const embed = {
    color: 0x426cf5,

    title: '๐ถ',
    thumbnail: {
        url: '',
    },
    fields: [
        {
            name: '์ฌ์์๊ฐ',
            value: '',
            inline: true,
        },
        {
            name: '์กฐํ์',
            value: '',
            inline: true,
        },
        {
            name: '์ ํ๋ธ',
            value: '',
            inline: true,
        },
    ],
    timestamp: new Date().toISOString(),
    footer: {
        text: '',
        icon_url: '',
    },
};

const value = {};

function addComma(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('๊ณก์ ์ฌ์ํฉ๋๋ค')
        .addStringOption(option =>
            option.setName('์ฐพ๊ธฐ')
                .setDescription('์ฐพ์ ๊ณก ๋ช')
                .setRequired(true)),
    async execute(interaction) {
        const { exec } = require("../index");
        exec(interaction, interaction.options._hoistedOptions[0].value, true);
    },
    async playMusic(msgData, data, option) {
        const { play, getNextResource } = require('../manageQueue');
        const { queue, serverProperty } = require('../index');
        let user;
        if (option) {
            user = msgData.user;
        } else {
            user = msgData.author;
        }
        if (!msgData.member.voice.channel) {
            msgData.reply('์์ฑ์ฑ๋์ ๋จผ์  ์ฐธ๊ฐํด์ฃผ์ธ์!');
            return;
        }
        const id = data;
        console.log(data)
        const getResult = await youtube.videos.list({
            part: 'id,snippet,contentDetails,statistics',
            id: id,
        });
        const result = JSON.parse(JSON.stringify(getResult));
    
        const contentDetails = result.data.items[0].contentDetails;
        const info = result.data.items[0].snippet;
        const duration = parse(contentDetails.duration);
        duration.minutes = String(duration.minutes).length == 1 ? '0' + duration.minutes : duration.minutes;
        duration.seconds = String(duration.seconds).length == 1 ? '0' + duration.seconds : duration.seconds;
        const videoDuration = duration.hours == 0 ? `${duration.minutes}:${duration.seconds}` : `${duration.hours}:${duration.minutes}:${duration.seconds}`;
        const viewCount = addComma(result.data.items[0].statistics.viewCount);
        const url = `https://www.youtube.com/watch?v=${id}`;
        const name = info.title;
    
        embed.title = `๐ถ${info.title}`;
        embed.fields[0].value = videoDuration;
        embed.fields[1].value = `${viewCount}ํ`;
        embed.fields[2].value = `[๋งํฌ](${url})`;
        embed.footer.text = `${msgData.member.displayName} (${user.tag})`
        embed.footer.icon_url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`;
        embed.thumbnail.url = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
        msgData.channel.send({ embeds: [embed] });
    
        // queue
        if (isUndefined(queue[msgData.guild.id])) {
            const connection = joinVoiceChannel({
                channelId: msgData.member.voice.channel.id,
                guildId: msgData.guild.id,
                adapterCreator: msgData.guild.voiceAdapterCreator,
            });
    
            const player = createAudioPlayer();
            player.on('error', error => {
                console.error(`Error: ${error.message}`);
                getNextResource(msgData.guild.id);
            });
            player.on(AudioPlayerStatus.Idle, () => {
                getNextResource(msgData.guild.id);
            });
            player.on(AudioPlayerStatus.Playing, () => {
                queue[msgData.guild.id].resource.volume.setVolume(serverProperty[msgData.guild.id].player.volume / 100);
            });
    
            const subscription = connection.subscribe(player);
            queue[msgData.guild.id] = {
                playIndex: 0,
                playlist: [],
                nowPlaying: {},
                player: player,
                connection: connection
            };
            queue[msgData.guild.id].playlist.push({
                url: url,
                name: name,
                embed: JSON.parse(JSON.stringify(embed)),
    
            });
            play(msgData.guild.id, 0);
            queue[msgData.guild.id].nowPlaying = JSON.parse(JSON.stringify(queue[msgData.guild.id].playlist[0]));
            return true;
        }
    
        queue[msgData.guild.id].playlist.push({
            url: url,
            name: name,
            embed: JSON.parse(JSON.stringify(embed)),
        });
    }
}