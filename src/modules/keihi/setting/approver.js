const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
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
const logger = require('../../../utils/logger');

/**
 * 「承認役職」ボタン → 役職選択メニュー表示
 */
class SetApproverHandler extends BaseInteractionHandler {
  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const { guildId } = dto;

    try {
      const keihiConfig = await loadKeihiConfig(guildId);
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
          content: '登録されている役職がありません。先に `/設定` コマンドで役職とロールの紐付けを行ってください。',
          flags: MessageFlags.Ephemeral
        });
      }

      const currentApproverPositionIds = keihiConfig.approverPositionIds || [];
      const options = positions.map((p) => ({
        label: p.name,
        value: p.id,
        default: currentApproverPositionIds.includes(p.id),
      }));

      const select = new StringSelectMenuBuilder()
        .setCustomId(IDS.SEL_APPROVER_ROLES)
        .setPlaceholder('経費の承認を行う役職を選択（複数可）')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await this.safeReply(interaction, {
        content: '経費承認役職を選択してください。',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      logger.error('[keihi/setting/approver] SetApproverHandler エラー', err);
      await this.safeReply(interaction, { content: '設定データの取得に失敗しました。', flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * 承認役職 Select → 保存
 */
class ApproverRolesSubmitHandler extends BaseInteractionHandler {
  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const { guildId } = dto;
    const selectedPositionIds = interaction.values;

    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guildId),
      loadStoreRoleConfig(guildId),
    ]);

    const positionRoles = storeRoleConfig?.positionRoles ?? {};

    // 選択された「役職ID」から、対応するDiscordの「ロールID」リストを作成
    const approverRoleIds = [
      ...new Set(
        selectedPositionIds.flatMap((posId) => positionRoles[posId] || []),
      ),
    ];

    // 設定保存
    keihiConfig.approverPositionIds = selectedPositionIds;
    keihiConfig.approverRoleIds = approverRoleIds;
    keihiConfig.approvalRoles = approverRoleIds;
    await saveKeihiConfig(guildId, keihiConfig);

    // 設定パネル更新
    await refreshKeihiSettingPanelMessage(interaction.guild, keihiConfig);

    const selectedPositionNames = selectedPositionIds.map((posId) => {
      const roles = storeRoleConfig?.roles ?? [];
      const pos = roles.find(r => String(r.id) === String(posId));
      return pos?.name ?? `役職(${posId})`;
    });

    const description = selectedPositionNames.length > 0
      ? `承認役職を以下に設定しました。\n- ${selectedPositionNames.join('\n- ')}`
      : '承認役職をリセットしました。';

    await sendSettingLog(interaction, {
      title: '経費承認役職設定',
      description,
    });

    await interaction.update({
      content: '✅ 承認役職を設定しました。',
      components: [],
    });
  }
}

module.exports = {
  handleSetApproverButton: new SetApproverHandler(),
  handleApproverRolesSelect: new ApproverRolesSubmitHandler(),
};
