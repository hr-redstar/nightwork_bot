// src/handlers/keihi/setting/panel.js
// ----------------------------------------------------
// 経費「設定パネル」本体
//   - embed 構築
//   - /設定経費 からの送信 / 更新
//   - 旧フォーマット (approvalRoles, panelMap, settingPanel ...) にも対応
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
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { createSettingPanelEmbed } = require('../../../utils/embedPanel');
const { IDS } = require('./ids');

// ----------------------------------------------------
// ボタン行
// ----------------------------------------------------
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

// ----------------------------------------------------
// 店舗名解決
//   storeRoleConfig のフォーマット差異を吸収して storeId → 店舗名 にする
// ----------------------------------------------------
function resolveStoreName(storeRoleConfig, storeId) {
  if (!storeRoleConfig) return storeId;

  const rawStores = storeRoleConfig.stores ?? storeRoleConfig;

  // 配列形式
  if (Array.isArray(rawStores)) {
    // 新: [{ id, name }, ...]
    const byId = rawStores.find((s) => s && String(s.id) === String(storeId));
    if (byId) return byId.name;

    // 旧: ["店舗A", "店舗B"] or [{ name, storeName }]
    const byIndex = rawStores[Number(storeId)];
    if (typeof byIndex === 'string') return byIndex;
    return byIndex?.name ?? byIndex?.storeName ?? storeId;
  }

  // オブジェクト形式: { "外部IT会社": { name: "外部IT会社", ... } }
  if (rawStores && typeof rawStores === 'object') {
    return (
      rawStores[storeId]?.name ??
      rawStores[storeId]?.storeName ??
      storeId
    );
  }

  return storeId;
}

// ----------------------------------------------------
// 設定パネル embed + components を構築
// ----------------------------------------------------
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
  const panelMap = keihiConfig.panelMap || {};
  const panelMessageMap = keihiConfig.panelMessageMap || {};

  // ---------- ① 新フォーマット panels を優先 ----------
  if (panels && typeof panels === 'object' && Object.keys(panels).length) {
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
  }

  // ---------- ② panels にまだ載っていない店舗だけ旧 panelMap からフォールバック ----------
  if (panelMap && typeof panelMap === 'object') {
    for (const [storeId, channelId] of Object.entries(panelMap)) {
      if (panels && panels[storeId]) continue; // 既に新フォーマットにある店舗はスキップ

      const channel = guild.channels.cache.get(channelId);
      const storeName = resolveStoreName(storeRoleConfig, storeId);
      const channelMention = channel ? `<#${channelId}>` : `ID: ${channelId}`;

      const messageId = panelMessageMap[storeId];
      let line = `・${storeName}：${channelMention}`;
      if (messageId) {
        const url = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
        line += ` [パネル](${url})`;
      }
      panelLines.push(line);
    }
  }

  // ---------- 承認役職（役職＋ロールで表示） ----------
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
  const approverPositionIds = Array.isArray(keihiConfig.approverPositionIds)
    ? keihiConfig.approverPositionIds
    : [];

  let approverLines = '';

  // 役職ベースで表示できるなら「役職名：ロール」形式で表示
  if (storeRoleConfig && approverPositionIds.length > 0) {
    const rawRoles =
      storeRoleConfig.roles ??
      storeRoleConfig.positions ??
      {};

    const positionsById = {};

    if (Array.isArray(rawRoles)) {
      rawRoles.forEach((r, index) => {
        if (typeof r === 'string') {
          positionsById[String(index)] = { id: String(index), name: r };
        } else if (r && typeof r === 'object') {
          const id = String(r.id ?? r.positionId ?? index);
          const name = String(
            r.name ??
              r.label ??
              `役職${id}`,
          );
          positionsById[id] = { id, name };
        }
      });
    } else if (rawRoles && typeof rawRoles === 'object') {
      for (const [id, info] of Object.entries(rawRoles)) {
        const name =
          info?.name ??
          info?.label ??
          `役職${id}`;
        positionsById[String(id)] = { id: String(id), name: String(name) };
      }
    }

    const positionRoles =
      storeRoleConfig.positionRoles ||
      storeRoleConfig.positionRoleMap ||
      {};

    const lines = [];

    for (const posId of approverPositionIds) {
      const key = String(posId);
      const posMeta = positionsById[key];
      const posName = posMeta?.name || key;

      const roleIdsForPos = positionRoles[key] || [];
      const roleMentionText =
        roleIdsForPos.length > 0
          ? roleIdsForPos
              .map((rid) => {
                const role = guild.roles.cache.get(rid);
                return role ? `<@&${role.id}>` : `ロールID: ${rid}`;
              })
              .join(' / ')
          : 'ロール未設定';

      lines.push(`${posName}：${roleMentionText}`);
    }

    if (lines.length > 0) {
      approverLines = lines.join('\n');
    }
  }

  // 上で作れなかった場合はロールIDだけで表示
  if (!approverLines) {
    approverLines =
      approverRoleIds.length > 0
        ? approverRoleIds
            .map((roleId) => {
              const role = guild.roles.cache.get(roleId);
              return role ? `<@&${role.id}>` : `ロールID: ${roleId}`;
            })
            .join('\n')
        : '未設定';
  }

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

// ----------------------------------------------------
// 設定パネルのメッセージ更新（configPanel 情報から）
// ----------------------------------------------------
async function refreshKeihiSettingPanelMessage(guild, keihiConfig) {
  const panelInfo = keihiConfig.configPanel || keihiConfig.settingPanel;
  if (!panelInfo?.channelId || !panelInfo?.messageId) return;

  try {
    const channel = await guild.channels.fetch(panelInfo.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(panelInfo.messageId);
    const payload = await buildKeihiSettingPanelPayload(guild, keihiConfig);
    await message.edit(payload);
  } catch (err) {
    logger.warn('[keihi/setting/panel] 設定パネルの更新に失敗', err);
  }
}

// ----------------------------------------------------
// 旧フォーマットから新フォーマットへのデータ移行
//   - panelMap/panelMessageMap → panels[storeId] へ
// ----------------------------------------------------
function migrateConfigFormat(config) {
  if (!config || typeof config !== 'object') config = {};

  if (!config.panels || typeof config.panels !== 'object') {
    config.panels = {};
  }

  const panelMap = config.panelMap || {};
  const panelMessageMap = config.panelMessageMap || {};

  if (!panelMap || !Object.keys(panelMap).length) {
    return config;
  }

  for (const [storeId, channelId] of Object.entries(panelMap)) {
    if (config.panels[storeId]) continue;
    config.panels[storeId] = {
      channelId,
      messageId: panelMessageMap[storeId] || null,
      requestRoleIds: [],
      items: [],
    };
  }

  return config;
}

// ----------------------------------------------------
// /設定経費 実行時: 設定パネル送信/更新
//   （コマンド側で先に deferReply 済み想定）
// ----------------------------------------------------
async function postKeihiSettingPanel(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;

  let keihiConfig = (await loadKeihiConfig(guildId)) || {};
  keihiConfig = migrateConfigFormat(keihiConfig);

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

      // configPanel に統一して保存
      keihiConfig.configPanel = {
        channelId: panelInfo.channelId,
        messageId: panelInfo.messageId,
      };

      // 旧フォーマット削除
      if (keihiConfig.panelMap) {
        delete keihiConfig.panelMap;
        delete keihiConfig.panelMessageMap;
        logger.info('[keihi/setting/panel] 新フォーマットへの移行完了');
      }

      await saveKeihiConfig(guildId, keihiConfig);

      await interaction.editReply({
        content: '経費設定パネルを更新しました。',
      });
      return;
    } catch (err) {
      logger.warn(
        '[keihi/setting/panel] 既存パネル更新失敗 → 新規送信へフォールバック',
        err,
      );
      // → 下で「新規送信」にフォールバック
    }
  }

  // 既存がない or 取得失敗 → 新しく現在のチャンネルに送信
  const sent = await interaction.channel.send(payload);

  keihiConfig.configPanel = {
    channelId: sent.channelId,
    messageId: sent.id,
  };

  // 旧フォーマット削除
  if (keihiConfig.panelMap) {
    delete keihiConfig.panelMap;
    delete keihiConfig.panelMessageMap;
    logger.info('[keihi/setting/panel] 新フォーマットへの移行完了');
  }

  await saveKeihiConfig(guildId, keihiConfig);

  await interaction.editReply({
    content: '経費設定パネルを新規に設置しました。',
  });
}

// ----------------------------------------------------
// 店舗ごとの経費申請パネルを送信
// ----------------------------------------------------
/**
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} storeId
 */
async function sendKeihiPanel(channel, storeId) {
  const guild = channel.guild;
  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guild.id),
    loadStoreRoleConfig(guild.id).catch(() => null),
  ]);

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const panelConfig = keihiConfig.panels?.[storeId] || {};

  const embed = new EmbedBuilder()
    .setTitle(`💸 経費申請パネル：${storeName}`)
    .setDescription('下のボタンから経費を申請してください。')
    .setColor(0x54a0ff);

  // 経費項目
  const items = panelConfig.items || [];
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

  // 役職IDをメンションに変換
  const rolesToMentions = (roleIds = []) => {
    if (!roleIds.length) return '未設定';
    return roleIds.map((id) => `<@&${id}>`).join(' ');
  };

  embed.addFields(
    {
      name: 'スレッド閲覧役職',
      value: rolesToMentions(panelConfig.viewRoleIds),
    },
    {
      name: '経費申請役職',
      value: rolesToMentions(panelConfig.requestRoleIds),
    },
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_request:btn:request:${storeId}`)
      .setLabel('経費申請')
      .setStyle(ButtonStyle.Primary),
  );

  return channel.send({ embeds: [embed], components: [row] });
}

module.exports = {
  resolveStoreName,
  buildKeihiSettingPanelPayload,
  refreshKeihiSettingPanelMessage,
  postKeihiSettingPanel,
  sendKeihiPanel,
};
