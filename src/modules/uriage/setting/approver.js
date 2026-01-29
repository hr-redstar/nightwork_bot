const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const {
  loadUriageConfig,
  saveUriageConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { refreshUriageSettingPanelMessage } = require('./panel');
const { IDS } = require('./ids');
const logger = require('../../../utils/logger');

/**
 * 「承認役職」ボタン押下時
 */
class SetApproverHandler extends BaseInteractionHandler {
  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const { guildId } = dto;

    try {
      const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
      const rawRoles = storeRoleConfig?.roles ?? storeRoleConfig?.positions ?? [];
      let positions = [];

      if (Array.isArray(rawRoles)) {
        positions = rawRoles.map((r, index) => {
          const id = r.id ?? r.positionId ?? index;
          const name = r.name ?? r.label ?? `役職${id}`;
          return { id: String(id), name: String(name) };
        });
      }

      if (!positions.length) {
        return await this.safeReply(interaction, {
          content: '店舗_役職_ロール.json に役職がありません。先に店舗役職を設定してください。',
          flags: MessageFlags.Ephemeral
        });
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

      await this.safeReply(interaction, {
        content: '承認役職を選択してください。',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      logger.error('[uriage/setting/approver] SetApproverHandler エラー', err);
      await this.safeReply(interaction, { content: '設定データの取得に失敗しました。', flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * 承認役職選択後
 */
class ApproverRolesSubmitHandler extends BaseInteractionHandler {
  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const { guildId } = dto;
    const selectedPositionIds = interaction.values || [];

    const [uriageConfig, storeRoleConfig] = await Promise.all([
      loadUriageConfig(guildId),
      loadStoreRoleConfig(guildId).catch(() => null),
    ]);

    const positionRoles = storeRoleConfig?.positionRoles ?? {};

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
    const rawRoles = storeRoleConfig?.roles ?? [];
    const positionNameMap = new Map();
    if (Array.isArray(rawRoles)) {
      rawRoles.forEach((r, index) => {
        const id = String(r.id ?? r.positionId ?? index);
        const name = r.name ?? r.label ?? `役職${id}`;
        positionNameMap.set(id, name);
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
    }).catch(() => { });

    await interaction.update({
      content: '✅ 承認役職を更新しました。',
      components: [],
    });
  }
}

module.exports = {
  handleSetApproverButton: new SetApproverHandler(),
  handleApproverRolesSelect: new ApproverRolesSubmitHandler(),
};
