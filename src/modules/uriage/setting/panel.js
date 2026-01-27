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
const { URIAGE_SETTING_PANEL_SCHEMA } = require('./panelSchema');
const { PanelBuilder } = require('../../../utils/ui/PanelBuilder');
const logger = require('../../../utils/logger');
const service = require('../UriageService');
const repo = require('../UriageRepository');
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
async function buildUriageSettingPanelPayload(guild, uriageConfig) {
  const guildId = guild.id;
  const { storeRoleConfig } = await service.prepareSettingPanelData(guild);

  // 売上報告パネル一覧
  const panels = uriageConfig.panels || {};
  const panelLines = [];

  for (const [storeId, panel] of Object.entries(panels)) {
    if (!panel?.channelId) continue;

    // Helper: storeRoleConfig からの解決 (必要なら Service に移しても良いが、一旦シンプルに)
    const storeName = storeRoleConfig?.stores?.find(s => String(s.id ?? s.storeId) === String(storeId))?.name || storeId;
    const channelMention = `<#${panel.channelId}>`;

    let line = `・${storeName}：${channelMention}`;
    if (panel.messageId) {
      const url = `https://discord.com/channels/${guildId}/${panel.channelId}/${panel.messageId}`;
      line += ` [パネル](${url})`;
    }
    panelLines.push(line);
  }

  const approverLines = service.resolveApproverMention(guild, storeRoleConfig, uriageConfig);

  const csvUpdatedAt = uriageConfig.csvUpdatedAt
    ? `<t:${Math.floor(new Date(uriageConfig.csvUpdatedAt).getTime() / 1000)}:f>`
    : '未集計';
  const csvValue = `最新更新：${csvUpdatedAt}\n※「売上CSV発行」ボタンから生成できます。`;

  // Schema Mapping
  const dataMap = {
    panels: panelLines.length > 0
      ? panelLines.join('\n')
      : URIAGE_SETTING_PANEL_SCHEMA.fields.find(f => f.key === 'panels').fallback,
    approvers: approverLines || URIAGE_SETTING_PANEL_SCHEMA.fields.find(f => f.key === 'approvers').fallback,
    csv: csvValue
  };

  const embedFields = URIAGE_SETTING_PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback
  }));

  const builder = PanelBuilder.build({
    title: URIAGE_SETTING_PANEL_SCHEMA.title,
    description: URIAGE_SETTING_PANEL_SCHEMA.description,
    color: URIAGE_SETTING_PANEL_SCHEMA.color,
    fields: embedFields
  });

  if (URIAGE_SETTING_PANEL_SCHEMA.buttons) {
    if (Array.isArray(URIAGE_SETTING_PANEL_SCHEMA.buttons[0])) {
      URIAGE_SETTING_PANEL_SCHEMA.buttons.forEach(row => builder.addButtons(row));
    } else {
      builder.addButtons(URIAGE_SETTING_PANEL_SCHEMA.buttons);
    }
  }

  return builder.toJSON();
}

async function postUriageSettingPanel(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  let uriageConfig = await repo.getGlobalConfig(guildId);
  const payload = await buildUriageSettingPanelPayload(guild, uriageConfig);

  const panelInfo = uriageConfig.configPanel || {};

  if (panelInfo.channelId && panelInfo.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (channel && channel.isTextBased()) {
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
      }
    } catch (err) {
      logger.warn(
        '[uriage/setting/panel] 既存の設定パネル更新に失敗したため、新規送信します',
        err,
      );
    }
  }

  const sent = await interaction.channel.send(payload);
  uriageConfig.configPanel = { channelId: sent.channelId, messageId: sent.id };
  await repo.save(guildId, uriageConfig);

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

  const channel = await guild.channels.fetch(panelInfo.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const payload = await buildUriageSettingPanelPayload(guild, uriageConfig);
  const message = await channel.messages.fetch(panelInfo.messageId).catch(() => null);
  if (message) {
    await message.edit(payload).catch(() => { });
  }
}

/**
 * 店舗別「売上報告パネル」を送信
 */
async function sendUriagePanel(channel, storeId) {
  const guild = channel.guild;
  const guildId = guild.id;

  const [uriageConfig, storeConfig, { storeRoleConfig }] = await Promise.all([
    repo.getGlobalConfig(guildId),
    repo.getStoreConfig(guildId, storeId),
    service.prepareSettingPanelData(guild),
  ]);

  const storeName = storeRoleConfig?.stores?.find(s => String(s.id ?? s.storeId) === String(storeId))?.name || storeId;

  // PanelBuilder で構築
  const builder = new PanelBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .setColor(0x54a0ff)
    .addFields([
      {
        name: '閲覧役職',
        value: service.resolveApproverMention(guild, storeRoleConfig, { approverPositionIds: storeConfig.viewRoleIds || [] }),
        inline: false,
      },
      {
        name: '申請役職',
        value: service.resolveApproverMention(guild, storeRoleConfig, { approverPositionIds: storeConfig.requestRoleIds || [] }),
        inline: false,
      }
    ])
    .setFooter(getBotFooter(channel).text); // buildPanel と footer の扱いが少し違う点に注意

  builder.addButtons([
    {
      customId: `uriage_report:btn:view_roles:${storeId}`,
      label: '閲覧役職',
      style: ButtonStyle.Secondary,
    },
    {
      customId: `uriage_report:btn:request_roles:${storeId}`,
      label: '申請役職',
      style: ButtonStyle.Secondary,
    }
  ]);

  builder.addButtons([
    {
      customId: `uriage_report:btn:report:${storeId}`,
      label: '売上報告',
      style: ButtonStyle.Primary,
    }
  ]);

  const payload = builder.toJSON();
  const sent = await channel.send(payload);

  storeConfig.channelId = sent.channelId;
  storeConfig.messageId = sent.id;
  await repo.save(guildId, storeConfig, storeId);

  if (!uriageConfig.panels) uriageConfig.panels = {};
  uriageConfig.panels[storeId] = {
    channelId: sent.channelId,
    messageId: sent.id,
  };
  await repo.save(guildId, uriageConfig);

  return sent;
}

/**
 * 既存の売上報告パネルを最新の設定で更新する
 */
async function refreshUriageReportPanelMessage(guild, storeId) {
  const guildId = guild.id;

  const [storeConfig, { storeRoleConfig }] = await Promise.all([
    repo.getStoreConfig(guildId, storeId),
    service.prepareSettingPanelData(guild),
  ]);

  if (!storeConfig?.channelId || !storeConfig?.messageId) return false;

  const storeName = storeRoleConfig?.stores?.find(s => String(s.id ?? s.storeId) === String(storeId))?.name || storeId;

  // PanelBuilder で再構築
  const builder = new PanelBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .setColor(0x54a0ff)
    .addFields([
      { name: '閲覧役職', value: service.resolveApproverMention(guild, storeRoleConfig, { approverPositionIds: storeConfig.viewRoleIds || [] }), inline: false },
      { name: '申請役職', value: service.resolveApproverMention(guild, storeRoleConfig, { approverPositionIds: storeConfig.requestRoleIds || [] }), inline: false },
    ])
    .setFooter(getBotFooter(guild).text);

  builder.addButtons([
    { customId: `uriage_report:btn:view_roles:${storeId}`, label: '閲覧役職', style: ButtonStyle.Secondary },
    { customId: `uriage_report:btn:request_roles:${storeId}`, label: '申請役職', style: ButtonStyle.Secondary },
  ]);

  builder.addButtons([
    { customId: `uriage_report:btn:report:${storeId}`, label: '売上報告', style: ButtonStyle.Primary },
  ]);

  const channel = await guild.channels.fetch(storeConfig.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const message = await channel.messages.fetch(storeConfig.messageId).catch(() => null);
  if (!message) return false;

  await message.edit(builder.toJSON());
  return true;
}

module.exports = {
  buildUriageSettingPanelPayload,
  postUriageSettingPanel,
  refreshUriageSettingPanelMessage,
  sendUriagePanel,
  refreshUriageReportPanelMessage,
};
