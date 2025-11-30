// src/handlers/message/exportTextChannelMessages.js
// ----------------------------------------------------
// テキストチャンネルの全メッセージを取得して
//  - GCS / local_data に日付ごと JSON で保存
//  - 全メッセージまとめ TXT を保存
//  - TXT をメッセージに添付（＋リンク表示）
// ----------------------------------------------------

const {
  ChannelType,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const logger = require('../../utils/logger');
const {
  saveChannelMessages,   // 日別 JSON 保存
  saveChannelTextLog,    // まとめ TXT 保存
  getMessageLogUrl,      // JSON 公開 URL（今は主に案内用）
  getMessageTxtUrl,      // TXT 公開 URL
} = require('../../utils/logs/gcsMessageLog');

/**
 * 指定テキストチャンネルの全メッセージをファイル化して保存する
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function exportTextChannelMessages(interaction) {
  const targetChannel =
    interaction.options.getChannel('channel') ?? interaction.channel;

  if (targetChannel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: '❌ 対象はテキストチャンネルのみ指定できます。',
      ephemeral: true,
    });
  }

  const me = interaction.guild.members.me;
  const perms = targetChannel.permissionsFor(me);

  if (
    !perms ||
    !perms.has(PermissionFlagsBits.ViewChannel) ||
    !perms.has(PermissionFlagsBits.ReadMessageHistory)
  ) {
    return interaction.reply({
      content: '❌ このチャンネルのメッセージ履歴を読む権限がありません。',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guild.id;
  const channelId = targetChannel.id;
  const channelName = targetChannel.name;

  logger.info(
    `[exportTextChannelMessages] 開始: guild=${guildId} channel=${channelId}`,
  );

  // ------------------------------
  // メッセージ全取得（100件ずつページング）
  // ------------------------------
  const messages = [];
  let lastId = null;

  while (true) {
    const fetchOptions = { limit: 100 };
    if (lastId) fetchOptions.before = lastId;

    // 新しい順で最大100件
    const batch = await targetChannel.messages.fetch(fetchOptions);
    if (batch.size === 0) break;

    batch.forEach((m) => messages.push(m));

    // このバッチの一番古いメッセージ ID を基準に次を取得
    const oldest = batch.last();
    lastId = oldest.id;

    // めちゃくちゃ件数が多い場合の安全装置（必要なら上限を調整）
    if (messages.length >= 100000) {
      logger.warn(
        `[exportTextChannelMessages] 取得上限に達したため打ち切り: ${messages.length}件`,
      );
      break;
    }
  }

  if (messages.length === 0) {
    return interaction.editReply(
      `#️⃣ <#${channelId}> には保存するメッセージがありません。`,
    );
  }

  // 古い順にソート
  messages.sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp,
  );

  // ------------------------------
  // プレーンなオブジェクトに変換
  // ------------------------------
  const plainMessages = messages.map((m) => ({
    id: m.id,
    authorId: m.author.id,
    authorName: m.member?.displayName || m.author.username,
    authorTag:
      m.author.tag || `${m.author.username}#${m.author.discriminator}`,
    createdAt: m.createdAt.toISOString(),
    content: m.content,
    attachments: [...m.attachments.values()].map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url,
      size: att.size,
      contentType: att.contentType,
    })),
    // 引用元など、最低限だけ保持（必要なら増やす）
    referencedMessageId: m.reference?.messageId ?? null,
  }));

  // ------------------------------
  // 日付(YYYY-MM-DD)ごとに分割して GCS 保存
  // ------------------------------
  /** @type {Record<string, Array<object>>} */
  const byDate = {};

  for (const msg of plainMessages) {
    const dateKey = msg.createdAt.slice(0, 10); // YYYY-MM-DD
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(msg);
  }

  const dates = Object.keys(byDate).sort(); // 古い順

  for (const date of dates) {
    await saveChannelMessages(
      guildId,
      channelId,
      channelName,
      date,
      byDate[date],
    );
  }

  // ------------------------------
  // JSON リンク（最大20日分）※任意
  // ------------------------------
  const MAX_LINKS = 20;
  const limitedDates = dates.slice(-MAX_LINKS);

  const linkLines = limitedDates.map((date) => {
    const url = getMessageLogUrl(guildId, channelId, date);
    return `- ${date}: ${url}`;
  });

  let linksDescription = '';
  if (linkLines.length > 0) {
    linksDescription = [
      '',
      '📥 **日別 JSON ダウンロードリンク** (最新から最大 20 日分)',
      ...linkLines,
      dates.length > MAX_LINKS
        ? `... 他 ${dates.length - MAX_LINKS} 日分は GCS / local_data から直接参照してください。`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  let txtUrl = '';
  let attachment = null;
  let txtNote = '';

  try {
    // ------------------------------
    // 全メッセージを 1 本の TXT にまとめる
    // ------------------------------
    const txtLines = plainMessages.map((msg) => {
      const time = msg.createdAt.replace('T', ' ').replace('Z', '');
      const header = `[${time}] ${msg.authorName} (${msg.authorId})`;
      const body =
        msg.content && msg.content.trim().length > 0
          ? msg.content
          : '(本文なし)';
      const attachLines =
        msg.attachments && msg.attachments.length > 0
          ? [
              '  Attachments:',
              ...msg.attachments.map(
                (att) => `  - ${att.name} (${att.url})`,
              ),
            ]
          : [];
      return [header, body, ...attachLines].join('\n');
    });

    const txtContent = txtLines.join('\n\n') || '(メッセージなし)';

    // GCS / ローカル に TXT 保存
    await saveChannelTextLog(guildId, channelId, txtContent);

    // 公開 URL（本番 GCS 用。ローカルモードではとりあえず形式だけ）
    txtUrl = getMessageTxtUrl(guildId, channelId);

    // Discord 添付用
    const txtBuffer = Buffer.from(txtContent, 'utf8');
    attachment = new AttachmentBuilder(txtBuffer, {
      name: `messages-${channelName}-all.txt`,
    });
  } catch (err) {
    logger.error(
      `[exportTextChannelMessages] TXT処理エラー: guild=${guildId} channel=${channelId}`,
      err,
    );
    txtNote = '\n\n⚠️ TXTファイルの作成または保存中にエラーが発生しました。';
  }

  await interaction.editReply({
    content: [
      `✅ <#${channelId}> のメッセージを **${messages.length} 件** ファイル化しました。`,
      `- JSON(日別): \`GCS/${guildId}/メッセージログ/${channelId}/YYYY-MM-DD.json\` に保存しました`,
      `- まとめ TXT: \`GCS/${guildId}/メッセージログ/${channelId}/メッセージ用txt/messages.txt\` に保存しました`,
      `- TXT ダウンロードリンク: ${txtUrl}`,
      linksDescription,
      txtNote,
    ].join('\n'),
    files: attachment ? [attachment] : [],
  });

  logger.info(
    `[exportTextChannelMessages] 完了: guild=${guildId} channel=${channelId} total=${messages.length}`,
  );
}

module.exports = {
  exportTextChannelMessages,
};