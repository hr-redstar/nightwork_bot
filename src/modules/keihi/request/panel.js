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
const { resolveStoreName } = require('../setting/storeNameResolver');

// ✅ 色統一（申請/修正=青、承認=緑、削除=赤）
const COLORS = {
  BLUE: 0x5865F2,
  GREEN: 0x57F287,
  RED: 0xED4245,
};

/**
 * positionIds と storeRoleConfig からロールID配列を作る共通処理
 * @param {any} storeRoleConfig
 * @param {string[]} positionIds
 * @returns {string[]} roleIds
 */
function resolveRoleIdsFromPositions(storeRoleConfig, positionIds) {
  if (!storeRoleConfig || !Array.isArray(positionIds)) return [];

  const positionRoles =
    storeRoleConfig.positionRoles ||
    storeRoleConfig.positionRoleMap ||
    {};

  const roleIds = positionIds.flatMap((posId) => {
    const raw = positionRoles[posId];
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  });

  return [...new Set(roleIds.filter(Boolean))];
}

/**
 * 役職IDから役職名を取得
 * @param {any} storeRoleConfig
 * @param {string} positionId
 * @returns {string}
 */
function getPositionName(storeRoleConfig, positionId) {
  if (!storeRoleConfig || !positionId) return `ID: ${positionId}`;

  const positions = storeRoleConfig.roles || storeRoleConfig.positions || [];
  if (!Array.isArray(positions)) return `ID: ${positionId}`;

  const pos = positions.find(
    (p) => String(p?.id ?? p?.positionId ?? p?.position) === String(positionId),
  );

  return pos?.name || pos?.label || `ID: ${positionId}`;
}

/**
 * 役職：メンションロール 表記にする（仕様）
 * - positionIds がある場合: 役職名: @role
 * - 無い場合: @role を並べる
 */
function formatRoleLines(storeRoleConfig, positionIds, roleIds) {
  // positionId が無い場合はロールIDをそのまま表示
  if (!positionIds || !positionIds.length) {
    return roleIds && roleIds.length
      ? roleIds.map((id) => `役職：<@&${id}>`).join('\n')
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

      return `${posName}：${mention}`;
    })
    .join('\n');
}

/**
 * 店舗ごとの経費申請パネル Embed を構築
 * @param {import('discord.js').Guild} guild
 * @param {string} storeKey  keihiConfig.panels のキー（店舗名運用でもID運用でもOK）
 * @param {any} keihiConfig
 * @param {any} storeRoleConfig
 */
function buildStorePanelEmbed(guild, storeKey, keihiConfig, storeRoleConfig) {
  const storeName = resolveStoreName(storeRoleConfig, storeKey);
  const panelConfig = keihiConfig.panels?.[storeKey] || {};

  // positionIds → roleIds に解決
  const viewRoleIds = resolveRoleIdsFromPositions(
    storeRoleConfig,
    panelConfig.viewRolePositionIds,
  );
  const requestRoleIds = resolveRoleIdsFromPositions(
    storeRoleConfig,
    panelConfig.requestRolePositionIds,
  );

  // 経費項目整形
  const items = panelConfig.items || [];
  const itemLines = items.map((item) => {
    let text;
    if (typeof item === 'string') {
      text = item;
    } else if (item && typeof item === 'object' && item.name) {
      text = item.price != null ? `${item.name}（${item.price}円）` : `${item.name}`;
    } else {
      text = String(item);
    }
    const trimmed = String(text).trimStart();
    return trimmed.startsWith('・') ? trimmed : `・${trimmed}`;
  });

  return new EmbedBuilder()
    .setTitle(`💸 経費申請パネル　${storeName}`)
    .setColor(COLORS.BLUE) // ✅ パネルは青
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
}

/**
 * 店舗別経費申請パネルを「削除→再送信」して最新化
 * @param {import('discord.js').Guild} guild
 * @param {string} storeKey
 * @param {any} keihiConfig
 * @param {any} storeRoleConfig
 * @returns {Promise<import('discord.js').Message | null>}
 */
async function upsertStorePanelMessage(guild, storeKey, keihiConfig, storeRoleConfig) {
  const panelConfig = keihiConfig.panels?.[storeKey];
  if (!panelConfig?.channelId) return null;

  try {
    const channel = await guild.channels.fetch(panelConfig.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return null;

    const embed = buildStorePanelEmbed(guild, storeKey, keihiConfig, storeRoleConfig);

    // ✅ 仕様：1列目：経費項目登録 / 閲覧役職 / 申請役職
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.ITEM_CONFIG}:${storeKey}`)
        .setLabel('経費項目登録')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.VIEW_ROLES}:${storeKey}`)
        .setLabel('閲覧役職')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.REQUEST_ROLES}:${storeKey}`)
        .setLabel('申請役職')
        .setStyle(ButtonStyle.Secondary),
    );

    // ✅ 仕様：2列目：経費申請
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.REQUEST}:${storeKey}`)
        .setLabel('経費申請')
        .setStyle(ButtonStyle.Primary),
    );

    const payload = { embeds: [embed], components: [row1, row2] };

    // 既存があれば削除（Botメッセージのみ）
    if (panelConfig.messageId) {
      const old = await channel.messages.fetch(panelConfig.messageId).catch(() => null);
      if (old && old.author?.id === guild.client.user.id && old.deletable) {
        await old.delete().catch((e) => logger.warn('[keihi/request/panel] delete old failed', e));
      }
    }

    const sent = await channel.send(payload);
    keihiConfig.panels[storeKey].messageId = sent.id;
    return sent;
  } catch (err) {
    logger.error(`[keihi/request/panel] 店舗キー ${storeKey} のパネル更新失敗`, err);
    return null;
  }
}

module.exports = {
  buildStorePanelEmbed,
  upsertStorePanelMessage,
  COLORS,
};
