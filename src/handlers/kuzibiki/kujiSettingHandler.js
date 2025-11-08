const { saveKujiSettings, getKujiSettings } = require('./kujiStorage');
const { updatePanel } = require('./kuzibikiPanel');
const { logKujiChange } = require('./kujiLogger');

/**
 * くじ引き設定モーダルの送信を処理する
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleKujiSettingModal(interaction) {
  const guildId = interaction.guildId;
  const channel = interaction.channel;
  const input = interaction.fields.getTextInputValue('kuji_items_input');
  const oldKuji = await getKujiSettings(guildId);
  const newKuji = input.split('\n').map(s => s.trim()).filter(Boolean);

  // 保存
  await saveKujiSettings(guildId, newKuji);
  // ログ出力
  await logKujiChange(interaction, oldKuji, newKuji);

  // パネル自動更新
  await updatePanel(channel, guildId);

  // フィードバック
  await interaction.reply({ content: 'くじ引き設定を更新しました', ephemeral: true });
}

module.exports = { handleKujiSettingModal };