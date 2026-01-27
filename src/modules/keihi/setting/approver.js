// src/handlers/keihi/setting/approver.js
// ----------------------------------------------------
// 経費「承認役職」設定
//   - 役職選択メニュー表示
//   - 選択された役職IDを keihi/config.json に保存
//   - 設定パネルの再描画 & 設定ログ出力
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const {
  refreshKeihiSettingPanelMessage,
} = require('./panel');
const { IDS } = require('./ids');

/**
 * 「承認役職」ボタン → 役職選択メニュー表示
 */
async function handleSetApproverButton(interaction) {
  // 先に ACK
  await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });

  const guildId = interaction.guild.id;
  const guild = interaction.guild;

  try {
    const keihiConfig = await loadKeihiConfig(guildId);
    const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    // 店舗_役職_ロール.json から「役職」のリストを取得
    // 形式: roles が配列 or オブジェクトでも動くようにする
    const rawRoles =
      storeRoleConfig?.roles ??
      storeRoleConfig?.positions ??
      [];

    /** @type {{ id: string, name: string }[]} */
    let positions = [];

    if (Array.isArray(rawRoles)) {
      // 配列: [{ id, name, ... }] or ['店長', '黒服', ...]
      positions = rawRoles.map((r, index) => {
        if (typeof r === 'string') {
          return { id: String(index), name: r };
        }
        const id = r.id ?? r.positionId ?? index;
        const name = r.name ?? r.label ?? `役職${id}`;
        return { id: String(id), name: String(name) };
      });
    } else if (rawRoles && typeof rawRoles === 'object') {
      // オブジェクト: { "manager": { name: "店長", ... }, ... }
      positions = Object.entries(rawRoles).map(([id, info]) => {
        const name =
          info?.name ??
          info?.label ??
          guild.roles.cache.get(info?.roleId || id)?.name ??
          `役職(${id})`;
        return { id: String(id), name: String(name) };
      });
    }

    if (!positions.length) {
      await interaction.editReply({
        content:
          '登録されている役職がありません。先に `/設定` コマンドで役職とロールの紐付けを行ってください。',
        components: [],
      });
      return;
    }

    // 現在設定されている「役職ID」を取得（positionベースのID）
    const currentApproverPositionIds = keihiConfig.approverPositionIds || [];

    const options = positions.map((p) => ({
      label: p.name,
      value: p.id,
      default: currentApproverPositionIds.includes(p.id), // ← ここでデフォルト選択
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId(IDS.SEL_APPROVER_ROLES)
      .setPlaceholder('経費の承認を行う役職を選択（複数可）')
      .setMinValues(0) // 0件選択でリセット可能にする
      .setMaxValues(options.length)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.editReply({
      content: '経費承認役職を選択してください。',
      components: [row],
    });
  } catch (err) {
    logger.error('[keihi/setting/approver] handleSetApproverButton エラー', err);
    await interaction.editReply({
      content: '設定データの取得に失敗しました。',
      components: [],
    }).catch(() => { });
  }
}

/**
 * 承認役職 RoleSelect → 保存
 */
async function handleApproverRolesSelect(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const selectedPositionIds = interaction.values; // '店長', '黒服' などのID

  // 長くかかる可能性があるので先に acknowledge
  await interaction.deferUpdate();

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId),
  ]);

  // positionId -> [roleId, ...] のマップを想定
  const positionRoles =
    storeRoleConfig?.positionRoles ||
    storeRoleConfig?.positionRoleMap ||
    {};

  // 選択された「役職ID」から、対応するDiscordの「ロールID」のリストを作成
  const approverRoleIds = [
    ...new Set(
      selectedPositionIds.flatMap((posId) => positionRoles[posId] || []),
    ),
  ];

  // 設定保存
  keihiConfig.approverPositionIds = selectedPositionIds; // 選択された「役職ID」
  keihiConfig.approverRoleIds = approverRoleIds; // 対応する「ロールID」
  keihiConfig.approvalRoles = approverRoleIds; // 互換性のため
  await saveKeihiConfig(guildId, keihiConfig);

  // 設定パネル更新
  await refreshKeihiSettingPanelMessage(guild, keihiConfig);

  // ログ用に、選択された役職IDから役職名を取得する
  const selectedPositionNames = selectedPositionIds.map((posId) => {
    const pos = (storeRoleConfig?.roles || storeRoleConfig?.positions || {})[posId];
    return pos?.name || pos?.label || `役職(${posId})`;
  });

  const description =
    selectedPositionNames.length > 0
      ? `承認役職を以下に設定しました。\n- ${selectedPositionNames.join('\n- ')}`
      : '承認役職をリセットしました。';

  await sendSettingLog(interaction, {
    title: '経費承認役職設定',
    description,
  });

  // セレクトメッセージを「完了メッセージ」に差し替え
  await interaction.editReply({
    content: '承認役職を設定しました。',
    components: [],
  });
}

module.exports = {
  handleSetApproverButton,
  handleApproverRolesSelect,
};
