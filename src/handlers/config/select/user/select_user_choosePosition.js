// src/handlers/config/components/select/user/select_user_choosePosition.js
// ----------------------------------------------------
// Step3：役職選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const {
  loadStoreRoleConfig,
} = require('../../../../utils/config/storeRoleConfigManager');
const { readUserInfo } = require('../../../../utils/config/gcsUserInfo');

const nextStep = require('./select_user_birth_year.js');

module.exports = {
  customId: 'config_user_select_position',

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

    // --- 自動推定 ---
    let defaultPositionId = null;
    // 1. 既存のユーザー情報から取得
    const userInfo = await readUserInfo(guildId, userId);
    if (userInfo && userInfo.position) {
      defaultPositionId = userInfo.position;
    } else {
      // 2. ロール情報から推定
      if (config.positionRoles) {
        for (const [positionId, linkedRoleIds] of Object.entries(config.positionRoles)) {
          const match = linkedRoleIds.some((rid) => userRoleIds.includes(rid));
          if (match) {
            defaultPositionId = positionId;
            break;
          }
        }
      }
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`config_user_select_position_${userId}_${storeName}`)
      .setPlaceholder('役職を選択してください（1つだけ）')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        positions.map((pos) => ({
          label: pos.name,
          value: pos.id,
          default: pos.id === defaultPositionId,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const components = [row];

    // --- 自動推定が成功した場合、「次へ」ボタンを追加 ---
    if (defaultPositionId) {
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_birth_year_${userId}_${storeName}_${defaultPositionId}`) // GOTO
        .setLabel('この役職で決定')
        .setStyle(ButtonStyle.Success);
      
      const row2 = new ActionRowBuilder().addComponents(nextButton);
      components.push(row2);
    }

    return interaction.update({
      content: 
        `👔 ユーザー **<@${userId}>** の役職を選択してください。\n店舗：**${storeName}**\n` +
        (defaultPositionId
          ? `（ロール情報から **${positions.find(p => p.id === defaultPositionId)?.name || ''}** が自動選択されています）`
          : ''),
      components: components,
    });
  },

  /**
   * 役職選択後 → Step4（誕生日：年）
   */
  async handle(interaction) {
    const customId = interaction.customId;
    // CONFIG_USER_SELECT_POSITION_<userId>_<storeName>

    const parts = customId.replace('config_user_select_position_', '').split('_');
    const userId = parts[0];
    const storeName = parts.slice(1).join('_'); // storeName は _ を含む可能性があるため

    const positionId = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId);
  },
};
