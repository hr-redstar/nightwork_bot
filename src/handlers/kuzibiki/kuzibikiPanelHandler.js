// src/handlers/kuzibiki/kuzibikiPanelHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const dayjs = require('dayjs');
const { readKujiConfig, saveKujiConfig } = require('../../utils/kuzibiki/kuzibikiStorage');
const { upsertKuzibikiPanel } = require('./kuzibikiPanel');
const { handleKuzibikiExecute } = require('./kuzibikiExecute');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');
const path = require('path');

/**
 * 設定ログスレッドを取得
 */
async function getSettingLogThread(interaction) {
  try {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    const settingThreadId = config?.settingLogThread;

    if (settingThreadId) {
      const thread = await interaction.guild.channels.fetch(settingThreadId).catch(() => null);
      return thread;
    }
  } catch (err) {
    console.warn('⚠️ [kuzibiki] 設定ログスレッド取得失敗', err);
  }
  return null;
}

/**
 * ログ出力
 */
async function logToSettingThread(interaction, before, after) {
  const thread = await getSettingLogThread(interaction);
  if (!thread) return;

  const now = dayjs().format('YYYY/MM/DD HH:mm');
  const embed = new EmbedBuilder()
    .setColor(0xffcc00)
    .setTitle('🪄 くじ引き設定が変更されました')
    .addFields(
      { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'チャンネル', value: `<#${interaction.channel.id}>`, inline: true },
      { name: '日時', value: now, inline: false },
      {
        name: '変更前',
        value: before.settings?.length ? before.settings.join('\n') : '(なし)',
        inline: false,
      },
      {
        name: '変更後',
        value: after.settings?.length ? after.settings.join('\n') : '(なし)',
        inline: false,
      }
    )
    .setFooter({ text: `${interaction.client.user.username} ｜ ${now}` });

  await thread.send({ embeds: [embed] });
}

/**
 * 「くじ引き設定」モーダルを開く
 */
async function openConfigModal(interaction) {
  const guildId = interaction.guild.id;
  const config = readKujiConfig(guildId);
  const initialText = (config.settings || []).join('\n');

  const modal = new ModalBuilder()
    .setCustomId('modal_kuzibiki_config')
    .setTitle('くじ引き設定（改行で複数）');

  const textarea = new TextInputBuilder()
    .setCustomId('kuzibiki_settings')
    .setLabel('くじ引き設定を1行ずつ入力')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setValue(initialText);

  modal.addComponents(new ActionRowBuilder().addComponents(textarea));
  await interaction.showModal(modal);
}

/**
 * モーダル送信処理
 */
async function submitConfigModal(interaction) {
  const guildId = interaction.guild.id;
  const before = readKujiConfig(guildId);

  const raw = interaction.fields.getTextInputValue('kuzibiki_settings') || '';
  const lines = raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const next = {
    settings: lines,
    updatedAt: new Date().toISOString(),
    panelMessageId: before.panelMessageId || null,
  };

  saveKujiConfig(guildId, next);

  // パネル更新（既存があれば上書き）
  await upsertKuzibikiPanel(interaction.channel);

  // ✅ 設定ログスレッド出力
  await logToSettingThread(interaction, before, next);

  const { MessageFlags } = require('discord.js');
  await interaction.reply({
    content: `✅ くじ引き設定を更新しました（${lines.length} 件）。`,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * エントリ：/設定くじ引き パネルのボタン・モーダル・セレクト処理
 */
async function handleKuzibikiInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === 'kuzibiki_config') {
      return openConfigModal(interaction);
    }
    if (interaction.customId === 'kuzibiki_execute') {
      return handleKuzibikiExecute(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_kuzibiki_config') {
      return submitConfigModal(interaction);
    }
  }
}

module.exports = { handleKuzibikiInteraction };