// src/handlers/config/components/select/user/select_user_choosePosition.js
// ----------------------------------------------------
// Step3：役職選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const {
  loadStoreRoleConfig,
} = require('../../../../utils/config/storeRoleConfigManager');

const nextStep = require('./select_user_birth_year.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_POSITION',

  /**
   * 役職選択メニュー表示
   * @param {Interaction} interaction
   * @param {string} userId
   * @param {string} storeName
   */
  async show(interaction, userId, storeName) {
    const guild = interaction.guild;
    const guildId = guild.id;

    const config = await loadStoreRoleConfig(guildId);

    const positions = config.roles || [];
    if (!positions.length) {
      return interaction.update({
        content: '⚠️ 役職が登録されていません。',
        components: [],
      });
    }

    // --- ユーザー自身のロールID ---
    const member = await guild.members.fetch(userId);
    const userRoleIds = [...member.roles.cache.keys()];

    // --- 自動推定：positionRoles とユーザーロールの一致判定 ---
    let defaultPositionId = null;

    if (config.positionRoles) {
      for (const [positionId, linkedRoleIds] of Object.entries(config.positionRoles)) {
        const match = linkedRoleIds.some((rid) => userRoleIds.includes(rid));
        if (match) {
          defaultPositionId = positionId;
          break;
        }
      }
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`CONFIG_USER_SELECT_POSITION_${userId}_${storeName}`)
      .setPlaceholder('役職を選択してください（1つだけ）')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        positions.map((pos) => ({
          label: pos.name,
          value: pos.id,
          default: pos.id === defaultPositionId, // 自動判定
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      content: `👔 ユーザー **<@${userId}>** の役職を選択してください。\n店舗：**${storeName}**`,
      components: [row],
    });
  },

  /**
   * 役職選択後 → Step4（誕生日：年）
   */
  async handle(interaction) {
    const customId = interaction.customId;
    // CONFIG_USER_SELECT_POSITION_<userId>_<storeName>

    const parts = customId.replace('CONFIG_USER_SELECT_POSITION_', '').split('_');
    const userId = parts[0];
    const storeName = parts.slice(1).join('_'); // storeName は _ を含む可能性があるため

    const positionId = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId);
  },
};
