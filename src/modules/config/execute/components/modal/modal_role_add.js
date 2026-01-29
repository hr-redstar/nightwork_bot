// src/handlers/config/components/modal/modal_role_add.js
// ----------------------------------------------------
// 🎭 役職追加モーダル
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

const { addRole } = require('../../../../../utils/config/storeRoleConfigManager');
const showModalSafe = require('../../../../../utils/showModalSafe');

module.exports = {
  customId: 'CONFIG_ROLE_ADD_MODAL',

  show(interaction) {
    // 💡 Platinum Rule: showModal は即座に呼ぶ（3秒ルール厳守）
    const modal = new ModalBuilder()
      .setCustomId('CONFIG_ROLE_ADD_MODAL')
      .setTitle('🎭 役職を追加');

    const input = new TextInputBuilder()
      .setCustomId('role_name')
      .setLabel('追加する役職名（文字列）')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例：黒服 / キャスト / 店長 など')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return showModalSafe(interaction, modal);
  },

  async handle(interaction) {
    const roleName = interaction.fields.getTextInputValue('role_name');

    // Discordロールとして作る？
    // → 今は「名前管理だけ」の仕様なので IDは name と同一で仮生成
    const fakeRoleObj = {
      id: roleName,
      name: roleName,
    };

    await addRole(interaction.guild.id, fakeRoleObj);

    const { MessageFlags } = require('discord.js');

    await interaction.reply({
      content: `🎭 役職 **${roleName}** を追加しました！`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
