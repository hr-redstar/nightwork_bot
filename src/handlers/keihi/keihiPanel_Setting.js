// src/handlers/keihi/keihiPanel_Setting.js
// ----------------------------------------------------
// 経費設定パネル（/設定経費 で使う）
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const logger = require('../../utils/logger');
const { getStoreList } = require('../../utils/config/configAccessor');
const {
  loadKeihiConfig,
  saveKeihiConfig,
  getKeihiPanelList,
} = require('../../utils/keihi/keihiConfigManager');
// 設定ログ用（パネル再配置などで使うなら）
const { sendSettingLog } = require('../config/configLogger');

module.exports = {
  /**
   * /設定経費 から呼び出し
   * 経費設定パネルを「チャンネルに送信 or 既存メッセージを更新」する
   * - パネルはエフェメラルではなく、通常メッセージとして残す
   * - 既存パネルがあればそのメッセージを編集
   */
  async postKeihiSettingPanel(interaction) { // 引数をinteractionに統一
    const guild = interaction.guild;
    const guildId = guild.id;
    const channel = interaction.channel;

    try {
      // ------------------------------
      // 設定とパネル一覧を取得
      // ------------------------------
      const stores = await getStoreList(guildId);
      const keihiConfig = await loadKeihiConfig(guildId);
      const panelMap = await getKeihiPanelList(guildId); // { storeName: channelId }

      // ------------------------------
      // 設定パネル用 Embed + Buttons を構築
      // ------------------------------
      const embed = buildKeihiSettingEmbed(guild, stores, keihiConfig, panelMap);
      const rows = buildKeihiSettingComponents();

      // ------------------------------
      // 既存パネルがあれば「更新」
      // keihiConfig.settingPanel = { channelId, messageId } を前提
      // ------------------------------
      let settingPanel = keihiConfig.settingPanel || null;
      let panelMessage = null;

      if (settingPanel?.channelId && settingPanel?.messageId) {
        try {
          const oldChannel = guild.channels.cache.get(settingPanel.channelId);
          if (oldChannel) {
            panelMessage = await oldChannel.messages.fetch(settingPanel.messageId);
          }
        } catch (e) {
          logger.warn('[keihiSettingPanel] 既存パネルの取得に失敗したため、新規作成します:', e.message);
          panelMessage = null;
        }
      }

      if (panelMessage) {
        // 既存パネルを編集
        await panelMessage.edit({
          embeds: [embed],
          components: rows,
        });
      } else {
        // 新規でこのチャンネルにパネルを送信
        const sent = await channel.send({
          embeds: [embed],
          components: rows,
        });

        // 次回更新用にメッセージIDを保存
        keihiConfig.settingPanel = {
          channelId: channel.id,
          messageId: sent.id,
        };
        await saveKeihiConfig(guildId, keihiConfig);

        // 設定ログに「設定パネル設置」として残しておいてもよい
        try {
          await sendSettingLog(guildId, {
            type: 'keihi_setting_panel',
            action: '経費設定パネル設置',
            channelId: channel.id,
            messageId: sent.id,
            userId: interaction.user.id,
          });
        } catch (e) {
          logger.warn('[keihiSettingPanel] 設定ログ送信に失敗:', e.message);
        }
      }

    } catch (err) {
      logger.error('[keihiSettingPanel] エラー:', err);
      // エラーを呼び出し元にスローして、コマンド側でエラー応答させる
      throw err;
    }
  },
};

/**
 * 経費設定パネル用の Embed を組み立て
 *
 * レイアウト仕様：
 * --------------------------------------
 * 経費設定パネル
 *
 * 経費パネル設置一覧
 * 店舗名：テキストチャンネルリンク
 *
 * 承認役職
 * 役職：メンションロール
 *
 * 経費csv出力
 * --------------------------------------
 */
function buildKeihiSettingEmbed(guild, stores, keihiConfig, panelMap) {
  const approvalRoles = keihiConfig.approvalRoles || [];
  const viewRoles = keihiConfig.viewRoles || [];
  const applyRoles = keihiConfig.applyRoles || [];

  // 経費パネル設置一覧
  const panelLines = Object.entries(panelMap || {})
    .map(([store, chId]) => {
      const ch = guild.channels.cache.get(chId);
      const link = ch ? `<#${ch.id}>` : '`削除済みチャンネル`';
      return `・**${store}**：${link}`;
    })
    .join('\n');

  // ロール表示用ヘルパー
  const formatRoles = (roleIds) => {
    if (!roleIds.length) return '未設定';
    return roleIds
      .map((id) => (guild.roles.cache.get(id) ? `<@&${id}>` : '`削除済みロール`'))
      .join('　');
  };

  const embed = new EmbedBuilder()
    .setTitle('📘 経費設定パネル')
    .setColor(0x3498db)
    .setDescription('経費パネル設置・承認/閲覧/申請役職・CSV出力の設定を行います。')
    .addFields(
      {
        name: '📋 経費パネル設置一覧',
        value: panelLines || 'まだ経費申請パネルが設置されていません。',
      },
      {
        name: '🛡️ 承認役職',
        value: `役職：${formatRoles(approvalRoles)}`,
      },
      {
        name: '📁 経費CSV出力',
        value: '「経費CSV発行」ボタンから、店舗・期間を選択してCSVを発行できます。',
      }
    );

  return embed;
}

/**
 * 経費設定パネル用のボタン行を作成
 *
 * ボタン：経費パネル設置　承認役職　閲覧役職　申請役職　
 * ボタン2列目：経費csv発行
 */
function buildKeihiSettingComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('keihi_panel_setup')
      .setLabel('📤 経費パネル設置')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('keihi_role_approval')
      .setLabel('🛡️ 承認役職')
      .setStyle(ButtonStyle.Success),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('keihi_csv_export')
      .setLabel('📁 経費CSV発行')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}
