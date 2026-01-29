const { ButtonStyle, MessageFlags } = require('discord.js');
const { PanelBuilder } = require('../../../utils/ui/PanelBuilder');
const Theme = require('../../../utils/ui/Theme');
const { KEIHI_SETTING_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../KeihiService');
const repo = require('../KeihiRepository');
const logger = require('../../../utils/logger');
const { resolveStoreName } = require('./storeNameResolver');

async function buildKeihiSettingPanelPayload(guild, keihiConfig) {
  const guildId = guild.id;
  const { storeRoleConfig } = await service.prepareSettingPanelData(guild);

  const panels = keihiConfig.panels || {};
  const panelLines = [];

  for (const [storeId, panel] of Object.entries(panels)) {
    if (!panel?.channelId) continue;
    const storeName = resolveStoreName(storeRoleConfig, storeId);
    const channelMention = `<#${panel.channelId}>`;
    let line = `・${storeName} ${channelMention}`;
    if (panel.messageId) {
      const url = `https://discord.com/channels/${guildId}/${panel.channelId}/${panel.messageId}`;
      line += ` [パネル](${url})`;
    }
    panelLines.push(line);
  }

  const panelFieldValue = panelLines.length > 0 ? panelLines.join('\n') : '未設置';
  const approverValue = service.describeApprovers(guild, storeRoleConfig, keihiConfig);

  const dataMap = {
    panels: panelFieldValue,
    approvers: approverValue || '未設定',
  };

  const embedFields = KEIHI_SETTING_PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback
  }));

  const builder = new PanelBuilder()
    .setTitle(KEIHI_SETTING_PANEL_SCHEMA.title)
    .setDescription(KEIHI_SETTING_PANEL_SCHEMA.description)
    .setColor(Theme.COLORS.BRAND)
    .addFields(embedFields);

  const buttons = Array.isArray(KEIHI_SETTING_PANEL_SCHEMA.buttons[0])
    ? KEIHI_SETTING_PANEL_SCHEMA.buttons.flat()
    : KEIHI_SETTING_PANEL_SCHEMA.buttons;

  return builder.addButtons(buttons).toJSON();
}

async function postKeihiSettingPanel(interaction) {
  const guild = interaction.guild;
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const keihiConfig = await repo.getGlobalConfig(guild.id);
  const payload = await buildKeihiSettingPanelPayload(guild, keihiConfig);

  const panelInfo = keihiConfig.configPanel || {};

  if (panelInfo.channelId && panelInfo.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(panelInfo.messageId);
        if (message) {
          await message.edit(payload);
          await interaction.editReply({ content: '✅ 経費設定パネルを更新しました。' });
          return;
        }
      }
    } catch (err) {
      logger.warn('[KeihiSetting] パネル更新失敗、再送します', err);
    }
  }

  const sent = await interaction.channel.send(payload);
  keihiConfig.configPanel = { channelId: sent.channelId, messageId: sent.id };
  await repo.save(guild.id, keihiConfig);

  await interaction.editReply({ content: '✅ 経費設定パネルを送信しました。' });
  return sent;
}

module.exports = {
  buildKeihiSettingPanelPayload,
  postKeihiSettingPanel,
};
