// src/handlers/keihi/setting/panel.js
// ----------------------------------------------------
// 経費「設定パネル」本体
//   - embed 構築
//   - /設定経費 からの送信 / 更新
//   - 旧フォーマット (panelMap ...) も migrate
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const logger = require('../../../utils/logger');
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiStoreConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { createSettingPanelEmbed } = require('../../../utils/embedPanel');
const { IDS } = require('./ids');

// ------------------------
// ボタン行
// ------------------------
function buildSettingButtonsRow1() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_SET_PANEL)
      .setLabel('経費パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_SET_APPROVER)
      .setLabel('承認役職')
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildSettingButtonsRow2() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_EXPORT_CSV)
      .setLabel('経費csv発行')
      .setStyle(ButtonStyle.Success),
  );
}

// ------------------------
// 店舗名解決
// ------------------------
function resolveStoreName(storeRoleConfig, storeId) {
  if (!storeRoleConfig) return storeId;
  const rawStores = storeRoleConfig.stores ?? storeRoleConfig;

  if (Array.isArray(rawStores)) {
    const storeById = rawStores.find(
      (s) => s && String(s.id) === String(storeId),
    );
    if (storeById) return storeById.name;

    const storeByIndex = rawStores[Number(storeId)];
    if (typeof storeByIndex === 'string') return storeByIndex;
    return storeByIndex?.name ?? storeByIndex?.storeName ?? storeId;
  } else if (rawStores && typeof rawStores === 'object') {
    return rawStores[storeId]?.name ?? rawStores[storeId]?.storeName ?? storeId;
  }
  return storeId;
}

// ------------------------
// 設定パネル embed + components
// ------------------------
async function buildKeihiSettingPanelPayload(guild, keihiConfig) {
  const guildId = guild.id;

  let storeRoleConfig = null;
  try {
    storeRoleConfig = await loadStoreRoleConfig(guildId);
  } catch (err) {
    logger.warn('[keihi/setting/panel] storeRoleConfig 読み込み失敗', err);
  }

  const panelLines = [];

  const panels = keihiConfig.panels || {};

  // panels の内容をもとに店舗ごとのパネル一覧を作る
  for (const [storeId, panel] of Object.entries(panels)) {
    if (!panel) continue;

    const channelId = panel.channelId;
    if (!channelId) continue;

    const messageId = panel.messageId || null;
    const channel = guild.channels.cache.get(channelId);
    const storeName = resolveStoreName(storeRoleConfig, storeId);
    const channelMention = channel ? `<#${channelId}>` : `ID: ${channelId}`;

    let line = `・${storeName}：${channelMention}`;
    if (messageId) {
      const url = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
      line += ` [パネル](${url})`;
    }
    panelLines.push(line);
  }

  // ---------- 承認役職表示 ----------
  const roleIdSet = new Set();

  if (Array.isArray(keihiConfig.approverRoleIds)) {
    for (const id of keihiConfig.approverRoleIds) {
      if (id) roleIdSet.add(id);
    }
  }
  if (Array.isArray(keihiConfig.approvalRoles)) {
    for (const id of keihiConfig.approvalRoles) {
      if (id) roleIdSet.add(id);
    }
  }

  const approverRoleIds = Array.from(roleIdSet);
  let approverLines = approverRoleIds.length
    ? approverRoleIds
        .map((roleId) => {
          const role = guild.roles.cache.get(roleId);
          const name = role?.name || `ロールID: ${roleId}`;
          const mention = role ? `<@&${role.id}>` : `ロールID: ${roleId}`;
          return `${name}：${mention}`;
        })
        .join('\n')
    : '未設定';

  const embed = createSettingPanelEmbed('💸 経費設定パネル', [
    {
      name: '📋 経費パネル設置一覧',
      value: panelLines.length ? panelLines.join('\n') : '未設置',
    },
    {
      name: '🛡️ 承認役職',
      value: approverLines,
    },
    {
      name: '📊 経費CSV出力',
      value: '年月日　年月　年　四半期',
    },
  ]);

  const row1 = buildSettingButtonsRow1();
  const row2 = buildSettingButtonsRow2();

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

// ------------------------
// /設定経費 実行時: 設定パネル送信/更新
// ------------------------
async function postKeihiSettingPanel(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;

  let keihiConfig = await loadKeihiConfig(guildId);
  const payload = await buildKeihiSettingPanelPayload(guild, keihiConfig);

  const panelInfo = keihiConfig.configPanel || keihiConfig.settingPanel;

  // 既存パネルがあればそのメッセージを更新
  if (panelInfo?.channelId && panelInfo?.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('channel not found or not text based');
      }

      const message = await channel.messages.fetch(panelInfo.messageId);
      await message.edit(payload);

      keihiConfig.configPanel = {
        channelId: panelInfo.channelId,
        messageId: panelInfo.messageId,
      };

      keihiConfig = await saveKeihiConfig(guildId, keihiConfig);

      await interaction.editReply({
        content: '経費設定パネルを更新しました。',
      });
      return;
    } catch (err) {
      logger.warn(
        '[keihi/setting/panel] 既存パネル更新失敗 → 新規送信へフォールバック',
        err,
      );
    }
  }

  // 既存がない or 取得失敗 → 新しく現在のチャンネルに送信
  const sent = await interaction.channel.send(payload);

  keihiConfig.configPanel = {
    channelId: sent.channelId,
    messageId: sent.id,
  };

  keihiConfig = await saveKeihiConfig(guildId, keihiConfig);

  await interaction.editReply({
    content: '経費設定パネルを新規に設置しました。',
  });
}

// ------------------------
// 店舗ごとの経費申請パネルを送信
//   ※ sendKeihiPanel は request/helpers からも呼ばれる
// ------------------------
/**
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} storeId
 */
async function sendKeihiPanel(channel, storeId) {
  const guild = channel.guild;
  const guildId = guild.id;

  const [keihiConfig, storeConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadKeihiStoreConfig(guildId, storeId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const storeName = resolveStoreName(storeRoleConfig, storeId);

  const embed = new EmbedBuilder()
    .setTitle(`💸 経費申請パネル：${storeName}`)
    .setDescription('下のボタンから経費を申請してください。')
    .setColor(0x54a0ff);

  const items = storeConfig.items || [];
  const itemsValue =
    items.length > 0
      ? items
          .map((item) => `・${typeof item === 'string' ? item : item.name}`)
          .join('\n')
      : '未設定';

  embed.addFields({
    name: '申請可能な経費項目',
    value: itemsValue.slice(0, 1024),
  });

  const rolesToMentions = (roleIds = []) => {
    if (!roleIds.length) return '未設定';
    return roleIds.map((id) => `<@&${id}>`).join(' ');
  };

  embed.addFields(
    {
      name: 'スレッド閲覧役職',
      value: rolesToMentions(storeConfig.viewRoleIds),
    },
    {
      name: '経費申請役職',
      value: rolesToMentions(storeConfig.requestRoleIds),
    },
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_request:btn:request:${storeId}`)
      .setLabel('経費申請')
      .setStyle(ButtonStyle.Primary),
  );

  const sent = await channel.send({ embeds: [embed], components: [row] });

  // 店舗config を更新
  storeConfig.channelId = sent.channelId;
  storeConfig.messageId = sent.id;
  await saveKeihiStoreConfig(guildId, storeId, storeConfig);

  // グローバル config.panels も同期
  if (!keihiConfig.panels) keihiConfig.panels = {};
  keihiConfig.panels[storeId] = {
    channelId: sent.channelId,
    messageId: sent.id,
  };
  await saveKeihiConfig(guildId, keihiConfig);

  return sent;
}

module.exports = {
  resolveStoreName,
  buildKeihiSettingPanelPayload,
  postKeihiSettingPanel,
  sendKeihiPanel,
};

/**
 * 設定パネルメッセージを再描画
 * @param {import('discord.js').Guild} guild
 * @param {any} keihiConfig
 */
async function refreshKeihiSettingPanelMessage(guild, keihiConfig) {
  const panelInfo = keihiConfig.configPanel || keihiConfig.settingPanel;
  if (!panelInfo?.channelId || !panelInfo?.messageId) return;

  const channel = await guild.channels.fetch(panelInfo.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const payload = await buildKeihiSettingPanelPayload(guild, keihiConfig);
  const message = await channel.messages.fetch(panelInfo.messageId).catch(() => null);
  if (message) {
    await message.edit(payload).catch(() => {});
  }
}

module.exports.refreshKeihiSettingPanelMessage = refreshKeihiSettingPanelMessage;
