// src/commands/91_メッセージファイル化.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const logger = require('../utils/logger');
const { saveChannelMessages, getMessageLogUrl } = require('../utils/logs/gcsMessageLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('メッセージファイル化')
    .setDescription('テキストチャンネルのこれまでのメッセージを全てファイル化します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('対象のテキストチャンネル（未指定時は実行したチャンネル）')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const guild = interaction.guild;

    try {
      // ボットの権限を確認
      const me = interaction.guild.members.me;
      const perms = targetChannel.permissionsFor(me);
      if (!perms || !perms.has(PermissionFlagsBits.ReadMessageHistory)) {
        await interaction.editReply(`❌ エラー: チャンネル <#${targetChannel.id}> のメッセージ履歴を閲覧する権限がありません。`);
        return;
      }

      logger.info(`[メッセージファイル化] 開始: guild=${guild.id} channel=${targetChannel.id}`);

      // メッセージ全取得（100件ずつページング）
      const messages = [];
      let lastId = null;

      while (true) {
        const fetchOptions = { limit: 100 };
        if (lastId) fetchOptions.before = lastId;

        const batch = await targetChannel.messages.fetch(fetchOptions);
        if (batch.size === 0) break;

        batch.forEach((m) => messages.push(m));
        lastId = batch.lastKey();

        // 安全装置
        if (messages.length >= 100000) {
          logger.warn(`[メッセージファイル化] 取得上限(10万件)に達したため打ち切り`);
          break;
        }
      }

      if (messages.length === 0) {
        await interaction.editReply(`✅ チャンネル <#${targetChannel.id}> には保存するメッセージがありませんでした。`);
        return;
      }

      // 古い順にソート
      messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      // プレーンなオブジェクトに変換
      const plainMessages = messages.map((m) => ({
        id: m.id,
        authorId: m.author.id,
        authorName: m.member?.displayName || m.author.username,
        authorTag: m.author.tag || `${m.author.username}#${m.author.discriminator}`,
        createdAt: m.createdAt.toISOString(),
        content: m.content,
        attachments: [...m.attachments.values()].map((att) => ({
          id: att.id, name: att.name, url: att.url, size: att.size, contentType: att.contentType,
        })),
        referencedMessageId: m.reference?.messageId ?? null,
      }));

      // 日付(YYYY-MM-DD)ごとに分割
      /** @type {Record<string, Array<object>>} */
      const byDate = {};
      for (const msg of plainMessages) {
        const dateKey = msg.createdAt.slice(0, 10); // YYYY-MM-DD
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(msg);
      }

      const dates = Object.keys(byDate).sort(); // 古い順

      // GCSに保存
      for (const date of dates) {
        await saveChannelMessages(guild.id, targetChannel.id, targetChannel.name, date, byDate[date]);
      }

      // ダウンロードリンク一覧を作成
      const MAX_LINKS = 20; // メッセージに載せる最大日数（多すぎ防止）
      const limitedDates = dates.slice(-MAX_LINKS); // 新しい方から最大 20 日分

      const linkLines = limitedDates.map((date) => {
        const url = getMessageLogUrl(guild.id, targetChannel.id, date);
        return `- ${date}: ${url}`;
      });

      let linksDescription = '';
      if (linkLines.length > 0) {
        linksDescription = [
          '',
          '📥 **ダウンロードリンク一覧** (最新から最大 20 日分)',
          ...linkLines,
          dates.length > MAX_LINKS
            ? `... 他 ${dates.length - MAX_LINKS} 日分は GCS から直接参照してください。`
            : '',
        ]
          .filter(Boolean)
          .join('\n');
      }

      // 直近の日付分をJSON添付で返す
      const latestDate = dates[dates.length - 1];
      const latestPayload = {
        guildId: guild.id,
        channelId: targetChannel.id,
        channelName: targetChannel.name,
        date: latestDate,
        count: byDate[latestDate].length,
        messages: byDate[latestDate],
      };

      const jsonString = JSON.stringify(latestPayload, null, 2);
      const attachment = new AttachmentBuilder(Buffer.from(jsonString, 'utf8'), {
        name: `messages-${targetChannel.name}-${latestDate}.json`,
      });

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('📄 メッセージのファイル化が完了しました')
        .setDescription(
          [
            `チャンネル <#${targetChannel.id}> のメッセージを **${messages.length} 件** ファイル化しました。`,
            `- GCSに日別で保存しました。`,
            `- 直近の日付 (${latestDate}) のJSONを添付しています。`,
          ].join('\n')
        )
        .addFields(
          { name: 'GCS保存先パス形式', value: `\`${guild.id}/メッセージログ/${targetChannel.id}/YYYY-MM-DD.json\``, inline: false }
        )
        .setFooter({ text: `実行者: ${interaction.user.tag}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed], files: [attachment] });

      logger.info(`[メッセージファイル化] 完了: guild=${guild.id} channel=${targetChannel.id} total=${messages.length}`);

    } catch (error) {
      logger.error('[/メッセージファイル化] コマンド実行中にエラーが発生しました:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ エラー: メッセージのファイル化中に予期せぬエラーが発生しました。').catch(() => {});
      }
    }
  },
};