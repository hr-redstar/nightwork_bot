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
} = require('../../../../../utils/config/storeRoleConfigManager');
const { readUserInfo } = require('../../../../../utils/config/gcsUserInfo');

const nextStep = require('./select_user_birth_year.js');
const {
  getRegistrationState,
  updateRegistrationState,
} = require('./registrationState.js');

module.exports = {
  customId: 'config_user_select_position',

  /**
   * 役職選択メニューを表示
   * @param {Interaction} interaction
   * @param {string} stateId
   * @param {string} storeNameOverride
   */
  async show(interaction, stateId, storeNameOverride) {
    const state = getRegistrationState(stateId);
    if (!state) {
      return interaction.update({
        content: '⏳ セッションが期限切れです。再度最初から登録をやり直してください。',
        components: [],
      });
    }

    const guild = interaction.guild;
    const guildId = guild.id;
    const userId = state.userId;
    const storeName = storeNameOverride || state.storeName;

    if (!userId || !storeName) {
      return interaction.update({
        content: '⚠️ 店舗情報が不足しています。設定パネルから再度操作してください。',
        components: [],
      });
    }

    updateRegistrationState(stateId, { storeName });

    const config = await loadStoreRoleConfig(guildId);
    const positions = config.roles || [];
    if (!positions.length) {
      return interaction.update({
        content: '⚠️ 役職が登録されていません、ご確認ください。',
        components: [],
      });
    }

    const member = await guild.members.fetch(userId);
    const userRoleIds = [...member.roles.cache.keys()];

    let defaultPositionId = null;
    const userInfo = await readUserInfo(guildId, userId);
    if (userInfo && userInfo.position) {
      defaultPositionId = userInfo.position;
    } else if (config.positionRoles) {
      for (const [positionId, linkedRoleIds] of Object.entries(config.positionRoles)) {
        const match = linkedRoleIds.some((rid) => userRoleIds.includes(rid));
        if (match) {
          defaultPositionId = positionId;
          break;
        }
      }
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`config_user_select_position_${stateId}`)
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

    if (defaultPositionId) {
      updateRegistrationState(stateId, { positionId: defaultPositionId });
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_birth_year_${stateId}`)
        .setLabel('この役職で決定')
        .setStyle(ButtonStyle.Success);

      const row2 = new ActionRowBuilder().addComponents(nextButton);
      components.push(row2);
    }

    return interaction.update({
      content:
        `👔 ユーザー **<@${userId}>** の役職を選択してください。\n店舗：**${storeName}**\n` +
        (defaultPositionId
          ? `（ロール情報から **${positions.find(
            (p) => p.id === defaultPositionId
          )?.name || ''}** が自動選択されています）`
          : ''),
      components,
    });
  },

  /**
   * 役職選択後 → Step4（誕生日：年）
   */
  async handle(interaction) {
    const customId = interaction.customId;
    const stateId = customId.replace('config_user_select_position_', '');
    const positionId = interaction.values[0];
    updateRegistrationState(stateId, { positionId });

    return nextStep.show(interaction, stateId);
  },
};
