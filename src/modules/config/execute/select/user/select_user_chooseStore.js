// src/handlers/config/components/select/user/select_user_chooseStore.js
// ----------------------------------------------------
// Step2：店舗選択
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

const nextStep = require('./select_user_choosePosition.js');
const {
  createRegistrationState,
  updateRegistrationState,
} = require('./registrationState.js');

module.exports = {
  customId: 'config_user_select_store',

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

    const stateId = createRegistrationState({ guildId, userId });

    // --- ユーザーの現在のロールを取得 ---
    const member = await guild.members.fetch(userId);
    const userRoleIds = [...member.roles.cache.keys()];

    // --- 自動推定 ---
    let defaultStore = null;
    // 1. 既存のユーザー情報から取得
    const userInfo = await readUserInfo(guildId, userId);
    if (userInfo && userInfo.store) {
      defaultStore = userInfo.store;
    } else {
      // 2. ロール情報から推定
      for (const storeName of stores) {
        const linkedRoles = config.storeRoles?.[storeName] || [];
        const hasMatch = linkedRoles.some((roleId) => userRoleIds.includes(roleId));

        if (hasMatch) {
          defaultStore = storeName;
          break;
        }
      }
    }

    // --- 店舗選択メニュー ---
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`config_user_select_store_${stateId}`)
      .setPlaceholder('所属する店舗を選択してください')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        stores.map((s) => ({
          label: s,
          value: s,
          default: s === defaultStore,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);
    const components = [row];

    // --- 自動推定が成功した場合、「次へ」ボタンを追加 ---
    if (defaultStore) {
      updateRegistrationState(stateId, { storeName: defaultStore });
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_position_${stateId}`) // GOTO
        .setLabel('この店舗で決定')
        .setStyle(ButtonStyle.Success);
      
      const row2 = new ActionRowBuilder().addComponents(nextButton);
      components.push(row2);
    }

    await interaction.update({
      content: 
        `🏪 ユーザー **<@${userId}>** の所属店舗を選択してください。\n` +
        (defaultStore 
          ? `（ロール情報から **${defaultStore}** が自動選択されています）` 
          : ''),
      components: components,
    });
  },

  /**
   * 店舗を選んだ後の処理（Step3へ）
   */
  async handle(interaction) {
    const customId = interaction.customId; 
    // → CONFIG_USER_SELECT_STORE_<stateId>

    const stateId = customId.replace('config_user_select_store_', '');
    const storeName = interaction.values[0];
    updateRegistrationState(stateId, { storeName });

    return nextStep.show(interaction, stateId, storeName);
  },
};
