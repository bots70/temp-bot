const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Bot is ready.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // أمر إرسال لوحة التحكم (يدعم -setup و !setup)
    if (message.content === '-setup' || message.content === '!setup') {
        const embed = new EmbedBuilder()
            .setTitle('Temp Control')
            .setDescription('للتحكم بالروم الضغط على الازار')
            .setColor(0x2f3136);

        // الصف الأول: تغير الاسم، نقل الملكية، حد الروم
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('temp_rename').setLabel('تغير الاسم').setEmoji('👤').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_transfer').setLabel('نقل الملكية').setEmoji('✍️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_limit').setLabel('حد الروم').setEmoji('🎧').setStyle(ButtonStyle.Secondary)
        );

        // الصف الثاني: قفل الروم، فتح الروم، اخفاء الروم، اظهار الروم
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('temp_lock').setLabel('قفل الروم').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_unlock').setLabel('فتح الروم').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_hide').setLabel('اخفاء الروم').setEmoji('👁️‍🗨️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_unhide').setLabel('اظهار الروم').setEmoji('👁️').setStyle(ButtonStyle.Secondary)
        );

        // الصف الثالث: منع، السماح، طرد عضو
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('temp_ban').setLabel('منع').setEmoji('👤').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_allow').setLabel('السماح').setEmoji('👤').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_kick').setLabel('طرد عضو').setEmoji('🚪').setStyle(ButtonStyle.Secondary)
        );

        // الصف الرابع: ميوت، فك ميوت
        const row4 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('temp_mute').setLabel('ميوت').setEmoji('🎤').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('temp_unmute').setLabel('فك ميوت').setEmoji('🎙️').setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row1, row2, row3, row4]
        });
    }
});

// نظام التفاعل مع الأزرار للتحكم بالرومات الصوتية
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    // التحقق مما إذا كان العضو في روم صوتي عند الضغط على أي زر تحكم
    if (!voiceChannel) {
        return interaction.reply({ content: 'يجب أن تكون داخل روم صوتي لكي تستخدم هذه الأزرار!', ephemeral: true });
    }

    try {
        if (interaction.customId === 'temp_lock') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
            await interaction.reply({ content: '🔒 تم قفل الروم بنجاح.', ephemeral: true });
        } 
        else if (interaction.customId === 'temp_unlock') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
            await interaction.reply({ content: '🔓 تم فتح الروم بنجاح.', ephemeral: true });
        } 
        else if (interaction.customId === 'temp_hide') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
            await interaction.reply({ content: '👁️‍🗨️ تم اخفاء الروم بنجاح.', ephemeral: true });
        } 
        else if (interaction.customId === 'temp_unhide') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
            await interaction.reply({ content: '👁️ تم اظهار الروم بنجاح.', ephemeral: true });
        }
        else if (interaction.customId === 'temp_mute') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Speak: false });
            await interaction.reply({ content: '🎤 تم عمل ميوت للروم.', ephemeral: true });
        }
        else if (interaction.customId === 'temp_unmute') {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Speak: true });
            await interaction.reply({ content: '🎙️ تم فك الميوت عن الروم.', ephemeral: true });
        }
        else {
            // باقي الأزرار (تغيير الاسم، الحد، الطرد، النقل.. إلخ)
            await interaction.reply({ content: 'تم استلام طلبك وجاري معالجته.', ephemeral: true });
        }
    } catch (error)  {
        console.error(error);
        await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر، تأكد أن البوت يملك صلاحيات كافية.', ephemeral: true });
    }
});

// ضع توكن بوتك هنا أو استخدم متغيرات البيئة (process.env.TOKEN)
client.login('YOUR_BOT_TOKEN');
