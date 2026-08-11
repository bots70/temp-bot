const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const http = require('http');

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Temped Bot is running successfully');
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildVoiceStates
    ]
});

const TARGET_VOICE_CHANNEL = "1536689417136119888";
const TARGET_CATEGORY = "1535491760627646524";
const BUTTON_TARGET_CHANNEL = "1536693109662949406";

const tempRooms = new Map();

client.once('ready', async () => {
    console.log(`Temped Bot logged in as ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(BUTTON_TARGET_CHANNEL);
        if (channel && channel.isTextBased()) {
            const messages = await channel.messages.fetch({ limit: 10 });
            for (const msg of messages.values()) {
                await msg.delete().catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setTitle('Temp Control')
                .setDescription('للتحكم بالروم الضغط على الازرار')
                .setColor('#2b2d31');

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_transfer').setLabel('نقل الملكية').setStyle(ButtonStyle.Secondary).setEmoji('🫅'),
                new ButtonBuilder().setCustomId('temp_rename').setLabel('تغيير الاسم').setStyle(ButtonStyle.Secondary).setEmoji('👤')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_limit').setLabel('حد الروم').setStyle(ButtonStyle.Secondary).setEmoji('⏳')
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_lock').setLabel('قفل الروم').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('temp_unlock').setLabel('فتح الروم').setStyle(ButtonStyle.Secondary).setEmoji('🔓')
            );

            const row4 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_hide').setLabel('اخفاء الروم').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
            );

            const row5 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_show').setLabel('اظهار الروم').setStyle(ButtonStyle.Secondary).setEmoji('👁️‍🗨️'),
                new ButtonBuilder().setCustomId('temp_ban').setLabel('منع').setStyle(ButtonStyle.Secondary).setEmoji('👤')
            );

            const row6 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_unban').setLabel('السماح').setStyle(ButtonStyle.Secondary).setEmoji('👤')
            );

            const row7 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_kick').setLabel('طرد عضو').setStyle(ButtonStyle.Secondary).setEmoji('🏌️'),
                new ButtonBuilder().setCustomId('temp_mute').setLabel('ميوت').setStyle(ButtonStyle.Secondary).setEmoji('🎤')
            );

            const row8 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('temp_unmute').setLabel('فك ميوت').setStyle(ButtonStyle.Secondary).setEmoji('🎙️')
            );

            await channel.send({ 
                embeds: [embed], 
                components: [row1, row2, row3, row4, row5, row6, row7, row8] 
            });
        }
    } catch (e) {
        console.error("Error sending control panel on ready:", e);
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    if (!member) return;

    if (newState.channelId === TARGET_VOICE_CHANNEL) {
        try {
            const guild = newState.guild;
            const channelName = `chaneel ${member.user.username}`;

            const vChan = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: TARGET_CATEGORY || null,
                permissionOverwrites: [
                    { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
                    { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers] }
                ]
            });

            tempRooms.set(vChan.id, {
                ownerId: member.id,
                banned: [],
                userLimit: 0
            });

            await member.voice.setChannel(vChan).catch(() => {});
        } catch (e) {
            console.error("Error creating voice channel:", e);
        }
    }

    if (newState.channelId && tempRooms.has(newState.channelId)) {
        const roomData = tempRooms.get(newState.channelId);
        const channel = newState.channel;

        if (roomData.banned.includes(member.id)) {
            await member.voice.setChannel(null).catch(() => {});
            return;
        }

        if (roomData.userLimit > 0 && channel.members.size > roomData.userLimit) {
            if (member.id !== roomData.ownerId) {
                await member.voice.setChannel(null).catch(() => {});
            }
        }
    }

    if (oldState.channelId && tempRooms.has(oldState.channelId)) {
        const oldChannel = oldState.channel;
        if (oldChannel && oldChannel.members.size === 0) {
            tempRooms.delete(oldState.channelId);
            await oldChannel.delete().catch(() => {});
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    let currentRoomId = voiceChannel ? voiceChannel.id : null;
    let roomData = currentRoomId ? tempRooms.get(currentRoomId) : null;

    if (interaction.isButton()) {
        const id = interaction.customId;

        if (!voiceChannel || !roomData || roomData.ownerId !== member.id) {
            return interaction.reply({ content: 'انت مو بروم...', ephemeral: true });
        }

        if (id === 'temp_rename') {
            const modal = new ModalBuilder()
                .setCustomId('modal_rename')
                .setTitle('Group Settings');

            const input = new TextInputBuilder()
                .setCustomId('input_rename')
                .setLabel('الاسم الجديد')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('اسم الروم')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (id === 'temp_limit') {
            const modal = new ModalBuilder()
                .setCustomId('modal_limit')
                .setTitle('Group Settings');

            const input = new TextInputBuilder()
                .setCustomId('input_limit')
                .setLabel('حد الروم')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('7 أو 8 أو 9')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (id === 'temp_transfer') {
            await interaction.reply({ content: 'يرجى ارفاق منشن الشخص الان . . .', ephemeral: true });
            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

            collector.on('collect', async (m) => {
                await m.delete().catch(() => {});
                const targetMember = m.mentions.members.first();
                if (!targetMember || !voiceChannel.members.has(targetMember.id)) {
                    return;
                }

                roomData.ownerId = targetMember.id;
                await voiceChannel.permissionOverwrites.edit(targetMember.id, { ManageChannels: true, MuteMembers: true, DeafenMembers: true, MoveMembers: true }).catch(() => {});
                await voiceChannel.permissionOverwrites.edit(member.id, { ManageChannels: false, MuteMembers: false, DeafenMembers: false, MoveMembers: false }).catch(() => {});

                return interaction.followUp({ content: 'تم نقل الملكية . . .', ephemeral: true });
            });
            return;
        }

        if (id === 'temp_lock') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false }).catch(() => {});
            return interaction.reply({ content: 'تم قفل الروم . . .', ephemeral: true });
        }

        if (id === 'temp_unlock') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: null }).catch(() => {});
            return interaction.reply({ content: 'تم فتح الروم . . .', ephemeral: true });
        }

        if (id === 'temp_hide') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false }).catch(() => {});
            return interaction.reply({ content: 'تم اخفاء الروم . . .', ephemeral: true });
        }

        if (id === 'temp_show') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null }).catch(() => {});
            return interaction.reply({ content: 'تم اظهار الروم . . .', ephemeral: true });
        }

        if (id === 'temp_ban') {
            await interaction.reply({ content: 'يرجى ارفاق منشن الشخص الذي تريد منعه . . .', ephemeral: true });
            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

            collector.on('collect', async (m) => {
                await m.delete().catch(() => {});
                const targetMember = m.mentions.members.first() || interaction.guild.members.cache.get(m.content.replace(/[^0-9]/g, ''));
                if (!targetMember) return;

                if (!roomData.banned.includes(targetMember.id)) {
                    roomData.banned.push(targetMember.id);
                }
                if (voiceChannel.members.has(targetMember.id)) {
                    await targetMember.voice.setChannel(null).catch(() => {});
                }
                await voiceChannel.permissionOverwrites.edit(targetMember.id, { Connect: false }).catch(() => {});
                return interaction.followUp({ content: 'تم منع العضو . . .', ephemeral: true });
            });
            return;
        }

        if (id === 'temp_unban') {
            await interaction.reply({ content: 'يرجى ارفاق منشن الشخص الذي تريد فك عنه المنع . . .', ephemeral: true });
            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

            collector.on('collect', async (m) => {
                await m.delete().catch(() => {});
                const targetMember = m.mentions.members.first() || interaction.guild.members.cache.get(m.content.replace(/[^0-9]/g, ''));
                if (!targetMember) return;

                if (roomData.banned.includes(targetMember.id)) {
                    roomData.banned = roomData.banned.filter(id => id !== targetMember.id);
                    await voiceChannel.permissionOverwrites.delete(targetMember.id).catch(() => {});
                    return interaction.followUp({ content: 'تم فك المنع عن العضو . . .', ephemeral: true });
                } else {
                    return interaction.followUp({ content: 'هذا الشخص غير محروم . . .', ephemeral: true });
                }
            });
            return;
        }

        if (id === 'temp_kick') {
            await interaction.reply({ content: 'يرجى ارفاق منشن الشخص الذي تريد طرده . . .', ephemeral: true });
            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

            collector.on('collect', async (m) => {
                await m.delete().catch(() => {});
                const targetMember = m.mentions.members.first();
                if (targetMember && voiceChannel.members.has(targetMember.id)) {
                    await targetMember.voice.setChannel(null).catch(() => {});
                }
                return interaction.followUp({ content: 'تم الطرد . . .', ephemeral: true });
            });
            return;
        }

        if (id === 'temp_mute') {
            await interaction.reply({ content: 'يرجى ارفاق منشن الشخص الذي تريد اعطاءه ميوت . . .', ephemeral: true });
            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

            collector.on('collect', async (m) => {
                await m.delete().catch(() => {});
                const targetMember = m.mentions.members.first();
                if (targetMember && voiceChannel.members.has(targetMember.id)) {
                    await targetMember.voice.setMute(true).catch(() => {});
                }
                return interaction.followUp({ content: 'تم إعطاء الميوت . . .', ephemeral: true });
            });
            return;
        }

        if (id === 'temp_unmute') {
            await interaction.reply({ content: 'يرجى ارفاق منشن الشخص الذي تريد فك الميوت عنه . . .', ephemeral: true });
            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

            collector.on('collect', async (m) => {
                await m.delete().catch(() => {});
                const targetMember = m.mentions.members.first();
                if (targetMember) {
                    await targetMember.voice.setMute(false).catch(() => {});
                }
                return interaction.followUp({ content: 'تم فك الميوت . . .', ephemeral: true });
            });
            return;
        }
    }

    if (interaction.isModalSubmit()) {
        if (!voiceChannel || !roomData || roomData.ownerId !== member.id) {
            return interaction.reply({ content: 'انت مو بروم...', ephemeral: true });
        }

        if (interaction.customId === 'modal_rename') {
            const newName = interaction.fields.getTextInputValue('input_rename');
            await voiceChannel.setName(newName).catch(() => {});
            return interaction.reply({ content: 'تم تغيير الاسم . . .', ephemeral: true });
        }

        if (interaction.customId === 'modal_limit') {
            const limitVal = parseInt(interaction.fields.getTextInputValue('input_limit'));
            if (!isNaN(limitVal)) {
                roomData.userLimit = limitVal;
                await voiceChannel.setUserLimit(limitVal).catch(() => {});
            }
            return interaction.reply({ content: 'تم تعديل حد الروم . . .', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
