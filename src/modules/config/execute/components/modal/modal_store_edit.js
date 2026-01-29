// src/handlers/config/components/modal/modal_store_edit.js
// ----------------------------------------------------
// 店舗名編集モーダル（表示 ＋ 保存処理）
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

const {
  loadStoreRoleConfig,
  saveStoreRoleConfig,
} = require('../../../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../../../utils/config/configLogger');
const { sendConfigPanel } = require('../../configPanel');
const showModalSafe = require('../../../../../utils/showModalSafe');
const logger = require('../../../../../utils/logger');

/**
 * 「店舗名編集」ボタン押下時 → モーダル表示
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function show(interaction) {
  // 💡 Platinum Rule: showModal は即座に呼ぶ（3秒ルール厳守）
  const modal = new ModalBuilder()
    .setCustomId('config_store_edit_modal')
    .setTitle('店舗名編集');

  const input = new TextInputBuilder()
    .setCustomId('store_names')
    .setLabel('店舗名（1行につき1店舗）')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('例)\n赤坂店\n銀座店\n渋谷店');

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  // 即座に showModal（一切の await なし）
  return showModalSafe(interaction, modal);
}

/**
 * モーダル送信後の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handle(interaction) {
  const guildId = interaction.guild.id;

  // ---------- 入力値の取得 ----------
  const raw = interaction.fields.getTextInputValue('store_names') ?? '';

  let lines = raw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  lines = Array.from(new Set(lines));

  if (lines.length === 0) {
    return interaction.reply({
      content: '⚠️ 店舗名が1件も入力されていません。',
      flags: 1 << 6,
    });
  }

  // 💡 Platinum Strategy: 即座に reply して 10062 を回避
  await interaction.reply({
    content: '⏳ 店舗名を更新しています...',
    flags: 1 << 6,
  });

  // ---------- 既存設定の取得 ----------
  const beforeCfg = await loadStoreRoleConfig(guildId);

  // 既存の他項目は維持しつつ、stores と storeRoles を更新
  const newStores = lines;

  // storeRoles から、存在しなくなった店舗を削除
  const oldStoreRoles = beforeCfg.storeRoles || {};
  const newStoreRoles = {};
  for (const storeName of newStores) {
    if (oldStoreRoles[storeName]) {
      newStoreRoles[storeName] = oldStoreRoles[storeName];
    }
  }

  const afterCfg = {
    ...beforeCfg,
    stores: newStores,
    storeRoles: newStoreRoles,
  };

  // ---------- 保存 ----------
  await saveStoreRoleConfig(guildId, afterCfg);

  // ---------- 設定ログ出力 ----------
  try {
    const oldSet = new Set(beforeCfg.stores || []);
    const newSet = new Set(newStores);
    const added = newStores.filter(s => !oldSet.has(s));
    const deleted = (beforeCfg.stores || []).filter(s => !newSet.has(s));

    let descriptionParts = ['🏪 店舗一覧が更新されました'];

    if (added.length > 0) {
      descriptionParts.push('➕ 追加: ' + added.join(', '));
    }
    if (deleted.length > 0) {
      descriptionParts.push('➖ 削除: ' + deleted.join(', '));
    }

    await sendSettingLog(interaction, {
      title: '🏪 店舗設定変更',
      description: descriptionParts.join('\n'),
      color: 0x00b894,
    });
  } catch {
    // ログ出力失敗は致命的ではないので握りつぶす
  }

  // ---------- 最終応答（editReply）----------
  await interaction.editReply({
    content:
      '✅ 店舗名を更新しました。\n' +
      '```' +
      newStores.join('\n') +
      '```',
  });

  // ---------- 設定パネル再描画（非同期）----------
  setImmediate(async () => {
    try {
      const settingChannel = interaction.channel;
      if (settingChannel) {
        await sendConfigPanel(settingChannel);
      }
    } catch (err) {
      logger.error('[modal_store_edit] Panel update failed:', err);
    }
  });
}

module.exports = {
  show,
  handle,
};
