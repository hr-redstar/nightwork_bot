// src/handlers/keihi/request/requestStart.js
// ----------------------------------------------------
// 経費申請ボタン〜経費項目セレクト / モーダル表示
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const {
  loadKeihiConfig,
  loadKeihiStoreConfig,
} = require('../../../utils/keihi/keihiConfigManager');

const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { collectAllowedRoleIdsForRequest } = require('./helpers.js');

const { IDS: REQ_IDS } = require('./requestIds');
const logger = require('../../../utils/logger');
const { resolveStoreName } = require('../setting/storeNameResolver');

// ----------------------------------------------------
// 経費申請ボタン → 経費項目セレクト表示
// ----------------------------------------------------
async function handleRequestStart(interaction, storeKey) {
  // 先に ACK (3秒対策)
  await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;

  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

  const [keihiConfig, storeConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadKeihiStoreConfig(guildId, storeKey, storeRoleConfig).catch(() => null),
  ]);

  const panelConfig = keihiConfig.panels?.[storeKey] || {};

  if (!panelConfig?.channelId) {
    await interaction.editReply({
      content: 'この店舗の経費申請パネル設定が見つかりません。',
      components: [],
    });
    return;
  }

  const { allowedRoleIds } = collectAllowedRoleIdsForRequest(
    keihiConfig,
    storeKey,
    storeRoleConfig,
  );

  const memberRoleIds = new Set(member.roles.cache.keys());
  const hasPermission =
    allowedRoleIds.length > 0 && allowedRoleIds.some((id) => memberRoleIds.has(id));

  if (!hasPermission) {
    await interaction.editReply({
      content:
        'この店舗で経費申請を行う権限がありません。\nスレッド閲覧役職 / 申請役職 / 承認役職、または設定された申請用ロールのいずれかを付与してください。',
      components: [],
    });
    return;
  }

  const items =
    Array.isArray(panelConfig.items) && panelConfig.items.length
      ? panelConfig.items
      : (storeConfig && Array.isArray(storeConfig.items) ? storeConfig.items : []);

  if (!items.length) {
    await interaction.reply({
      content:
        '経費項目が未設定です。先に「経費項目登録」から項目を登録してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${REQ_IDS.REQUEST_ITEM_SELECT}::${storeKey}`)
    .setPlaceholder('申請する経費項目を選択')
    .setMinValues(1)
    .setMaxValues(1);

  for (const item of items) {
    let label;
    if (typeof item === 'string') label = item;
    else if (item && typeof item === 'object') label = item.name || String(item);
    else label = String(item);

    const safe = label.slice(0, 100);

    select.addOptions({
      label: safe,
      value: safe,
    });
  }

  await interaction.editReply({
    content: '経費項目を選択してください。',
    components: [new ActionRowBuilder().addComponents(select)],
  });

  // 14分で削除（15分だとトークン失効で失敗しがち）
  const AUTO_DELETE_MS = 14 * 60 * 1000;

  setTimeout(async () => {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.deleteReply();
      }
    } catch {
      // Invalid Webhook Token 等は仕様なので無視でOK
    }
  }, AUTO_DELETE_MS);
}

// ----------------------------------------------------
// 経費項目セレクト → 申請モーダル表示
// ----------------------------------------------------
async function handleRequestItemSelect(interaction) {
  const { customId, values, guild } = interaction;
  const guildId = guild.id;

  const PREFIX = `${REQ_IDS.REQUEST_ITEM_SELECT}::`;
  if (!customId.startsWith(PREFIX)) {
    logger.warn('[keihi/request/requestStart] unexpected select customId', { customId });
    return;
  }

  // 将来 `...::storeKey::anything` になっても先頭だけ採用
  const storeKey = customId.slice(PREFIX.length).split('::')[0];
  if (!storeKey) return;

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const panelConfig = keihiConfig.panels?.[storeKey];
  if (!panelConfig) {
    await interaction.reply({
      content: '経費申請パネルの設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const itemLabel = values[0];
  const storeName = resolveStoreName(storeRoleConfig, storeKey);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const modal = new ModalBuilder()
    .setCustomId(`${REQ_IDS.REQUEST_MODAL}::${storeKey}`)
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

  try {
    if (interaction.deferred || interaction.replied) {
      logger.warn('[keihi/request/requestStart] showModal skipped: already acknowledged', {
        customId,
        deferred: interaction.deferred,
        replied: interaction.replied,
      });
      return;
    }

    await interaction.showModal(modal);
  } catch (err) {
    logger.error('[keihi/request/requestStart] showModal failed', err);
  }
}

module.exports = {
  handleRequestStart,
  handleRequestItemSelect,
};
