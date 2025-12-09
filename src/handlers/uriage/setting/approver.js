// src/handlers/uriage/setting/approver.js
// 売上の承認役職を選択・保存するハンドラ

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const {
  loadUriageConfig,
  saveUriageConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { refreshUriageSettingPanelMessage } = require('./panel');
const { IDS } = require('./ids');

/**
 * 「承認役職」ボタン押下時
 */
async function handleSetApproverButton(interaction) {
  const guildId = interaction.guild.id;

  // 店舗_役職_ロール.json から「役職候補」を取得
  let storeRoleConfig = null;
  try {
    storeRoleConfig = await loadStoreRoleConfig(guildId);
  } catch {
    storeRoleConfig = null;
  }

  const rawRoles =
    storeRoleConfig?.roles ??
    storeRoleConfig?.positions ??
    storeRoleConfig?.roleList ??
    [];

  /** @type {{ id: string, name: string }[]} */
  let positions = [];

  if (Array.isArray(rawRoles)) {
    positions = rawRoles.map((r, index) => {
      if (typeof r === 'string') {
        return { id: String(index), name: r };
      }
      const id = r.id ?? r.positionId ?? index;
      const name = r.name ?? r.label ?? `役職${id}`;
      return { id: String(id), name: String(name) };
    });
  } else if (rawRoles && typeof rawRoles === 'object') {
    positions = Object.entries(rawRoles).map(([id, info]) => {
      const name = info?.name ?? info?.label ?? `役職(${id})`;
      return { id: String(id), name: String(name) };
    });
  }

  if (!positions.length) {
    await interaction.reply({
      content: '店舗_役職_ロール.json に役職がありません。先に店舗役職を設定してください。',
      ephemeral: true,
    });
    return;
  }

  const uriageConfig = await loadUriageConfig(guildId);
  const current = uriageConfig.approverPositionIds || [];

  const select = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_APPROVER_ROLES)
    .setPlaceholder('承認役職を選択')
    .setMinValues(0)
    .setMaxValues(Math.min(25, positions.length))
    .addOptions(
      positions.map(p => ({
        label: p.name,
        value: p.id,
        default: current.includes(p.id),
      })),
    );

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: '承認役職を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 承認役職選択後
 */
async function handleApproverRolesSelect(interaction) {
  const guildId = interaction.guild.id;
  const selectedPositionIds = interaction.values || [];

  await interaction.deferUpdate();

  const [uriageConfig, storeRoleConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const positionRoles =
    storeRoleConfig?.positionRoles ||
    storeRoleConfig?.positionRoleMap ||
    {};

  // 選択された positionId から実ロールID配列を解決
  const approverRoleIds = [
    ...new Set(
      selectedPositionIds.flatMap(posId => positionRoles[posId] || []),
    ),
  ];

  // 保存
  uriageConfig.approverPositionIds = selectedPositionIds;
  uriageConfig.approverRoleIds = approverRoleIds;
  await saveUriageConfig(guildId, uriageConfig);

  await refreshUriageSettingPanelMessage(interaction.guild, uriageConfig);

  // ログ用に position 名を表示
  const rawRoles =
    storeRoleConfig?.roles ??
    storeRoleConfig?.positions ??
    storeRoleConfig?.roleList ??
    {};

  const positionNameMap = new Map();
  if (Array.isArray(rawRoles)) {
    rawRoles.forEach((r, index) => {
      const id = typeof r === 'string' ? String(index) : String(r.id ?? r.positionId ?? index);
      const name = typeof r === 'string' ? r : r.name ?? r.label ?? `役職${id}`;
      positionNameMap.set(id, name);
    });
  } else if (rawRoles && typeof rawRoles === 'object') {
    Object.entries(rawRoles).forEach(([id, info]) => {
      const name = info?.name ?? info?.label ?? `役職(${id})`;
      positionNameMap.set(String(id), name);
    });
  }

  const positionNames = selectedPositionIds.map(id => positionNameMap.get(id) || `役職(${id})`);
  const description =
    positionNames.length > 0
      ? `承認役職を以下に設定しました。\n- ${positionNames.join('\n- ')}`
      : '承認役職をリセットしました。';

  await sendSettingLog(interaction, {
    title: '売上 承認役職設定',
    description,
  }).catch(() => {});

  await interaction.editReply({
    content: '承認役職を更新しました。',
    components: [],
  });
}

module.exports = {
  handleSetApproverButton,
  handleApproverRolesSelect,
};
