// src/modules/uriage/setting/panel.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const Theme = require('../../../utils/ui/Theme');
const { URIAGE_SETTING_PANEL_SCHEMA } = require('./panelSchema');
const { PanelBuilder } = require('../../../utils/ui/PanelBuilder');
const logger = require('../../../utils/logger');
const service = require('../UriageService');
const repo = require('../UriageRepository');
const { sendCommandLog } = require('../../../utils/config/configLogger');
const { IDS } = require('./ids');

async function buildUriageSettingPanelPayload(guild, uriageConfig) {
  const guildId = guild.id;
  const { storeRoleConfig } = await service.prepareSettingPanelData(guild);

  const panels = uriageConfig.panels || {};
  const panelLines = [];

  for (const [storeId, panel] of Object.entries(panels)) {
    if (!panel?.channelId) continue;
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

  const dataMap = {
    panels: panelLines.length > 0 ? panelLines.join('\n') : '未設置',
    approvers: approverLines || '未設定',
    csv: csvValue
  };

  const embedFields = URIAGE_SETTING_PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback
  }));

  const builder = new PanelBuilder()
    .setTitle(URIAGE_SETTING_PANEL_SCHEMA.title)
    .setDescription(URIAGE_SETTING_PANEL_SCHEMA.description)
    .setColor(Theme.COLORS.BRAND)
    .addFields(embedFields);

  const bConfig = URIAGE_SETTING_PANEL_SCHEMA.buttons;
  if (bConfig) {
    if (Array.isArray(bConfig[0])) {
      bConfig.forEach(row => builder.addButtons(row));
    } else {
      builder.addButtons(bConfig);
    }
  }

  return builder.toJSON();
}

async function postUriageSettingPanel(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const guild = interaction.guild;
  let uriageConfig = await repo.getGlobalConfig(guild.id);
  const payload = await buildUriageSettingPanelPayload(guild, uriageConfig);

  const panelInfo = uriageConfig.configPanel || {};

  if (panelInfo.channelId && panelInfo.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(panelInfo.messageId);
        await message.edit(payload);
        await interaction.editReply({ content: '✅ 売上設定パネルを更新しました。' });
        return;
      }
    } catch (err) {
      logger.warn('[UriageSetting] 既存パネル更新失敗', err);
    }
  }

  const sent = await interaction.channel.send(payload);
  uriageConfig.configPanel = { channelId: sent.channelId, messageId: sent.id };
  await repo.save(guild.id, uriageConfig);

  await interaction.editReply({ content: '✅ 売上設定パネルを送信しました。' });
}

async function refreshUriageSettingPanelMessage(guild, uriageConfig) {
  const panelInfo = uriageConfig.configPanel;
  if (!panelInfo?.channelId || !panelInfo?.messageId) return;
  const channel = await guild.channels.fetch(panelInfo.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  const payload = await buildUriageSettingPanelPayload(guild, uriageConfig);
  const message = await channel.messages.fetch(panelInfo.messageId).catch(() => null);
  if (message) await message.edit(payload).catch(() => { });
}

async function sendUriagePanel(channel, storeId) {
  const guild = channel.guild;
  const [uriageConfig, storeConfig, { storeRoleConfig }] = await Promise.all([
    repo.getGlobalConfig(guild.id),
    repo.getStoreConfig(guild.id, storeId),
    service.prepareSettingPanelData(guild),
  ]);

  const storeName = storeRoleConfig?.stores?.find(s => String(s.id ?? s.storeId) === String(storeId))?.name || storeId;

  const builder = new PanelBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .setColor(Theme.COLORS.BRAND)
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
    .setFooter({ text: '売上管理システム' });

  builder.addButtons([
    { id: `uriage_report:btn:view_roles:${storeId}`, label: '閲覧役職', style: ButtonStyle.Secondary },
    { id: `uriage_report:btn:request_roles:${storeId}`, label: '申請役職', style: ButtonStyle.Secondary }
  ]);
  builder.addButtons([
    { id: `uriage_report:btn:report:${storeId}`, label: '売上報告', style: ButtonStyle.Primary }
  ]);

  const payload = builder.toJSON();
  const sent = await channel.send(payload);

  storeConfig.channelId = sent.channelId;
  storeConfig.messageId = sent.id;
  await repo.save(guild.id, storeConfig, storeId);

  if (!uriageConfig.panels) uriageConfig.panels = {};
  uriageConfig.panels[storeId] = { channelId: sent.channelId, messageId: sent.id };
  await repo.save(guild.id, uriageConfig);

  return sent;
}

async function refreshUriageReportPanelMessage(guild, storeId) {
  const [storeConfig, { storeRoleConfig }] = await Promise.all([
    repo.getStoreConfig(guild.id, storeId),
    service.prepareSettingPanelData(guild),
  ]);

  if (!storeConfig?.channelId || !storeConfig?.messageId) return false;
  const storeName = storeRoleConfig?.stores?.find(s => String(s.id ?? s.storeId) === String(storeId))?.name || storeId;

  const builder = new PanelBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .setColor(Theme.COLORS.BRAND)
    .addFields([
      { name: '閲覧役職', value: service.resolveApproverMention(guild, storeRoleConfig, { approverPositionIds: storeConfig.viewRoleIds || [] }), inline: false },
      { name: '申請役職', value: service.resolveApproverMention(guild, storeRoleConfig, { approverPositionIds: storeConfig.requestRoleIds || [] }), inline: false },
    ])
    .setFooter({ text: '売上管理システム' });

  builder.addButtons([
    { id: `uriage_report:btn:view_roles:${storeId}`, label: '閲覧役職', style: ButtonStyle.Secondary },
    { id: `uriage_report:btn:request_roles:${storeId}`, label: '申請役職', style: ButtonStyle.Secondary },
  ]);
  builder.addButtons([
    { id: `uriage_report:btn:report:${storeId}`, label: '売上報告', style: ButtonStyle.Primary },
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
