// src/handlers/uriage/setting/panel.js
// ----------------------------------------------------
// 売上設定パネル ＋ 売上報告パネル送信
//   - /設定売上 から呼び出して、売上設定パネルを新規送信 or 更新
//   - 設定パネルには：
//       ・売上報告パネル一覧（店舗名：チャンネルリンク＋パネルリンク）
//       ・承認役職（役職名：@紐づいているロール の形式）
//       ・売上CSV出力の最終更新
//   - 店舗ごとの売上報告パネル送信もここでまとめて実装
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const logger = require('../../../utils/logger');
const {
  loadUriageConfig,
  saveUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendCommandLog } = require('../../../utils/config/configLogger');
const getBotFooter = require('../../common/utils/embed/getBotFooter');
const { IDS } = require('./ids');

// ----------------------------------------------------
// 役職キー/ロールID を「役職名：@メンションロール」形式に整形
//   - positionRoles: { positionId: [roleId, ...] }
//   - roles: [{ id, name }, ...] から役職名を解決
//   - id が positionRoles に無い場合は Discord ロールIDとして扱う
// ----------------------------------------------------
function describePositions(ids = [], roles = [], positionRoles = {}, guild) {
  if (!ids.length) return '未設定';

  return ids
    .map(id => {
      const positionName =
        roles.find(r => String(r.id) === String(id))?.name || String(id);

      const rawRoleIds = positionRoles[id] || positionRoles[String(id)] || [];
      const roleIds = Array.isArray(rawRoleIds)
        ? rawRoleIds
        : rawRoleIds
          ? [rawRoleIds]
          : [];

      const mention =
        roleIds.length > 0
          ? roleIds
            .map(rid => {
              const role = guild.roles.cache.get(rid);
              return role ? `<@&${role.id}>` : `ロールID: ${rid}`;
            })
            .join(' ')
          : (() => {
            const role = guild.roles.cache.get(id);
            return role ? `<@&${role.id}>` : 'ロール未設定';
          })();

      return `${positionName}：${mention}`;
    })
    .join('\n');
}

function buildSettingButtonsRow1() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_SET_PANEL)
      .setLabel('売上報告パネル設置')
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
      .setLabel('売上CSV発行')
      .setStyle(ButtonStyle.Success),
  );
}

function resolveStoreName(storeRoleConfig, storeId) {
  if (!storeRoleConfig) return storeId;
  const raw = storeRoleConfig.stores ?? storeRoleConfig;

  if (Array.isArray(raw)) {
    const byId = raw.find(
      s => s && String(s.id ?? s.storeId) === String(storeId),
    );
    if (byId) return byId.name ?? byId.storeName ?? storeId;

    const byIndex = raw[Number(storeId)];
    if (typeof byIndex === 'string') return byIndex;
    return byIndex?.name ?? byIndex?.storeName ?? storeId;
  }

  if (raw && typeof raw === 'object') {
    return raw[storeId]?.name ?? raw[storeId]?.storeName ?? storeId;
  }

  return storeId;
}

/**
 * 役職IDに紐づくロール配列を positionRoles から取得してメンション文字列にする
 */
function roleMentionsFromPosition(positionId, positionRoles, guild) {
  const roleIdsRaw =
    positionRoles?.[positionId] || positionRoles?.[String(positionId)] || [];
  const roleIds = Array.isArray(roleIdsRaw) ? roleIdsRaw : roleIdsRaw ? [roleIdsRaw] : [];

  if (!roleIds.length) return 'ロール未設定';

  return roleIds
    .map(rid => {
      const role = guild.roles.cache.get(rid);
      return role ? `<@&${role.id}>` : `ロールID: ${rid}`;
    })
    .join(' ');
}

/**
 * 役職ID→役職名の逆引き（storeRoleConfig.roles を参照）
 */
function positionIdToName(positionId, roles) {
  return roles.find(r => String(r.id) === String(positionId))?.name || positionId;
}

async function buildUriageSettingPanelPayload(guild, uriageConfig) {
  const guildId = guild.id;

  let storeRoleConfig = null;
  try {
    storeRoleConfig = await loadStoreRoleConfig(guildId);
  } catch (err) {
    logger.warn(
      '[uriage/setting/panel] 店舗_役職_ロール の読み込みに失敗しました',
      err,
    );
  }

  const roles = storeRoleConfig?.roles || [];
  const positionRoles =
    storeRoleConfig?.positionRoles ||
    storeRoleConfig?.positionRoleMap ||
    {};

  // 売上報告パネル一覧
  const panels = uriageConfig.panels || {};
  const panelLines = [];

  for (const [storeId, panel] of Object.entries(panels)) {
    if (!panel?.channelId) continue;

    const storeName = resolveStoreName(storeRoleConfig, storeId);
    const channelMention = `<#${panel.channelId}>`;

    let line = `・${storeName}：${channelMention}`;
    if (panel.messageId) {
      const url = `https://discord.com/channels/${guildId}/${panel.channelId}/${panel.messageId}`;
      line += ` パネル`;
    }
    panelLines.push(line);
  }

  // 承認役職（役職ID → 紐づけロール）
  const approverPositionIds = uriageConfig.approverPositionIds || [];
  const legacyApproverRoleIds = uriageConfig.approverRoleIds || []; // 旧形式フォールバック

  let approverLines = '未設定';

  if (approverPositionIds.length) {
    approverLines = approverPositionIds
      .map(posId => {
        const name = positionIdToName(posId, roles);
        const mention = roleMentionsFromPosition(posId, positionRoles, guild);
        return `${name}：${mention}`;
      })
      .join('\n');
  } else if (legacyApproverRoleIds.length) {
    approverLines = legacyApproverRoleIds
      .map(id => {
        const role = guild.roles.cache.get(id);
        const name = role?.name || '役職';
        const mention = role ? `<@&${role.id}>` : `ロールID: ${id}`;
        return `${name}：${mention}`;
      })
      .join('\n');
  }

  const csvUpdatedAt = uriageConfig.csvUpdatedAt
    ? `<t:${Math.floor(new Date(uriageConfig.csvUpdatedAt).getTime() / 1000)}:f>`
    : '未集計';

  const embed = new EmbedBuilder()
    .setTitle('売上設定パネル')
    .setColor(0x2ecc71)
    .addFields(
      {
        name: '売上報告パネル一覧',
        value: panelLines.length
          ? panelLines.join('\n')
          : '未設置\n「売上報告パネル設置」ボタンからパネルを作成してください。',
      },
      {
        name: '承認役職',
        value: approverLines || '未設定',
      },
      {
        name: '売上CSV出力',
        value: `最新更新：${csvUpdatedAt}\n※「売上CSV発行」ボタンから生成できます。`,
      },
    )
    .setTimestamp(new Date());

  const row1 = buildSettingButtonsRow1();
  const row2 = buildSettingButtonsRow2();

  return { embeds: [embed], components: [row1, row2] };
}

async function postUriageSettingPanel(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  let uriageConfig = await loadUriageConfig(guildId);
  const payload = await buildUriageSettingPanelPayload(guild, uriageConfig);

  const panelInfo = uriageConfig.configPanel;

  if (panelInfo?.channelId && panelInfo?.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (!channel || !channel.isTextBased())
        throw new Error('panel channel not found');

      const message = await channel.messages.fetch(panelInfo.messageId);
      await message.edit(payload);

      await interaction.editReply({
        content: '売上設定パネルを更新しました。',
      });
      await sendCommandLog(interaction, {
        title: '売上設定パネル更新',
        description: '売上設定パネルを既存メッセージに対して更新しました。',
      }).catch(() => { });
      return;
    } catch (err) {
      logger.warn(
        '[uriage/setting/panel] 既存の設定パネル更新に失敗したため、新規送信します',
        err,
      );
    }
  }

  const sent = await interaction.channel.send(payload);
  uriageConfig.configPanel = { channelId: sent.channelId, messageId: sent.id };
  await saveUriageConfig(guildId, uriageConfig);

  await interaction.editReply({
    content: '売上設定パネルを送信しました。',
  });
  await sendCommandLog(interaction, {
    title: '売上設定パネル作成',
    description: '売上設定パネルを新規送信しました。',
  }).catch(() => { });
}

async function refreshUriageSettingPanelMessage(guild, uriageConfig) {
  const panelInfo = uriageConfig.configPanel;
  if (!panelInfo?.channelId || !panelInfo?.messageId) return;

  const channel = await guild.channels
    .fetch(panelInfo.channelId)
    .catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const payload = await buildUriageSettingPanelPayload(guild, uriageConfig);
  const message = await channel.messages
    .fetch(panelInfo.messageId)
    .catch(() => null);
  if (message) {
    await message.edit(payload).catch(() => { });
  }
}

/**
 * 店舗別「売上報告パネル」を送信
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} storeId
 */
async function sendUriagePanel(channel, storeId) {
  const guild = channel.guild;
  const guildId = guild.id;

  const [uriageConfig, storeConfig, storeRoleConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadUriageStoreConfig(guildId, storeId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const roles = storeRoleConfig?.roles || [];
  const positionRoles =
    storeRoleConfig?.positionRoles ||
    storeRoleConfig?.positionRoleMap ||
    {};

  // viewRoleIds/requestRoleIds には「役職ID」または「ロールID」が入っている想定
  const mentionPositions = (ids = []) => {
    if (!ids || !ids.length) return '未設定';

    return ids
      .map(posId => {
        // 役職として解決
        const positionName = roles.find(r => String(r.id) === String(posId))?.name;
        const roleIdsRaw =
          positionRoles[posId] || positionRoles[String(posId)] || [];
        const roleIds = Array.isArray(roleIdsRaw) ? roleIdsRaw : roleIdsRaw ? [roleIdsRaw] : [];

        if (positionName || roleIds.length) {
          const mention =
            roleIds.length > 0
              ? roleIds
                .map(rid => {
                  const role = guild.roles.cache.get(rid);
                  return role ? `<@&${role.id}>` : `ロールID: ${rid}`;
                })
                .join(' ')
              : 'ロール未設定';
          return `${positionName || posId}：${mention}`;
        }

        // ロールIDとして扱うフォールバック
        const role = guild.roles.cache.get(posId);
        const name = role?.name || `ロールID: ${posId}`;
        const mention = role ? `<@&${role.id}>` : `ロールID: ${posId}`;
        return `${name}：${mention}`;
      })
      .join('\n');
  };

  const embed = new EmbedBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .setColor(0x54a0ff)
    .addFields(
      {
        name: '閲覧役職',
        value: mentionPositions(storeConfig.viewRoleIds),
        inline: false,
      },
      {
        name: '申請役職',
        value: mentionPositions(storeConfig.requestRoleIds),
        inline: false,
      },
    );
  embed.setFooter(getBotFooter(channel)).setTimestamp();

  const rolesRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`uriage_report:btn:view_roles:${storeId}`)
      .setLabel('閲覧役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`uriage_report:btn:request_roles:${storeId}`)
      .setLabel('申請役職')
      .setStyle(ButtonStyle.Secondary),
  );

  const reportRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`uriage_report:btn:report:${storeId}`)
      .setLabel('売上報告')
      .setStyle(ButtonStyle.Primary),
  );

  const sent = await channel.send({
    embeds: [embed],
    components: [rolesRow, reportRow],
  });

  storeConfig.channelId = sent.channelId;
  storeConfig.messageId = sent.id;
  await saveUriageStoreConfig(guildId, storeId, storeConfig);

  if (!uriageConfig.panels) uriageConfig.panels = {};
  uriageConfig.panels[storeId] = {
    channelId: sent.channelId,
    messageId: sent.id,
  };
  await saveUriageConfig(guildId, uriageConfig);

  return sent;
}

/**
 * 既存の売上報告パネルを最新の設定で更新する
 * @param {import('discord.js').Guild} guild
 * @param {string} storeId
 */
async function refreshUriageReportPanelMessage(guild, storeId) {
  const guildId = guild.id;

  const [storeConfig, storeRoleConfig] = await Promise.all([
    loadUriageStoreConfig(guildId, storeId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  if (!storeConfig?.channelId || !storeConfig?.messageId) return false;

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const roles = storeRoleConfig?.roles || [];
  const positionRoles =
    storeRoleConfig?.positionRoles ||
    storeRoleConfig?.positionRoleMap ||
    {};

  const mentionPositions = (ids = []) => {
    if (!ids || !ids.length) return '未設定';
    return ids
      .map(posId => {
        const positionName = roles.find(r => String(r.id) === String(posId))?.name;
        const roleIdsRaw = positionRoles[posId] || positionRoles[String(posId)] || [];
        const roleIds = Array.isArray(roleIdsRaw) ? roleIdsRaw : roleIdsRaw ? [roleIdsRaw] : [];

        if (positionName || roleIds.length) {
          const mention =
            roleIds.length > 0
              ? roleIds
                .map(rid => (guild.roles.cache.get(rid) ? `<@&${rid}>` : `ロールID: ${rid}`))
                .join(' ')
              : 'ロール未設定';
          return `${positionName || posId}：${mention}`;
        }

        const role = guild.roles.cache.get(posId);
        const name = role?.name || `ロールID: ${posId}`;
        const mention = role ? `<@&${role.id}>` : `ロールID: ${posId}`;
        return `${name}：${mention}`;
      })
      .join('\n');
  };

  const embed = new EmbedBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .setColor(0x54a0ff)
    .addFields(
      { name: '閲覧役職', value: mentionPositions(storeConfig.viewRoleIds), inline: false },
      { name: '申請役職', value: mentionPositions(storeConfig.requestRoleIds), inline: false },
    );
  embed.setFooter(getBotFooter(guild)).setTimestamp();

  const rolesRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`uriage_report:btn:view_roles:${storeId}`).setLabel('閲覧役職').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`uriage_report:btn:request_roles:${storeId}`).setLabel('申請役職').setStyle(ButtonStyle.Secondary),
  );

  const reportRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`uriage_report:btn:report:${storeId}`).setLabel('売上報告').setStyle(ButtonStyle.Primary),
  );

  const channel = await guild.channels.fetch(storeConfig.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const message = await channel.messages.fetch(storeConfig.messageId).catch(() => null);
  if (!message) return false;

  await message.edit({ embeds: [embed], components: [rolesRow, reportRow] });
  return true;
}

module.exports = {
  resolveStoreName,
  buildUriageSettingPanelPayload,
  postUriageSettingPanel,
  refreshUriageSettingPanelMessage,
  sendUriagePanel,
  refreshUriageReportPanelMessage,
};
