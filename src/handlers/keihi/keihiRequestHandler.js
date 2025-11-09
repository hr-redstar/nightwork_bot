// src/handlers/keihi/keihiRequestHandler.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
} = require('discord.js');
const dayjs = require('dayjs');
const { loadKeihiConfig } = require('../../utils/keihi/keihiConfigManager');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');
const { saveKeihiDaily } = require('../../utils/keihi/keihiConfigManager');

/**
 * 経費申請ボタン押下 → 経費項目選択
 */
async function handleKeihiRequest(interaction) {
  const guildId = interaction.guild.id;
  const config = await loadKeihiConfig(guildId);

  // 経費項目取得
  const storeName = interaction.customId.replace('keihi_request_', '');
  const items = config.storeItems?.[storeName] || [];

  if (items.length === 0) {
    return interaction.reply({
      content: `⚠️ 店舗「${storeName}」には経費項目が設定されていません。`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // 重複する項目を排除
  const uniqueItems = [...new Set(items)];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`keihi_request_select_${storeName}`)
    .setPlaceholder('経費項目を選択してください')
    .addOptions(uniqueItems.map(i => ({ label: i, value: i })));

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.reply({
    content: `📦 経費項目を選択してください（店舗：${storeName}）`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 経費項目選択 → モーダル入力
 */
async function handleKeihiRequestSelect(interaction) {
  const storeName = interaction.customId.replace('keihi_request_select_', '');
  const selectedItem = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`keihi_request_modal_${storeName}_${selectedItem}`)
    .setTitle(`📋 経費申請 (${storeName})`);

  const date = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('日付（必須）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 2025/01/01')
    .setRequired(true)
    .setValue(dayjs().format('YYYY/MM/DD'));

  const dept = new TextInputBuilder()
    .setCustomId('department')
    .setLabel('部署')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const amount = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel('金額（必須）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 3000')
    .setRequired(true);

  const note = new TextInputBuilder()
    .setCustomId('note')
    .setLabel('備考')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(date),
    new ActionRowBuilder().addComponents(dept),
    new ActionRowBuilder().addComponents(amount),
    new ActionRowBuilder().addComponents(note),
  );

  await interaction.showModal(modal);
}

/**
 * 経費申請モーダル送信後
 */
async function handleKeihiRequestModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guildId = interaction.guild.id;
  const guild = interaction.guild;
  const user = interaction.user;
  const keihiConfig = await loadKeihiConfig(guildId);

  const customIdParts = interaction.customId.split('_');
  const [storeName, itemName] = [customIdParts[3], customIdParts.slice(4).join('_')];
  const date = interaction.fields.getTextInputValue('date');
  const department = interaction.fields.getTextInputValue('department') || '-';
  const amount = parseInt(interaction.fields.getTextInputValue('amount').replace(/\D/g, ''), 10);
  const note = interaction.fields.getTextInputValue('note') || '-';
  const now = dayjs().format('YYYY/MM/DD HH:mm');

  // 日付形式のバリデーション
  if (!dayjs(date, 'YYYY/MM/DD', true).isValid()) {
    return interaction.editReply({
      content: '⚠️ 日付の形式が正しくありません。「YYYY/MM/DD」の形式で入力してください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.channel;

  // ✅ スレッド作成または取得
  const threadName = `${dayjs(date).format('YYYYMM')}-${storeName}-経費申請`;
  let thread = channel.threads.cache.find(t => t.name === threadName && !t.archived);
  if (!thread) {
    // 見つからなければアクティブなスレッドをすべて取得して再検索
    const activeThreads = await channel.threads.fetchActive();
    thread = activeThreads.threads.find(t => t.name === threadName);
  }
  if (!thread) {
    thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440,
      reason: '経費申請スレッド作成',
    });
  }

  // ✅ 経費申請Embed作成
  const embed = new EmbedBuilder()
    .setColor('#0984e3')
    .setTitle('🧾 経費申請')
    .addFields(
      { name: '📅 日付', value: date, inline: true },
      { name: '🏢 部署', value: department, inline: true },
      { name: '📦 経費項目', value: itemName, inline: true },
      { name: '💴 金額', value: `${amount.toLocaleString()} 円`, inline: true },
      { name: '🗒️ 備考', value: note, inline: false },
      { name: '👤 入力者', value: `<@${user.id}>`, inline: true },
      { name: '⏰ 入力時間', value: now, inline: true },
    )
    .setFooter({ text: `店舗：${storeName}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_approve`)
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`keihi_edit`)
      .setLabel('修正')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`keihi_delete`)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger)
  );

  const threadMessage = await thread.send({ embeds: [embed], components: [row] });

  const logButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_request_${storeName}`)
      .setLabel('経費申請')
      .setStyle(ButtonStyle.Primary),
  );

  // ✅ チャンネルにログ出力
  await channel.send({
    content: `---------------------------\n経費申請しました。\n入力者：<@${user.id}>　入力時間：${now}\n${threadMessage.url}\n<!-- keihi-log:${user.id}:${now} -->\n---------------------------`,
    components: [logButtonRow], // 経費申請ボタンをログメッセージに添付
  });

  // 管理者ログ出力
  const globalConfig = await getGuildConfig(guildId);
  const logChannelId = globalConfig.adminLogChannel;
  if (logChannelId) {
    const logCh = guild.channels.cache.get(logChannelId);
    if (logCh) {
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📩 ${storeName} で経費申請がされました`)
        .addFields(
          { name: '📅 日付', value: date, inline: true },
          { name: '🏢 部署', value: department, inline: true }, // 仕様書には「目的」とあるが、項目で代用
          { name: '📦 経費項目', value: itemName, inline: true },
          { name: '💴 金額', value: `${amount.toLocaleString()} 円`, inline: true },
          { name: '🗒️ 備考', value: note },
          { name: '👤 入力者', value: `<@${user.id}>` },
          { name: '⏰ 入力時間', value: now },
        )
        .setURL(threadMessage.url) // スレッド内のメッセージへのリンク
        .setTimestamp(new Date()); // 現在時刻をログのタイムスタンプとして設定
      await logCh.send({ embeds: [logEmbed] });
    }
  }

  // ✅ データ保存
  await saveKeihiDaily(guildId, storeName, {
    date,
    department,
    item: itemName,
    amount,
    note,
    applicant: user.id,
    createdAt: now,
    status: 'pending',
  });

  await interaction.editReply({ content: '✅ 経費申請を作成しました。' });
}

module.exports = {
  handleKeihiRequest,
  handleKeihiRequestSelect,
  handleKeihiRequestModal,
};
