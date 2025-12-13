// src/handlers/keihi/request/panel.js
// ----------------------------------------------------
// 経費「申請パネル」の Embed 構築とメッセージ更新
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { IDS: KEIHI_IDS } = require('./ids');

/**
 * setting/panel の resolveStoreName を安全に呼び出すヘルパー
 * （循環 require 対策として遅延 require）
 * @param {any} storeRoleConfig
 * @param {string} storeId
 * @returns {string}
 */
function resolveStoreNameSafe(storeRoleConfig, storeId) {
  try {
    // ★ ここで初めて require する（module cache が効くので負荷は小さい）
    const settingPanel = require('../setting/panel');
    if (
      settingPanel &&
      typeof settingPanel.resolveStoreNameSafe === 'function'
    ) {
      return settingPanel.resolveStoreNameSafe(storeRoleConfig, storeId);
    }
  } catch (err) {
    // ここでコケても storeId をそのまま返せば致命傷にはならない
    logger.warn('[keihi/request/panel] resolveStoreNameSafe での読み込みに失敗', err);
  }
  return storeId;
}

/**
 * positionIds と storeRoleConfig からロールID配列を作る共通処理
 * @param {any} storeRoleConfig
 * @param {string[]} positionIds
 * @returns {string[]} roleIds
 */
function resolveRoleIdsFromPositions(storeRoleConfig, positionIds) {
  if (!storeRoleConfig || !Array.isArray(positionIds)) return [];

  const positionRoles =
    storeRoleConfig.positionRoles || storeRoleConfig.positionRoleMap || {};

  const roleIds = positionIds.flatMap((posId) => {
    const raw = positionRoles[posId];
    if (!raw) return [];
    // 配列でも単体でも対応
    return Array.isArray(raw) ? raw : [raw];
  });

  return [...new Set(roleIds.filter(Boolean))];
}

/**
 * 役職IDから役職名を取得するヘルパー
 * @param {any} storeRoleConfig
 * @param {string} positionId
 * @returns {string}
 */
function getPositionName(storeRoleConfig, positionId) {
  if (!storeRoleConfig || !positionId) return `ID: ${positionId}`;
  const positions = storeRoleConfig.roles || [];
  const pos = positions.find(
    (p) => String(p.id ?? p.positionId) === String(positionId),
  );
  return pos?.name || `ID: ${positionId}`;
}

/**
 * 役職IDとロールIDから表示用の文字列を生成する
 * @param {any} storeRoleConfig
 * @param {string[]} positionIds
 * @param {string[]} roleIds
 * @returns {string}
 */
function formatRoleLines(storeRoleConfig, positionIds, roleIds) {
  // positionId が無い場合は、単純にロールIDを列挙
  if (!positionIds || !positionIds.length) {
    return roleIds && roleIds.length > 0
      ? roleIds.map((id) => `<@&${id}>`).join(' ')
      : '未設定';
  }

  const positionRoles =
    (storeRoleConfig &&
      (storeRoleConfig.positionRoles || storeRoleConfig.positionRoleMap)) ||
    {};

  return positionIds
    .map((posId) => {
      const raw = positionRoles[posId];
      const roleIdList = Array.isArray(raw)
        ? raw
        : raw
        ? [raw]
        : [];

      const posName = getPositionName(storeRoleConfig, posId);
      const mention =
        roleIdList.length > 0
          ? roleIdList.map((id) => `<@&${id}>`).join(' ')
          : '未紐付';

      // 例）店長: @管理者 @副管理者
      return `${posName}: ${mention}`;
    })
    .join('\n');
}

/**
 * 店舗ごとの経費申請パネルの Embed を構築する
 * @param {import('discord.js').Guild} guild
 * @param {string} storeId
 * @param {any} keihiConfig
 * @param {any} storeRoleConfig
 */
function buildStorePanelEmbed(guild, storeId, keihiConfig, storeRoleConfig) {
  const storeName = resolveStoreNameSafe(storeRoleConfig, storeId);

  const panelConfig = keihiConfig.panels?.[storeId] || {};

  // positionIds から roleIds を解決
  const viewRoleIds = resolveRoleIdsFromPositions(
    storeRoleConfig,
    panelConfig.viewRolePositionIds,
  );
  const requestRoleIds = resolveRoleIdsFromPositions(
    storeRoleConfig,
    panelConfig.requestRolePositionIds,
  );

  const items = panelConfig.items || [];

  const itemLines = items.map((item) => {
    let text;
    if (typeof item === 'string') {
      text = item;
    } else if (item && typeof item === 'object' && item.name) {
      text =
        item.price != null
          ? `${item.name}（${item.price}円）`
          : `${item.name}`;
    } else {
      text = String(item);
    }
    const trimmed = text.trimStart();
    if (trimmed.startsWith('・')) return trimmed;
    return `・${trimmed}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`💸 経費申請パネル　${storeName}`)
    .setColor(0x5865f2)
    .addFields(
      {
        name: '👁️ スレッド閲覧役職',
        value: formatRoleLines(
          storeRoleConfig,
          panelConfig.viewRolePositionIds,
          viewRoleIds,
        ),
      },
      {
        name: '📝 申請役職',
        value: formatRoleLines(
          storeRoleConfig,
          panelConfig.requestRolePositionIds,
          requestRoleIds,
        ),
      },
      {
        name: '📌 経費項目',
        value:
          itemLines.length > 0
            ? itemLines.join('\n')
            : '未設定（まず「経費項目登録」を行ってください）',
      },
    )
    .setTimestamp()
    .setFooter({
      text: guild.client.user.username,
      iconURL: guild.client.user.displayAvatarURL(),
    });

  return embed;
}

/**
 * 店舗別経費申請パネルを設置/更新する
 * @param {import('discord.js').Guild} guild
 * @param {string} storeId
 * @param {any} keihiConfig
 * @param {any} storeRoleConfig
 * @returns {Promise<import('discord.js').Message | null>}
 */
async function upsertStorePanelMessage(
  guild,
  storeId,
  keihiConfig,
  storeRoleConfig,
) {
  const panelConfig = keihiConfig.panels?.[storeId];
  if (!panelConfig?.channelId) return null;

  try {
    const channel = await guild.channels.fetch(panelConfig.channelId);
    if (!channel || !channel.isTextBased()) return null;

    const embed = buildStorePanelEmbed(
      guild,
      storeId,
      keihiConfig,
      storeRoleConfig,
    );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.ITEM_CONFIG}:${storeId}`,
        )
        .setLabel('経費項目登録')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(
          `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.VIEW_ROLES}:${storeId}`,
        )
        .setLabel('閲覧役職')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(
          `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.REQUEST_ROLES}:${storeId}`,
        )
        .setLabel('申請役職')
        .setStyle(ButtonStyle.Secondary),
    );
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.REQUEST}:${storeId}`,
        )
        .setLabel('経費申請')
        .setStyle(ButtonStyle.Primary),
    );
    
    const messagePayload = {
      embeds: [embed],
      components: [row1, row2],
    };
    
    let sentMessage;
    
    // 既存のメッセージIDがあれば、それを編集する
    if (panelConfig.messageId) {
      try {
        const oldMessage = await channel.messages.fetch(panelConfig.messageId, {
          force: true, // キャッシュを無視してAPIから直接取得
        });
        sentMessage = await oldMessage.edit(messagePayload);
      } catch (err) {
        // メッセージが見つからない(10008)場合は、新規送信にフォールバック
        if (err.code !== 10008) { // Unknown Message
          logger.warn(`[keihi/request/panel] パネル (ID: ${panelConfig.messageId}) の編集に失敗、新規投稿を試みます`, err);
        } 
        sentMessage = await channel.send(messagePayload);
      }
    } else {
      // 既存メッセージがなければ新規送信
      sentMessage = await channel.send(messagePayload);
    }
    
    // ここで config を更新（保存は呼び出し側）
    if (!keihiConfig.panels) keihiConfig.panels = {};
    if (!keihiConfig.panels[storeId]) {
      keihiConfig.panels[storeId] = {};
    }
    keihiConfig.panels[storeId].messageId = sentMessage.id;

    return sentMessage;
  } catch (err) {
    logger.error(
      `[keihi/request/panel] 店舗ID ${storeId} のパネル更新失敗`,
      err,
    );
    return null;
  }
}

module.exports = {
  buildStorePanelEmbed,
  upsertStorePanelMessage,
  resolveStoreNameSafe, // エクスポートに追加
};
