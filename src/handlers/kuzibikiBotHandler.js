// src/handlers/kuzibikiBotHandler.js

const { handleKujiSettingModal } = require('./kuzibiki/kujiSettingHandler');
const { createKujiSettingModal } = require('./kuzibiki/kujiSettingModal');
const { handleKujiRun } = require('./kuzibiki/kujiRunHandler');
const { getKujiSettings } = require('./kuzibiki/kujiStorage');
const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');

async function handleKuzibikiInteraction(interaction) {
  const { customId } = interaction;

  // ボタン押下処理
  if (interaction.isButton()) {
    if (customId === 'kuji_run') {
      const countOptions = Array.from({ length: 24 }, (_, i) => ({
        label: `${i + 1}回`,
        value: `${i + 1}`,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('kuji_run_count_select')
        .setPlaceholder('くじを引く回数を選択してください')
        .addOptions(countOptions);

      return await interaction.reply({
        content: '何回くじを引きますか？',
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (customId === 'kuji_setting') {
      const currentSettings = await getKujiSettings(interaction.guildId);
      const modal = createKujiSettingModal(currentSettings.join('\n'));
      return await interaction.showModal(modal);
    }
  }

  // セレクトメニュー選択処理
  if (interaction.isAnySelectMenu()) {
    if (customId === 'kuji_run_count_select') {
      return await handleKujiRun(interaction);
    }
  }

  // モーダル送信処理
  if (interaction.isModalSubmit()) {
    if (customId === 'kuji_setting_modal') {
      return await handleKujiSettingModal(interaction);
    }
  }
}

module.exports = async (interaction) => {
  // このハンドラーはくじ引き関連のインタラクションのみを処理
  if (interaction.customId && interaction.customId.startsWith('kuji_')) {
    await handleKuzibikiInteraction(interaction);
  }
};