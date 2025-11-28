// src/handlers/keihi/request/roleConfig.js
// ----------------------------------------------------
// 経費申請パネル側の「閲覧役職 / 申請役職」設定
//   - ボタン → 役職セレクト表示
//   - セレクト送信 → 設定保存 & 経費申請パネル再描画
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const {
  loadKeihiConfig,
  saveKeihiConfig,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { upsertStorePanelMessage } = require('./panel');
const { IDS: KEIHI_IDS } = require('./ids');

// ----------------------------------------------------
// 共通: 店舗_役職_ロール.json から「役職リスト」を options 化
// ----------------------------------------------------
function buildPositionOptions(storeRoleConfig) {
  const positions = storeRoleConfig?.roles || [];

  return positions.map((p, index) => {
    const id = String(p.id ?? p.positionId ?? index);
    const name =
      p.name ??
      p.label ??
      `役職${index + 1}`;

    return {
      label: String(name),
      value: id,
    };
  });
}

// ----------------------------------------------------
// 閲覧役職ボタン → セレクト表示
// ----------------------------------------------------
async function openViewRolesSelect(interaction, storeId) {
  const guildId = interaction.guild.id;

  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
  if (!storeRoleConfig) {
    await interaction.reply({
      content:
        '店舗_役職_ロールの設定が見つかりません。先に `/設定` で役職設定を行ってください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const optionsData = buildPositionOptions(storeRoleConfig);
  if (!optionsData.length) {
    await interaction.reply({
      content: '登録されている役職がありません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const keihiConfig = await loadKeihiConfig(guildId);
  const currentPositionIds =
    keihiConfig.panels?.[storeId]?.viewRolePositionIds || [];

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${KEIHI_IDS.PREFIX.VIEW_ROLE_SELECT}:${storeId}`)
    .setPlaceholder('スレッド閲覧が可能な役職を選択（複数可）')
    .setMinValues(0)
    .setMaxValues(optionsData.length);

  // options 追加 & デフォルト選択反映
  for (const opt of optionsData) {
    select.addOptions({
      label: opt.label,
      value: opt.value,
      default: currentPositionIds.includes(opt.value),
    });
  }

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: `店舗「${storeId}」のスレッド閲覧役職を選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ----------------------------------------------------
// 申請役職ボタン → セレクト表示
// ----------------------------------------------------
async function openRequestRolesSelect(interaction, storeId) {
  const guildId = interaction.guild.id;

  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
  if (!storeRoleConfig) {
    await interaction.reply({
      content:
        '店舗_役職_ロールの設定が見つかりません。先に `/設定` で役職設定を行ってください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const optionsData = buildPositionOptions(storeRoleConfig);
  if (!optionsData.length) {
    await interaction.reply({
      content: '登録されている役職がありません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const keihiConfig = await loadKeihiConfig(guildId);
  const currentPositionIds =
    keihiConfig.panels?.[storeId]?.requestRolePositionIds || [];

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${KEIHI_IDS.PREFIX.REQUEST_ROLE_SELECT}:${storeId}`)
    .setPlaceholder('経費申請が可能な役職を選択（複数可）')
    .setMinValues(0)
    .setMaxValues(optionsData.length);

  for (const opt of optionsData) {
    select.addOptions({
      label: opt.label,
      value: opt.value,
      default: currentPositionIds.includes(opt.value),
    });
  }

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: `店舗「${storeId}」の申請役職を選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ----------------------------------------------------
// 閲覧役職セレクト → 保存 & パネル再描画
// ----------------------------------------------------
async function handleViewRoleSelect(interaction) {
  const { customId, values, guild } = interaction;
  const guildId = guild.id;

  // customId: keihi_request_view_role_select:外部IT会社
  const storeId = customId.split(':').pop();
  
  // 3秒制限対策
  await interaction.deferUpdate();

  const selectedPositionIds = values; // ['店長', '黒服', ... の positionId 想定]

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  if (!keihiConfig.panels) keihiConfig.panels = {};
  if (!keihiConfig.panels[storeId]) {
    keihiConfig.panels[storeId] = {
      channelId: null,
      messageId: null,
      viewRoleIds: [],
      requestRoleIds: [],
      items: [],
    };
  }

  const positionRoles =
    storeRoleConfig?.positionRoles || storeRoleConfig?.positionRoleMap || {};

  const viewRoleIds = [
    ...new Set(
      selectedPositionIds.flatMap((posId) => positionRoles[posId] || []),
    ),
  ];

  // グローバル keihi/config.json に保存
  keihiConfig.panels[storeId].viewRolePositionIds = selectedPositionIds;
  keihiConfig.panels[storeId].viewRoleIds = viewRoleIds;
  await saveKeihiConfig(guildId, keihiConfig);

  // 店舗別 config (GCS/ギルドID/keihi/店舗名/config.json) にも保存
  const storeConfig = { storeId }; // 保存時にマージされるので storeId だけでOK
  storeConfig.viewRolePositionIds = selectedPositionIds;
  storeConfig.viewRoleIds = viewRoleIds;
  await saveKeihiStoreConfig(guildId, storeId, storeConfig);

  // 💸 経費申請パネルを再描画 (GCSから最新の設定を読み込んでから実行)
  const updatedKeihiConfig = await loadKeihiConfig(guildId);
  await upsertStorePanelMessage(guild, storeId, updatedKeihiConfig, storeRoleConfig);

  const roleMentions =
    viewRoleIds.length > 0
      ? viewRoleIds
          .map((rid) => {
            const role = guild.roles.cache.get(rid);
            return role ? `<@&${role.id}>` : `ロールID: ${rid}`;
          })
          .join('\n')
      : 'ロール未設定';

  await sendSettingLog(interaction, {
    title: '経費スレッド閲覧役職設定',
    description: `店舗「${storeId}」のスレッド閲覧役職を更新しました。\n${roleMentions}`,
  });

  await interaction.editReply({
    content: 'スレッド閲覧役職を設定しました。',
    components: [],
  });
}

// ----------------------------------------------------
// 申請役職セレクト → 保存 & パネル再描画
// ----------------------------------------------------
async function handleRequestRoleSelect(interaction) {
  const { customId, values, guild } = interaction;
  const guildId = guild.id;

  // customId: keihi_request_request_role_select:外部IT会社
  const storeId = customId.split(':').pop();
  
  await interaction.deferUpdate();

  const selectedPositionIds = values;

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  if (!keihiConfig.panels) keihiConfig.panels = {};
  if (!keihiConfig.panels[storeId]) {
    keihiConfig.panels[storeId] = {
      channelId: null,
      messageId: null,
      viewRoleIds: [],
      requestRoleIds: [],
      items: [],
    };
  }

  const positionRoles =
    storeRoleConfig?.positionRoles || storeRoleConfig?.positionRoleMap || {};

  const requestRoleIds = [
    ...new Set(
      selectedPositionIds.flatMap((posId) => positionRoles[posId] || []),
    ),
  ];

  keihiConfig.panels[storeId].requestRolePositionIds = selectedPositionIds;
  keihiConfig.panels[storeId].requestRoleIds = requestRoleIds;
  await saveKeihiConfig(guildId, keihiConfig);

  const storeConfig = { storeId }; // 保存時にマージされるので storeId だけでOK
  storeConfig.requestRolePositionIds = selectedPositionIds;
  storeConfig.requestRoleIds = requestRoleIds;
  await saveKeihiStoreConfig(guildId, storeId, storeConfig);

  // 💸 経費申請パネルを再描画 (GCSから最新の設定を読み込んでから実行)
  const updatedKeihiConfig = await loadKeihiConfig(guildId);
  await upsertStorePanelMessage(guild, storeId, updatedKeihiConfig, storeRoleConfig);

  const roleMentions =
    requestRoleIds.length > 0
      ? requestRoleIds
          .map((rid) => {
            const role = guild.roles.cache.get(rid);
            return role ? `<@&${role.id}>` : `ロールID: ${rid}`;
          })
          .join('\n')
      : 'ロール未設定';

  await sendSettingLog(interaction, {
    title: '経費申請役職設定',
    description: `店舗「${storeId}」の経費申請役職を更新しました。\n${roleMentions}`,
  });

  await interaction.editReply({
    content: '申請役職を設定しました。',
    components: [],
  });
}

module.exports = {
  openViewRolesSelect,
  openRequestRolesSelect,
  handleViewRoleSelect,
  handleRequestRoleSelect,
};