// src/commands/設定店内状況_ひっかけ一覧.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定店内状況_ひっかけ一覧')
    .setDescription('店内状況_ひっかけ一覧設定パネルを設置します（管理者向け）'),

  async execute(interaction) {
    try {
      // 管理者チェック
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '⚠️ このコマンドは管理者のみ実行できます。', ephemeral: true });
      }

      // Embed作成
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🏠 店内状況_ひっかけ一覧設定パネル')
        .setDescription(
          '出退勤・接客ログ・店内状況_ひっかけ入力内容から自動的に『店内状況』『客数一覧』を作成します。\n\n' +
          '📍 **全店舗の店内状況一覧**\n' +
          '　➡️ 各店舗の状況をまとめた一覧を出力\n\n' +
          '🏬 **店舗ごとの店内状況・客数一覧**\n' +
          '　➡️ 個別の店舗情報を送信できます'
        )
        .setFooter({ text: `実行者：${interaction.user.tag}` })
        .setTimestamp();

      // ボタン定義
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('setup_hikkake_all')
          .setLabel('🧠 ひっかけ用店内状況設置')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('setup_hikkake_store')
          .setLabel('🧾 店舗ごとの店内状況・客数一覧設置')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [embed], components: [buttonRow] });

    } catch (error) {
      console.error('設定店内状況_ひっかけ一覧 エラー:', error);
      await interaction.reply({ content: '⚠️ パネル設置中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
    }
  },
};