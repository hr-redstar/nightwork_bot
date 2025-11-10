// src/handlers/kuzibiki/kuzibikiPanelHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const { readKujiConfig, saveKujiConfig } = require('../../utils/kuzibiki/kuzibikiStorage');
const { upsertKuzibikiPanel } = require('./kuzibikiPanel');
const { handleKuzibikiExecute } = require('./kuzibikiExecute');

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

  await interaction.reply({
    content: `✅ くじ引き設定を更新しました（${lines.length} 件）。`,
    ephemeral: true,
  });
}

/**
 * エントリ：/設定くじ引き パネルのボタン・モーダル・セレクト処理
 */
async function handleKuzibikiInteraction(interaction) {
  // すべてのくじ引き操作で管理者権限をチェック
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '⚠️ この操作は管理者のみが実行できます。', ephemeral: true });
  }

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