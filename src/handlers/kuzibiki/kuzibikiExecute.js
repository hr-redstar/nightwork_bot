// src/handlers/kuzibiki/kuzibikiExecute.js
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
} = require('discord.js');
const dayjs = require('dayjs');
const { readKujiConfig, saveKujiResult } = require('../../utils/kuzibiki/kuzibikiStorage');

/**
 * ランダム抽選（重複あり・with replacement）
 */
function drawWithReplacement(pool, count) {
  const res = [];
  if (!pool || pool.length === 0) return res;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    res.push(pool[idx]);
  }
  return res;
}

/**
 * 「くじ引き実行」ボタン → 回数選択 → 抽選 → スレッドへ出力
 */
async function handleKuzibikiExecute(interaction) {
  const guildId = interaction.guild.id;
  const config = readKujiConfig(guildId);
  const settings = config.settings || [];

  if (settings.length === 0) {
    await interaction.reply({ content: '⚠️ くじ引き設定が空です。先に「くじ引き設定」を登録してください。', ephemeral: true });
    return;
  }

  // 回数セレクト
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_kuzibiki_count')
    .setPlaceholder('くじ引き回数を選択（1～24）')
    .addOptions(
      Array.from({ length: 24 }, (_, i) => ({
        label: `${i + 1} 回`,
        value: String(i + 1),
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.reply({
    content: '🎰 くじ引き回数を選んでください。',
    components: [row],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
  });

  collector.on('collect', async (i) => {
    if (i.customId !== 'select_kuzibiki_count') return;
    const count = parseInt(i.values[0], 10);

    const results = drawWithReplacement(settings, count);

    // スレッド取得 or 作成（同名スレッドがあればそれに追記）
    const threadName = 'くじ引き-結果';
    let thread = interaction.channel.threads.cache.find(t => t.name === threadName && !t.archived);
    if (!thread) {
      thread = await interaction.channel.threads.create({
        name: threadName,
        reason: 'くじ引き結果ログ',
      });
    }

    const now = dayjs();
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('🎲 くじ引き結果')
      .addFields(
        { name: 'くじ引き設定', value: settings.join(', '), inline: false },
        { name: 'くじ引き回数', value: `${count} 回`, inline: true },
        {
          name: 'くじ引き結果',
          value: results.map((r, idx) => `${idx + 1}️⃣ ${r}`).join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `実行者：${i.user.username}｜実行時間：${now.format('YYYY/MM/DD HH:mm')}` });

    const msg = await thread.send({ embeds: [embed] });

    // 日別ログへ保存
    saveKujiResult(guildId, {
      timestamp: now.toISOString(),
      executedBy: { id: i.user.id, name: i.user.username },
      channelId: interaction.channel.id,
      threadId: thread.id,
      count,
      settings,
      results,
    });

    await i.update({ content: `✅ くじ引きを実行しました。結果はスレッドに出力しました。`, components: [] });
    // 実行者がすぐ飛べるようにフォローアップ
    await interaction.followUp({ content: `🧵 スレッドへ移動: ${msg.url}`, ephemeral: true });

    collector.stop();
  });
}

module.exports = { handleKuzibikiExecute };