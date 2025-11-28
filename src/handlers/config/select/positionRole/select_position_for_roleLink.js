// 役職とロール紐づけ - Step1 役職選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');

const nextStep = require('./select_roles_for_position.js');

module.exports = {
  customId: 'CONFIG_SELECT_POSITION_FOR_ROLE_LINK',

  /**
   * 役職選択メニューを表示
   */
  async show(interaction) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    // 先に有効な選択肢を生成する
    const options = (config.roles || [])
      .filter((role) => role && role.id && role.name) // 無効なデータをフィルタリング
      .map((role) => ({
        label: String(role.name).slice(0, 100), // labelは100文字まで
        value: String(role.id), // valueは100文字まで
      }))
      .slice(0, 25); // 選択肢は25個まで

    if (!options.length) {
      return interaction.reply({
        content: '⚠️ 紐付け可能な役職が登録されていません。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('CONFIG_SELECT_POSITION_FOR_ROLE_LINK_VALUE')
      .setPlaceholder('ロールを紐づける役職を選択')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '👔 ロールを紐づける **役職** を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * 選択後 → Step2 へ
   */
  async handle(interaction) {
    const positionId = interaction.values[0];
    return nextStep.show(interaction, positionId);
  },
};
