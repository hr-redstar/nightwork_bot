const { getKujiSettings } = require('./kujiStorage');
const { EmbedBuilder } = require('discord.js');
const { runKuji } = require('./kujiRunner');
const { logKujiResult } = require('./kujiLogger');

/**
 * くじ引きを実行し、結果を送信する
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleKujiRun(interaction) {
  try {
    const kujiList = await getKujiSettings(interaction.guildId);
    const count = parseInt(interaction.values[0], 10);

    if (kujiList.length === 0) {
      return interaction.reply({ content: '⚠️ くじ引きの項目が設定されていません。', ephemeral: true });
    }

    const results = runKuji(kujiList, count);
    const winner = results[0]; // For the main embed

    const logContent = await logKujiResult(interaction, kujiList, count, results);

    const thread = await interaction.channel.threads.create({
      name: `くじ引き結果-${new Date().toISOString()}`,
      autoArchiveDuration: 60,
      reason: 'くじ引き実行ログ'
    });
    await thread.send(logContent);

    const embed = new EmbedBuilder()
      .setTitle('🎉 くじ引き結果 🎉')
      .setDescription(`**${winner}** が当たりました！\n\n全結果は <#${thread.id}> を確認してください。`)
      .setColor(0xFFD700) // Gold
      .setTimestamp();

    // The original interaction was ephemeral, so we can't `update`.
    // We must send a new, non-ephemeral message to the channel with the result.
    await interaction.channel.send({ embeds: [embed] });

    // And then acknowledge the ephemeral interaction.
    await interaction.reply({ content: `結果をスレッド <#${thread.id}> に出力しました。`, ephemeral: true });

  } catch (error) {
    console.error('❌ kujiRunHandler error:', error);
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'くじ引きの実行中にエラーが発生しました。', ephemeral: true });
      } else {
        await interaction.reply({ content: 'くじ引きの実行中にエラーが発生しました。', ephemeral: true });
      }
    }
  }
}

module.exports = { handleKujiRun };