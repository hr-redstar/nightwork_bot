// src/handlers/config/components/select/user/select_user_chooseStore.js
// ----------------------------------------------------
// Step2：店舗選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const {
  loadStoreRoleConfig,
} = require('../../../../utils/config/storeRoleConfigManager');

const nextStep = require('./select_user_choosePosition.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_STORE',

  /**
   * 店舗選択メニューを表示
   * @param {Interaction} interaction
   * @param {string} userId - Step1 で選んだユーザーID
   */
  async show(interaction, userId) {
    const guild = interaction.guild;
    const guildId = guild.id;

    const config = await loadStoreRoleConfig(guildId);

    const stores = config.stores || [];
    if (!stores.length) {
      return interaction.update({
        content: '⚠️ 店舗が登録されていません。',
        components: [],
      });
    }

    // --- ユーザーの現在のロールを取得 ---
    const member = await guild.members.fetch(userId);
    const userRoleIds = [...member.roles.cache.keys()];

    // --- 自動推定：ユーザーのロールIDと一致する店舗を探す ---
    let defaultStore = null;

    for (const storeName of stores) {
      const linkedRoles = config.storeRoles?.[storeName] || [];
      const hasMatch = linkedRoles.some((roleId) => userRoleIds.includes(roleId));

      if (hasMatch) {
        defaultStore = storeName;
        break;
      }
    }

    // --- 店舗選択メニュー ---
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`CONFIG_USER_SELECT_STORE_${userId}`)
      .setPlaceholder('所属する店舗を選択してください')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        stores.map((s) => ({
          label: s,
          value: s,
          default: s === defaultStore, // 自動推定
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      content: `🏪 ユーザー **<@${userId}>** の所属店舗を選択してください。`,
      components: [row],
    });
  },

  /**
   * 店舗を選んだ後の処理（Step3へ）
   */
  async handle(interaction) {
    const customId = interaction.customId; 
    // → CONFIG_USER_SELECT_STORE_<userId>

    const userId = customId.replace('CONFIG_USER_SELECT_STORE_', '');
    const storeName = interaction.values[0];

    return nextStep.show(interaction, userId, storeName);
  },
};
