// src/handlers/keihi/request/requestStart.js
// ----------------------------------------------------
// 経費申請ボタン〜経費項目セレクト / モーダル表示
//   - 経費申請ボタン押下 → 経費項目セレクト
//   - 経費項目セレクト → 経費申請モーダル表示
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { resolveStoreName } = require('../setting/panel');
const { collectAllowedRoleIdsForRequest } = require('./helpers.js');
const { IDS: REQ_IDS } = require('./requestIds');

// ----------------------------------------------------
// 経費申請ボタン → 経費項目セレクト表示
// ----------------------------------------------------
/**
 * 経費申請ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} storeId
 */
async function handleRequestStart(interaction, storeId) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: 'ギルド情報が取得できませんでした。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const guildId = guild.id;
  const member = interaction.member;

  // keihiConfig と storeRoleConfig を同時に読み込み
  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const panelConfig = keihiConfig.panels?.[storeId];

  if (!panelConfig || !panelConfig.channelId) {
    await interaction.reply({
      content: 'この店舗の経費申請パネル設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 役職ロール設定（storeRoleConfig）も考慮した許可ロール一覧を取得
  const { allowedRoleIds } = collectAllowedRoleIdsForRequest(
    keihiConfig,
    storeId,
    storeRoleConfig,
  );

  // メンバーの所持ロール
  const memberRoleIds = new Set(member.roles.cache.keys());
  const hasPermission = allowedRoleIds.some((id) => memberRoleIds.has(id));

  if (!hasPermission) {
    await interaction.reply({
      content:
        'この店舗で経費申請を行う権限がありません。\n' +
        'スレッド閲覧役職 / 申請役職 / 承認役職のいずれかを付与してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const items = panelConfig.items || [];
  if (!items.length) {
    await interaction.reply({
      content:
        '経費項目が未設定です。先に「経費項目登録」から項目を登録してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${REQ_IDS.REQUEST_ITEM_SELECT}:${storeId}`)
    .setPlaceholder('申請する経費項目を選択')
    .setMinValues(1)
    .setMaxValues(1);

  items.forEach((item) => {
    let label;
    if (typeof item === 'string') {
      label = item;
    } else if (item && typeof item === 'object') {
      label = item.name || String(item);
    } else {
      label = String(item);
    }

    select.addOptions({
      label: label.slice(0, 100),
      value: label.slice(0, 100), // value にも項目名そのものを設定
    });
  });

  const row = new ActionRowBuilder().addComponents(select);

  const replyMsg = await interaction.reply({
    content: '経費項目を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  // 1分後にメッセージを削除する
  setTimeout(() => {
    replyMsg.delete().catch((e) => {
      // 既に削除されている場合などは無視
      console.debug('メッセージ削除エラー（無視）:', e.message);
    });
  }, 60 * 1000); // 60秒 = 1分
}

// ----------------------------------------------------
// 経費項目セレクト → 申請モーダル表示
// ----------------------------------------------------
/**
 * 経費項目セレクト送信時
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleRequestItemSelect(interaction) {
  const { customId, values, guild } = interaction;
  if (!guild) {
    await interaction.reply({
      content: 'ギルド情報が取得できませんでした。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const guildId = guild.id;

  const [, storeId] = customId.split(':'); // `${REQ_IDS.REQUEST_ITEM_SELECT}:${storeId}`

  const keihiConfig = await loadKeihiConfig(guildId);
  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

  const panelConfig = keihiConfig.panels?.[storeId];
  if (!panelConfig) {
    await interaction.reply({
      content: '経費申請パネルの設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const itemLabel = values[0]; // value に項目名がそのまま入っている

  const storeName = resolveStoreName(storeRoleConfig, storeId);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const modal = new ModalBuilder()
    .setCustomId(`${REQ_IDS.REQUEST_MODAL}::${storeId}`) // モーダルIDには店舗IDのみ
    .setTitle(`経費申請：${storeName}`);

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('日付（YYYY-MM-DD）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(todayStr);

  const deptInput = new TextInputBuilder()
    .setCustomId('department')
    .setLabel('部署')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const itemInput = new TextInputBuilder()
    .setCustomId('item')
    .setLabel('経費項目')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(itemLabel.slice(0, 100));

  const amountInput = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel('金額（半角数字）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId('note')
    .setLabel('備考')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(deptInput),
    new ActionRowBuilder().addComponents(itemInput),
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(noteInput),
  );

  await interaction.showModal(modal);
}

module.exports = {
  handleRequestStart,
  handleRequestItemSelect,
};
