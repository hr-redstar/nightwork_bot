// src/handlers/keihi/setting/panelImplementation.js
// ----------------------------------------------------
// 経費設定パネル送信/更新のロジック
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { KEIHI_SETTING_PANEL_SCHEMA } = require('./panelSchema');
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const logger = require('../../../utils/logger');
const { sendCommandLog } = require('../../../utils/config/configLogger');
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { IDS } = require('./ids');
const {
  handleExportCsvButton,
  handleCsvFlowInteraction,
} = require('./csv');
const {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
} = require('./panelLocation');
const {
  handleSetApproverButton,
  handleApproverRolesSelect,
} = require('./approver');
const { resolveStoreName } = require('./storeNameResolver');

// function buildSettingButtonsRow1() ... removed (replaced by Schema)
// function buildSettingButtonsRow2() ... removed (replaced by Schema)

function roleMentionFromIds(guild, ids = []) {
  const mentions = ids
    .map((id) => {
      const role = guild.roles.cache.get(id);
      return role ? `<@&${role.id}>` : null;
    })
    .filter(Boolean);
  return mentions.length ? mentions.join(' ') : null;
}

function describeApprovers(guild, storeRoleConfig, keihiConfig) {
  const positionRoles =
    storeRoleConfig?.positionRoles || storeRoleConfig?.positionRoleMap || {};

  const positionLookup = (positionId) => {
    const roles = storeRoleConfig?.roles || storeRoleConfig?.positions || [];
    const found = Array.isArray(roles)
      ? roles.find(
        (r) =>
          String(r.id ?? r.positionId ?? r.position) === String(positionId),
      )
      : null;
    if (found && found.name) return found.name;
    return typeof positionId === 'string' ? positionId : String(positionId);
  };

  const positionIds = keihiConfig.approverPositionIds || [];
  const fallbackRoleIds =
    keihiConfig.approverRoleIds?.length || keihiConfig.approvalRoles?.length
      ? keihiConfig.approverRoleIds.length
        ? keihiConfig.approverRoleIds
        : keihiConfig.approvalRoles
      : [];

  const lines = [];

  if (positionIds.length) {
    for (const posId of positionIds) {
      const mention = roleMentionFromIds(
        guild,
        Array.isArray(positionRoles[posId])
          ? positionRoles[posId]
          : positionRoles[posId]
            ? [positionRoles[posId]]
            : [],
      );
      const name = positionLookup(posId);
      lines.push(`${name}: ${mention || '未紐付ロール'}`);
    }
  } else if (fallbackRoleIds.length) {
    const mentions = roleMentionFromIds(guild, fallbackRoleIds);
    lines.push(mentions || '役職IDあり');
  }

  return lines.length ? lines.join('\n') : '未設定';
}

async function buildKeihiSettingPanelPayload(guild, keihiConfig) {
  const guildId = guild.id;
  let storeRoleConfig = null;
  try {
    storeRoleConfig = await loadStoreRoleConfig(guildId);
  } catch (err) {
    logger.warn('[keihi/setting/panel] storeRoleConfig 読み込み失敗', err);
  }

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

  const panelFieldValue =
    panelLines.length > 0
      ? panelLines.join('\n')
      : KEIHI_SETTING_PANEL_SCHEMA.fields.find(f => f.key === 'panels').fallback;

  const approverValue = describeApprovers(guild, storeRoleConfig, keihiConfig);

  // Schema Mapping
  const dataMap = {
    panels: panelFieldValue,
    approvers: approverValue || KEIHI_SETTING_PANEL_SCHEMA.fields.find(f => f.key === 'approvers').fallback,
  };

  const embedFields = KEIHI_SETTING_PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback
  }));

  const panel = buildPanel({
    title: KEIHI_SETTING_PANEL_SCHEMA.title,
    description: KEIHI_SETTING_PANEL_SCHEMA.description,
    color: KEIHI_SETTING_PANEL_SCHEMA.color,
    fields: embedFields,
    buttons: KEIHI_SETTING_PANEL_SCHEMA.buttons
  });

  // Note: buildPanel returns { embeds: [...], components: [...] } which works as payload.
  // Manually ensure timestamp is set if builder doesn't (Builder does setTimestamp())

  return panel;
}

async function postKeihiSettingPanel(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const keihiConfig = await loadKeihiConfig(guildId);
  const payload = await buildKeihiSettingPanelPayload(guild, keihiConfig);

  const panelInfo = keihiConfig.configPanel || {};

  if (panelInfo.channelId && panelInfo.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(panelInfo.messageId);
        if (message) {
          await message.edit(payload);
          await interaction.editReply({
            content: '経費設定パネルを更新しました。'
          });
          await sendCommandLog(interaction, {
            title: '経費設定パネル更新',
            description: '既存パネルを更新しました。',
          }).catch(() => { });
          return;
        }
      }
    } catch (err) {
      logger.warn(
        '[keihi/setting/panel] パネル更新失敗、再作成します',
        err,
      );
    }
  }

  const sent = await interaction.channel.send(payload);
  keihiConfig.configPanel = {
    channelId: sent.channelId,
    messageId: sent.id,
  };
  await saveKeihiConfig(guildId, keihiConfig);

  await interaction.editReply({
    content: '経費設定パネルを送信しました。',
  });
  await sendCommandLog(interaction, {
    title: '経費設定パネル作成',
    description: '新しく経費設定パネルを送信しました。',
  }).catch(() => { });

  return sent;
}

async function refreshKeihiSettingPanelMessage(guild, keihiConfig) {
  const panelInfo = keihiConfig.configPanel;
  if (!panelInfo?.channelId || !panelInfo?.messageId) return;

  const channel = await guild.channels.fetch(panelInfo.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const payload = await buildKeihiSettingPanelPayload(guild, keihiConfig);
  const message = await channel.messages.fetch(panelInfo.messageId).catch(() => null);
  if (message) {
    await message.edit(payload).catch(() => { });
  }
}

async function handleSettingInteraction(interaction) {
  const customId = interaction.customId || '';

  if (interaction.isButton()) {
    if (customId === IDS.BTN_SET_PANEL) {
      return handleSetPanelButton(interaction);
    }
    if (customId === IDS.BTN_SET_APPROVER) {
      return handleSetApproverButton(interaction);
    }
    if (customId === IDS.BTN_EXPORT_CSV || customId === IDS.BUTTON_EXPORT_CSV) {
      return handleExportCsvButton(interaction);
    }
    if (
      customId === IDS.BUTTON_CSV_RANGE_DAILY ||
      customId === IDS.BUTTON_CSV_RANGE_MONTHLY ||
      customId === IDS.BUTTON_CSV_RANGE_YEARLY ||
      customId === IDS.BUTTON_CSV_RANGE_QUARTER
    ) {
      return handleCsvFlowInteraction(interaction);
    }
    return;
  }

  if (interaction.isAnySelectMenu()) {
    if (customId === IDS.SEL_STORE_FOR_PANEL) {
      return handleStoreForPanelSelect(interaction);
    }
    if (customId.startsWith(IDS.PANEL_CHANNEL_PREFIX)) {
      return handlePanelChannelSelect(
        interaction,
        refreshKeihiSettingPanelMessage,
      );
    }
    if (customId === IDS.SEL_APPROVER_ROLES) {
      return handleApproverRolesSelect(interaction);
    }
    if (
      customId === IDS.SELECT_STORE_FOR_CSV ||
      customId === IDS.SELECT_CSV_TARGET
    ) {
      return handleCsvFlowInteraction(interaction);
    }
  }
}

async function sendKeihiPanel() {
  return null;
}

async function handleKeihiSettingInteraction(...args) {
  const interaction = args[0];
  return handleSettingInteraction(interaction);
}

module.exports = {
  resolveStoreName,
  buildKeihiSettingPanelPayload,
  postKeihiSettingPanel,
  refreshKeihiSettingPanelMessage,
  sendKeihiPanel,
  handleKeihiSettingInteraction,
  handleSettingInteraction,
};
