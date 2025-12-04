// src/handlers/config/commandRoleHandler.js
const {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const { updateGuildConfig } = require('../../utils/config/gcsConfigManager');
const { sendConfigPanel } = require('./configPanel');
const { sendSettingLog } = require('./configLogger');
const logger = require('../../utils/logger');

/**
 * 「コマンド実行役職」ボタンのインタラクションを処理
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleCommandRole(interaction) {
  try {
    // 役職選択メニューを作成
    const selectMenu = new RoleSelectMenuBuilder()
      .setCustomId('config_command_role_select')
      .setPlaceholder('コマンドを実行できる役職を選択してください');

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // 役職選択メニューを返信
    await interaction.reply({
      content: '一般コマンドの実行を許可する役職を選択してください。\n（管理者権限を持つユーザーは、この設定に関わらず常時実行できます）',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    const message = await interaction.fetchReply();

    // 選択を待機
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.RoleSelect,
      time: 60000, // 60秒
    });

    collector.on('collect', async (selectInteraction) => {
      const roleId = selectInteraction.values[0];
      const role = await selectInteraction.guild.roles.fetch(roleId);

      // 設定を保存（差分マージ）
      await updateGuildConfig(interaction.guild.id, { commandExecutorRoleId: roleId });

      // 完了メッセージを送信
      await selectInteraction.update({
        content: `✅ コマンド実行役職を **${role.name}** に設定しました。`,
        components: [],
      });

      // 設定パネルを更新
      await sendConfigPanel(interaction.channel);

      // ログ出力
      await sendSettingLog(interaction.guild, { user: interaction.user, message: `コマンド実行役職を <@&${roleId}> に設定` });
    });

  } catch (error) {
    logger.error('[handleCommandRole] コマンド実行役職の設定中にエラー:', error);
  }
}

module.exports = { handleCommandRole };