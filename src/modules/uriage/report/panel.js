// src/handlers/uriage/report/panel.js
// 売上報告パネル送信（経費申請パネルの売上版）

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const logger = require('../../../utils/logger');
const { IDS } = require('./ids');

/**
 * 指定のテキストチャンネルに「売上報告パネル」を送信する
 * @param {import('discord.js').Interaction} interaction 元のインタラクション（ログ用）
 * @param {{ storeName: string, channel: import('discord.js').TextChannel }} options
 */
async function sendUriageReportPanel(interaction, { storeName, channel }) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(`売上報告パネル - ${storeName}`)
      .setDescription(
        [
          'このチャンネルは、店舗ごとの **売上報告** 用パネルです。',
          '',
          '▼ 使用方法',
          '1. 下の「売上報告」ボタンを押す',
          '2. モーダルに **日付 / 総売り / 現金 / 掛け金 / 諸経費** を入力',
          '3. 送信すると、専用スレッドに詳細が記録されます',
          '',
          '※ 残金は `総売り - (掛け金 + 諸経費)` で自動計算されます。',
        ].join('\n'),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${IDS.BUTTON.REPORT_OPEN}:${storeName}`) // ハンドラ側で storeName を取得
        .setLabel('売上報告')
        .setStyle(ButtonStyle.Primary),
    );

    const message = await channel.send({
      embeds: [embed],
      components: [row],
    });

    logger.info(
      `[uriage][sendUriageReportPanel] 売上報告パネルを送信しました: guild=${interaction.guildId}, channel=${channel.id}, store=${storeName}, message=${message.id}`,
    );
    return message;
  } catch (err) {
    logger.error('[uriage][sendUriageReportPanel] エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '売上報告パネルの設置中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
    throw err;
  }
}

module.exports = {
  sendUriageReportPanel,
};
